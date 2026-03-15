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
	"time"

	"github.com/redis/go-redis/v9"
)

type CodeFile struct{
	RoomID string `json:"roomID"`
	Content string `json:"content"`
}

var Client *redis.Client
func InitRedisClient(){
	opt, _ := redis.ParseURL(os.Getenv("REDIS_URL"))
	Client = redis.NewClient(opt)
}

//Hash is unnecessary but leave as a hash in case more fields get added
func SaveRoomToRedis(roomID string, contentString string){
	ctx, cancel := context.WithTimeout(context.Background(), 1 * time.Second)
	defer cancel()
	err := Client.HSet(ctx, roomID, map[string]interface{}{
		"content": contentString,
	}).Err()
	if err != nil{
		log.Println("error setting file in redis for room: ", roomID, err)
		return
	}
	if ok, ttlErr := Client.Expire(ctx, roomID, 5*time.Minute).Result(); ttlErr != nil{
		log.Println("Failed to set TTL for room:", roomID, ttlErr)
	} else if !ok{
		log.Println("TTL not set, key might not exist: ", roomID)
	}

	log.Println("Saving room hash in redis")
}

var ErrRoomNotFound = errors.New("room not found in redis")

func SyncContentFromRedis(roomID string) (string, error){
	ctx, cancel := context.WithTimeout(context.Background(), 1 * time.Second)
	defer cancel()
	content, err := Client.HGet(ctx, roomID, "content").Result()
	if err == nil{
		ttlResetErr := Client.Expire(ctx, roomID, 5*time.Minute).Err()
		if ttlResetErr != nil {
			log.Println("Failed to reset TTL for room:", roomID, ttlResetErr)
		}
		return content, nil
	}
	if err == redis.Nil{
		log.Println("Room doesn't exist in redis: ", roomID)
		content, dbErr := postgres.RetrieveContent(ctx, roomID)
		if dbErr == nil{
			log.Println("Room retrieved from Postgres: ", roomID)
			return content, nil
		}
		log.Println("Content not found in postgres")
	}
	return "", ErrRoomNotFound
}

func SyncContentToRedis(parentCtx context.Context, roomID string, contentString string){
	ctx, cancel := context.WithTimeout(parentCtx, 1 * time.Second)
	defer cancel()
	err := Client.HSet(ctx, roomID, "content", contentString).Err()
	ttlResetErr := Client.Expire(ctx, roomID, 5*time.Minute).Err()
	if ttlResetErr != nil {
		log.Println("Failed to reset TTL for room:", roomID, ttlResetErr)
	}
	if err != nil{
		log.Println("error syncing diffs to redis for room: ", roomID, err)
		return
	}
}

func SubscribeDiffs(ctx context.Context, roomID string, handleIncomingDiff func([]types.Edit)){
	pubsub := Client.Subscribe(ctx, "room:"+roomID+":diffs")
	channel := pubsub.Channel()
	for{
		select{
		case <- ctx.Done():
			return

		case msg := <- channel:
			var rEdits types.RedisEnvelope
			if err := json.Unmarshal([]byte(msg.Payload), &rEdits); err != nil{
				log.Println("redis: invalid diff payload", err)
				continue
			}
			//Ignore edits that are from the same server, those edits have already been broadcasted locally
			if rEdits.Origin != config.ServerID{
				handleIncomingDiff(rEdits.Edits)
			}
		}
	}
}

func PublishDiffs(ctx context.Context, roomID string, editPayload types.RedisEnvelope){
	editJSON, err := json.Marshal(editPayload)
	if err != nil{
		log.Println("Error converting edits to JSON")
		return
	}
	if err := Client.Publish(ctx, "room:"+roomID+":diffs", editJSON).Err(); err != nil{
		log.Println("redis: could not publish diffs for payload: ", editJSON)
		return
	}
}

func ClientExists(ctx context.Context, roomID string) (bool, error){
	exists, err := Client.Exists(ctx, roomID).Result()
	if err != nil{
		return false, fmt.Errorf("Redis EXISTS failed for %s, %w", roomID, err)
	} else if exists > 0{
		return true, nil
	}
	_, dbErr := postgres.RetrieveContent(ctx, roomID)
	if dbErr == nil{
		return true, nil
	}
	if err == postgres.ErrRoomNotFound{
		return false, postgres.ErrRoomNotFound
	}
	return false, fmt.Errorf("Postgres lookup failed for %s, %w", roomID, err)
}

func UpdateRoomsCreated(ctx context.Context){
	if _, err := Client.Incr(ctx, "rooms_created").Result(); err != nil{
		log.Println("Failed to increment room counter")
	}
}

func GetRoomsCreated(ctx context.Context) (int){
	count, err := Client.Get(ctx, "rooms_created").Int()
	if err != nil{
		log.Println("Failed to retrieve all time rooms created")
	}
	return count
}