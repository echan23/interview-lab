package websocket

import (
	"context"
	"fmt"
	"interviewlab-backend/internal/config"
	"interviewlab-backend/internal/postgres"
	"interviewlab-backend/internal/redis"
	"interviewlab-backend/internal/stopwatch"
	"interviewlab-backend/internal/types"
	"log"
	"sort"
	"sync"
	"time"
)

type Room struct {
	Id               string
	clients          map[*Client]bool
	broadcast        chan types.Broadcast
	register         chan *Client
	unregister       chan *Client
	publishQueue     chan []types.Edit
	publishInterval  time.Duration
	publishBatchSize int
	content          string
	sync.RWMutex
	Ctx               context.Context
	Cancel            context.CancelFunc
	hashWriteInterval time.Duration
	writeInProgress   bool
	flushedChannel    chan struct{}
	dbWriteInterval   time.Duration
	timer             *time.Timer
	persistDuration   time.Duration
	redisClient       *redis.RedisClient
	stopwatch         *stopwatch.Stopwatch
	stopwatchCh       chan types.StopwatchEvent
}

type UserCountUpdate struct {
	MessageType string `json:"type"`
	Count       int64  `json:"count"`
}

type StopwatchUpdate struct {
	MessageType string `json:"type"`
	StartTime   int64  `json:"startTime"`
	ElapsedTime int64  `json:"elapsedTime"`
	Running     bool   `json:"running"`
}

/*
We pass broadcast instead of just a message because we ned to track senderid so that clients don't re-receive their own edits.
Without senderID a client will send a message to the Room which will send it back to all clients, resulting in a client's input
getting doubled on their browser
*/
func (r *Room) BroadcastEdit(edit types.Broadcast) {
	for client := range r.clients {
		if client.id != edit.Sender {
			client.receiveEdit <- edit.Message
		}
	}
}

func (r *Room) addClient(c *Client) {
	r.Lock()
	defer r.Unlock()
	log.Println("New Client Connected", c.id)
	r.clients[c] = true
	if r.timer != nil {
		r.timer.Stop()
	}
	r.timer = nil
}

// Add some sort of room shutdown feature
func (r *Room) removeClient(c *Client) {
	r.Lock()
	defer r.Unlock()
	delete(r.clients, c)
	c.conn.Close()
	if len(r.clients) == 0 && r.timer == nil {
		log.Println("no clients, beginning shutdown soon: ", r.Id)
		r.timer = time.AfterFunc(r.persistDuration, func() {
			r.shutdown()
		})
	}

	log.Println("Client Disconnected", c.id)
}

func (r *Room) isEmpty() bool {
	r.RLock()
	defer r.RUnlock()
	return len(r.clients) == 0
}

func (r *Room) shutdown() {
	log.Println("Shutting down room: ", r.Id)
	r.Cancel()
	MainManager.removeRoom(r.Id)
}

func (r *Room) handleEdit(edits []types.Edit) {
	r.Lock()
	defer r.Unlock()
	sort.Slice(edits, func(i, j int) bool {
		return edits[i].RangeOffset > edits[j].RangeOffset
	})

	for _, e := range edits {
		start := e.RangeOffset
		end := e.RangeOffset + e.RangeLength
		if start < 0 || end > len(r.content) {
			continue
		}
		before := r.content[:start]
		after := r.content[end:]
		r.content = before + e.Text + after
	}
	log.Println(r.content)
}

func NewRoom(roomID string, client *redis.RedisClient) *Room {
	ctx, cancel := context.WithCancel(context.Background())
	return &Room{
		Id:                roomID,
		clients:           make(map[*Client]bool),
		register:          make(chan *Client),
		unregister:        make(chan *Client),
		broadcast:         make(chan types.Broadcast),
		publishQueue:      make(chan []types.Edit),
		publishBatchSize:  20,
		publishInterval:   200 * time.Millisecond,
		Ctx:               ctx,
		Cancel:            cancel,
		hashWriteInterval: 2 * time.Second,
		dbWriteInterval:   10 * time.Second,
		persistDuration:   5 * time.Minute,
		redisClient: client,
		stopwatch:   stopwatch.New(ctx, roomID, client),
		stopwatchCh: make(chan types.StopwatchEvent),
	}
}

func (r *Room) handleIncomingDiff(edits []types.Edit) {
	r.broadcast <- types.Broadcast{
		Sender:  "redis",
		Message: edits,
	}
}

// Batch diffs to publish every 200 ms or when buffer exceeded instead of publishing each change, this is only for cross server sync
func (r *Room) startPublishBatcher() {
	ticker := time.NewTicker(r.publishInterval)
	defer ticker.Stop()

	var buffer []types.Edit
	flush := func() {
		if len(buffer) == 0 {
			return
		}
		batch := make([]types.Edit, len(buffer))
		copy(batch, buffer)
		buffer = buffer[:0]

		env := types.RedisEnvelope{
			Origin: config.ServerID,
			Edits:  batch,
		}
		r.redisClient.PublishDiffs(r.Ctx, r.Id, env)
		log.Println("Publishing edit batch to Redis")
	}
	for {
		select {
		case <-r.Ctx.Done():
			return
		case edits := <-r.publishQueue:
			buffer = append(buffer, edits...)
			if len(buffer) >= r.publishBatchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}

func (r *Room) startHashWriteRoutine() {
	ticker := time.NewTicker(r.hashWriteInterval)
	defer ticker.Stop()
	for {
		select {
		case <-r.Ctx.Done():
			r.redisClient.SyncContentToRedis(r.Ctx, r.Id, r.content)
			return

		case <-ticker.C:
			r.redisClient.SyncContentToRedis(r.Ctx, r.Id, r.content)
			r.redisClient.RefreshStopwatchTTL(r.Ctx, r.Id)
		}
	}
}

func (r *Room) startDBWriteRoutine() {
	ticker := time.NewTicker(r.dbWriteInterval)
	defer ticker.Stop()
	for {
		select {
		case <-r.Ctx.Done():
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := postgres.SaveToDB(ctx, r.Id, r.content, time.Now()); err != nil {
				log.Println("Error flushing to db on shutdown:", r.Id, err)
			}
			return
		case <-ticker.C:
			err := postgres.SaveToDB(r.Ctx, r.Id, r.content, time.Now())
			if err != nil {
				log.Println("Error saving to db:", r.Id, err)
			}
		}
	}
}

// Starts the server's listeners for channels
func (r *Room) Run(roomID string) {
	log.Println("Room.Run started")
	go r.redisClient.SubscribeDiffs(r.Ctx, r.Id, r.handleIncomingDiff)
	go r.redisClient.SubscribeRedisStopwatch(r.Ctx, r.Id, r.handleRemoteStopwatchEvent)
	go r.startPublishBatcher()
	go r.startHashWriteRoutine()
	go r.startDBWriteRoutine()
	for {
		select {
		case <-r.Ctx.Done():
			return
		case client := <-r.register:
			r.addClient(client)
			fmt.Println("Client connected", client.id)
			r.redisClient.SyncContentToRedis(r.Ctx, r.Id, r.content)
			r.AddClientToRedis(client.id)
			r.BroadcastUserCountUpdate()
			r.sendStopwatchState(client)
		case client := <-r.unregister:
			r.removeClient(client)
			fmt.Println("Client disconnected", client.id)
			r.RemoveClientFromRedis(client.id)
			r.BroadcastUserCountUpdate()
			// Pause the stopwatch once the room empties so idle time isn't counted
			if r.isEmpty() {
				if err := r.stopwatch.Trigger("stop"); err != nil {
					log.Println("error auto-stopping stopwatch:", err)
				}
			}
		case edit := <-r.broadcast:
			r.handleEdit(edit.Message)
			r.BroadcastEdit(edit)
		case event := <-r.stopwatchCh:
			if err := r.stopwatch.Trigger(event.EventType); err != nil {
				log.Println("error handling stopwatch event:", err)
			}
			r.BroadcastStopwatchState()
		}
	}
}

// handleRemoteStopwatchEvent applies stopwatch events published by other servers
func (r *Room) handleRemoteStopwatchEvent(event types.StopwatchEvent) error {
	if event.Origin == config.ServerID {
		return nil // already applied and broadcast locally
	}
	if err := r.stopwatch.HandleStopwatchEvent(event); err != nil {
		return err
	}
	r.BroadcastStopwatchState()
	return nil
}

func (r *Room) stopwatchUpdateMessage() *StopwatchUpdate {
	state := r.stopwatch.State()
	return &StopwatchUpdate{
		MessageType: "stopwatchUpdate",
		StartTime:   state.StartTime,
		ElapsedTime: state.ElapsedTime,
		Running:     state.Running,
	}
}

func (r *Room) sendStopwatchState(client *Client) {
	if err := client.conn.WriteJSON(r.stopwatchUpdateMessage()); err != nil {
		log.Printf("error sending stopwatch state for room %s, client %s: %v\n", r.Id, client.id, err)
	}
}

func (r *Room) BroadcastStopwatchState() {
	r.RLock()
	defer r.RUnlock()
	update := r.stopwatchUpdateMessage()
	for client := range r.clients {
		if err := client.conn.WriteJSON(update); err != nil {
			log.Printf("error sending stopwatch state for room %s, client %s: %v\n", r.Id, client.id, err)
		}
	}
}

func (r *Room) AddClientToRedis(clientID string) {
	if err := r.redisClient.AddClientToRedis(r.Ctx, r.Id, clientID); err != nil {
		log.Println(err)
	}
}

func (r *Room) RemoveClientFromRedis(clientID string) {
	if err := r.redisClient.RemoveClientFromRedis(r.Ctx, r.Id, clientID); err != nil {
		log.Println(err)
	}
}

func (r *Room) BroadcastUserCountUpdate() {
	count, err := r.redisClient.GetClientCount(r.Ctx, r.Id)
	if err != nil {
		log.Println(err)
		return
	}
	userCountUpdate := &UserCountUpdate{
		MessageType: "userCountUpdate",
		Count:       count,
	}
	for client := range r.clients {
		if err := client.conn.WriteJSON(userCountUpdate); err != nil {
			log.Printf("error sending user count for room %s, client %s: %v\n", r.Id, client.id, err)
		}
	}
}
