package redis

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"interviewlab-backend/internal/config"
	"interviewlab-backend/internal/postgres"
	"interviewlab-backend/internal/types"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

var ErrRoomNotFound = errors.New("room not found in redis")

type RedisClient struct {
	client       *redis.Client
	connectionID string
}

func NewClient() *RedisClient {
	opt, _ := redis.ParseURL(os.Getenv("REDIS_URL"))
	return &RedisClient{client: redis.NewClient(opt)}
}

func (r *RedisClient) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

// Hash is unnecessary but leave as a hash in case more fields get added
func (r *RedisClient) SaveRoomToRedis(parentCtx context.Context, roomID string, contentString string) error {
	ctx, cancel := context.WithTimeout(parentCtx, 1*time.Second)
	defer cancel()
	if err := r.client.HSet(ctx, roomID, map[string]interface{}{"content": contentString}).Err(); err != nil {
		return fmt.Errorf("error saving room %s to redis: %w", roomID, err)
	}
	if ok, err := r.client.Expire(ctx, roomID, 5*time.Minute).Result(); err != nil {
		return fmt.Errorf("failed to set TTL for room %s: %w", roomID, err)
	} else if !ok {
		log.Println("TTL not set, key might not exist: ", roomID)
	}
	return nil
}

func (r *RedisClient) SyncContentFromRedis(parentCtx context.Context, roomID string) (string, error) {
	ctx, cancel := context.WithTimeout(parentCtx, 1*time.Second)
	defer cancel()
	content, err := r.client.HGet(ctx, roomID, "content").Result()
	if err == nil {
		if ttlResetErr := r.client.Expire(ctx, roomID, 5*time.Minute).Err(); ttlResetErr != nil {
			log.Println("Failed to reset TTL for room:", roomID, ttlResetErr)
		}
		return content, nil
	}
	if err == redis.Nil {
		log.Println("Room doesn't exist in redis: ", roomID)
		content, dbErr := postgres.RetrieveContent(ctx, roomID)
		if dbErr == nil {
			log.Println("Room retrieved from Postgres: ", roomID)
			return content, nil
		}
		log.Println("Content not found in postgres")
	}
	return "", ErrRoomNotFound
}

func (r *RedisClient) SyncContentToRedis(parentCtx context.Context, roomID string, contentString string) error {
	ctx, cancel := context.WithTimeout(parentCtx, 1*time.Second)
	defer cancel()
	if err := r.client.HSet(ctx, roomID, "content", contentString).Err(); err != nil {
		return fmt.Errorf("error syncing content to redis for room %s: %w", roomID, err)
	}
	if err := r.client.Expire(ctx, roomID, 5*time.Minute).Err(); err != nil {
		return fmt.Errorf("failed to reset TTL for room %s: %w", roomID, err)
	}
	return nil
}

func (r *RedisClient) SubscribeDiffs(ctx context.Context, roomID string, handleIncomingDiff func([]types.Edit)) {
	pubsub := r.client.Subscribe(ctx, "room:"+roomID+":diffs")
	channel := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-channel:
			var rEdits types.RedisEnvelope
			if err := json.Unmarshal([]byte(msg.Payload), &rEdits); err != nil {
				log.Println("redis: invalid diff payload", err)
				continue
			}
			// Ignore edits from the same server — already broadcasted locally
			if rEdits.Origin != config.ServerID {
				handleIncomingDiff(rEdits.Edits)
			}
		}
	}
}

func (r *RedisClient) PublishDiffs(ctx context.Context, roomID string, editPayload types.RedisEnvelope) error {
	editJSON, err := json.Marshal(editPayload)
	if err != nil {
		return fmt.Errorf("error marshalling diffs for room %s: %w", roomID, err)
	}
	if err := r.client.Publish(ctx, "room:"+roomID+":diffs", editJSON).Err(); err != nil {
		return fmt.Errorf("error publishing diffs for room %s: %w", roomID, err)
	}
	return nil
}

func (r *RedisClient) ClientExists(ctx context.Context, roomID string) (bool, error) {
	exists, err := r.client.Exists(ctx, roomID).Result()
	if err != nil {
		return false, fmt.Errorf("Redis EXISTS failed for %s, %w", roomID, err)
	}
	if exists > 0 {
		return true, nil
	}
	_, dbErr := postgres.RetrieveContent(ctx, roomID)
	if dbErr == nil {
		return true, nil
	}
	if dbErr == postgres.ErrRoomNotFound {
		return false, postgres.ErrRoomNotFound
	}
	return false, fmt.Errorf("Postgres lookup failed for %s, %w", roomID, dbErr)
}

func (r *RedisClient) UpdateRoomsCreated(ctx context.Context) {
	if _, err := r.client.Incr(ctx, "rooms_created").Result(); err != nil {
		log.Println("Failed to increment room counter")
	}
}

func (r *RedisClient) GetRoomsCreated(ctx context.Context) int {
	count, err := r.client.Get(ctx, "rooms_created").Int()
	if err != nil {
		log.Println("Failed to retrieve all time rooms created")
	}
	return count
}

func (r *RedisClient) AddClientToRedis(ctx context.Context, roomID string, clientID string) error {
	redisCtx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	key := fmt.Sprintf("room:%s:clients", roomID)
	if err := r.client.SAdd(redisCtx, key, clientID).Err(); err != nil {
		return fmt.Errorf("error adding client %s to Redis for room %s: %w", clientID, roomID, err)
	}
	return nil
}

func (r *RedisClient) RemoveClientFromRedis(ctx context.Context, roomID string, clientID string) error {
	redisCtx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	key := fmt.Sprintf("room:%s:clients", roomID)
	if err := r.client.SRem(redisCtx, key, clientID).Err(); err != nil {
		return fmt.Errorf("error removing client %s from Redis for room %s: %w", clientID, roomID, err)
	}
	count, err := r.client.SCard(redisCtx, key).Result()
	if err != nil {
		return fmt.Errorf("error getting client count for room %s: %w", roomID, err)
	}
	if count == 0 {
		if err := r.client.Del(redisCtx, key).Err(); err != nil {
			return fmt.Errorf("error deleting empty room key: %w", err)
		}
	}
	return nil
}

func (r *RedisClient) GetClientCount(ctx context.Context, roomID string) (int64, error) {
	redisCtx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	key := fmt.Sprintf("room:%s:clients", roomID)
	count, err := r.client.SCard(redisCtx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("error getting user count for room %s: %w", roomID, err)
	}
	return count, nil
}

func stopwatchKey(roomID string) string {
	return fmt.Sprintf("%s:stopwatch", roomID)
}

// stopwatchTTL matches the room content TTL so the stopwatch outlives the room
// only as long as the room itself does.
const stopwatchTTL = 5 * time.Minute

// RefreshStopwatchTTL keeps the stopwatch key alive while the room is active.
// Called on the same cadence as the content hash-write so the key never expires
// out from under a running stopwatch. No-op if the key doesn't exist.
func (r *RedisClient) RefreshStopwatchTTL(ctx context.Context, roomID string) error {
	ctx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	if err := r.client.Expire(ctx, stopwatchKey(roomID), stopwatchTTL).Err(); err != nil {
		return fmt.Errorf("failed to refresh stopwatch TTL for room %s: %w", roomID, err)
	}
	return nil
}

func (r *RedisClient) PublishStopwatchEvent(ctx context.Context, roomID string, eventType string, eventTime int64) error {
	ctx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	payload, err := json.Marshal(types.StopwatchEvent{
		EventTime: eventTime,
		EventType: eventType,
		Origin:    config.ServerID,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal stopwatch event: %w", err)
	}
	if err := r.client.Publish(ctx, stopwatchKey(roomID), payload).Err(); err != nil {
		return fmt.Errorf("failed to publish stopwatch %s event to redis: %w", eventType, err)
	}
	return nil
}

func (r *RedisClient) SaveStopwatchState(ctx context.Context, roomID string, state types.StopwatchState) error {
	ctx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	key := stopwatchKey(roomID)
	if err := r.client.HSet(ctx, key, map[string]interface{}{
		"startTime":   state.StartTime,
		"running":     state.Running,
		"elapsedTime": state.ElapsedTime,
	}).Err(); err != nil {
		return fmt.Errorf("failed to save stopwatch state for room %s: %w", roomID, err)
	}
	if err := r.client.Expire(ctx, key, stopwatchTTL).Err(); err != nil {
		return fmt.Errorf("failed to set TTL on stopwatch state for room %s: %w", roomID, err)
	}
	return nil
}

func (r *RedisClient) GetStopwatchState(ctx context.Context, roomID string) (types.StopwatchState, error) {
	ctx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	values, err := r.client.HGetAll(ctx, stopwatchKey(roomID)).Result()
	if err != nil {
		return types.StopwatchState{}, fmt.Errorf("failed to get stopwatch state for room %s: %w", roomID, err)
	}
	var state types.StopwatchState
	state.StartTime, _ = strconv.ParseInt(values["startTime"], 10, 64)
	state.ElapsedTime, _ = strconv.ParseInt(values["elapsedTime"], 10, 64)
	state.Running, _ = strconv.ParseBool(values["running"])
	return state, nil
}

func (r *RedisClient) SubscribeRedisStopwatch(ctx context.Context, roomID string, HandleStopwatchEvent func(types.StopwatchEvent) error) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	key := fmt.Sprintf("%s:stopwatch", roomID)
	pubsub := r.client.Subscribe(ctx, key)
	channel := pubsub.Channel()

	for {
		select {
		case <-ctx.Done():
			return nil
		case msg := <-channel:
			var payload types.StopwatchEvent
			if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
				log.Println("error unmarshaling stopwatch event from redis:", err)
				continue
			}
			if err := HandleStopwatchEvent(payload); err != nil {
				log.Println("error handling stopwatch event:", err)
				continue
			}
		}
	}
}
