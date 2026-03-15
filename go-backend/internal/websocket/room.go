package websocket

import (
	"context"
	"fmt"
	"interviewlab-backend/internal/config"
	"interviewlab-backend/internal/postgres"
	"interviewlab-backend/internal/redis"
	"interviewlab-backend/internal/types"
	"log"
	"sort"
	"sync"
	"time"
)



type Room struct{
	Id string
	clients map[*Client]bool
	broadcast chan types.Broadcast
	register chan *Client
	unregister chan *Client
	publishQueue chan []types.Edit
	publishInterval time.Duration
	publishBatchSize int
	content string 
	sync.RWMutex
	Ctx context.Context
	Cancel context.CancelFunc
	hashWriteInterval time.Duration
	writeInProgress bool
	flushedChannel chan struct{}
	dbWriteInterval time.Duration
	timer *time.Timer
	persistDuration time.Duration
}

/*We pass broadcast instead of just a message because we ned to track senderid so that clients don't re-receive their own edits. 
Without senderID a client will send a message to the Room which will send it back to all clients, resulting in a client's input
getting doubled on their browser*/
func (r *Room) BroadcastEdit(edit types.Broadcast){
	for client := range r.clients{
		if client.id != edit.Sender{
			client.receiveEdit <- edit.Message
		}
	}
}

func (r *Room) addClient(c *Client){
	r.Lock()
	defer r.Unlock()
	log.Println("New Client Connected", c.id)
	r.clients[c] = true
	if r.timer != nil{
		r.timer.Stop()
	}
	r.timer = nil
}
//Add some sort of room shutdown feature
func (r *Room) removeClient(c *Client){
	r.Lock()
	defer r.Unlock()
	delete(r.clients, c)
	c.conn.Close()
	if len(r.clients) == 0 && r.timer == nil{
		log.Println("no clients, beginning shutdown soon: ", r.Id)
		r.timer = time.AfterFunc(r.persistDuration, func(){
			r.shutdown()
		})
	}

	log.Println("Client Disconnected", c.id)
}

func (r *Room) shutdown(){
	log.Println("Shutting down room: ", r.Id)
	r.Cancel()
	MainManager.removeRoom(r.Id)
}

func (r *Room) handleEdit(edits []types.Edit){
	r.Lock()
	defer r.Unlock()
	sort.Slice(edits, func(i, j int) bool{
		return edits[i].RangeOffset > edits[j].RangeOffset
	})

	for _, e := range(edits){
		start := e.RangeOffset
		end := e.RangeOffset + e.RangeLength
		if start < 0 || end > len(r.content){
			continue
		}
		before := r.content[:start]
		after := r.content[end:]
		r.content = before + e.Text + after
	}
	log.Println(r.content)
}


func NewRoom(roomID string) *Room {
	ctx, cancel := context.WithCancel(context.Background())
	return &Room{
		Id: roomID,
		clients: make(map[*Client]bool),
		register: make(chan *Client),
		unregister: make(chan *Client),
		broadcast: make(chan types.Broadcast),
		publishQueue: make(chan []types.Edit),
		publishBatchSize: 20,
		publishInterval: 200 * time.Millisecond,
		Ctx: ctx,
		Cancel: cancel,
		hashWriteInterval: 2 * time.Second,
		dbWriteInterval: 10 * time.Second,
		persistDuration: 5 * time.Minute,
	}
}

func (r *Room) handleIncomingDiff(edits []types.Edit){
	r.broadcast <- types.Broadcast{
		Sender: "redis",
		Message: edits,
	}
}

//Batch diffs to publish every 200 ms or when buffer exceeded instead of publishing each change, this is only for cross server sync
func (r *Room) startPublishBatcher(){
	ticker := time.NewTicker(r.publishInterval)
	defer ticker.Stop()

	var buffer []types.Edit
	flush := func(){
		if len(buffer) == 0{
			return
		}
		batch := make([]types.Edit, len(buffer))
		copy(batch, buffer)
		buffer = buffer[:0]

		env := types.RedisEnvelope{
			Origin: config.ServerID,
			Edits: batch,
		}
		redis.PublishDiffs(r.Ctx, r.Id, env)
		log.Println("Publishing edit batch to Redis")
	}
	for{
		select{
		case <- r.Ctx.Done():
			return
		case edits := <- r.publishQueue:
			buffer = append(buffer, edits...)
			if len(buffer) >= r.publishBatchSize{
				flush()
			}
		case <- ticker.C:
			flush()
		}
	}
}

func (r *Room) startHashWriteRoutine(){
	ticker := time.NewTicker(r.hashWriteInterval)
	defer ticker.Stop()
	for{
		select{
			case <- r.Ctx.Done():
					redis.SyncContentToRedis(r.Ctx, r.Id, r.content)
					return
			
			case <- ticker.C:
				redis.SyncContentToRedis(r.Ctx, r.Id, r.content)
		}
	}
}

func (r *Room) startDBWriteRoutine(){
	ticker := time.NewTicker(r.dbWriteInterval)
	defer ticker.Stop()
	for{
		select{
			case <- r.Ctx.Done():
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				if err := postgres.SaveToDB(ctx, r.Id, r.content, time.Now()); err != nil {
					log.Println("Error flushing to db on shutdown:", r.Id, err)
				}
				return
			case <- ticker.C:
				err := postgres.SaveToDB(r.Ctx, r.Id, r.content, time.Now())
				if err != nil{
					log.Println("Error saving to db:", r.Id, err)
				}
		}
	}
}

//Starts the server's listeners for channels
func (r *Room) Run(roomID string) {
	log.Println("Room.Run started")
	go redis.SubscribeDiffs(r.Ctx, roomID, r.handleIncomingDiff)
	go r.startPublishBatcher()
	go r.startHashWriteRoutine()
	go r.startDBWriteRoutine()
	for{
		select{
			case <-r.Ctx.Done():
            	return
			case client := <-r.register:
				r.addClient(client)
				fmt.Println("Client connected", client.id)
				redis.SyncContentToRedis(r.Ctx, r.Id, r.content)
				r.AddClientToRedis(client.id)
				r.BroadcastUserCountUpdate()
			case client := <-r.unregister:
				r.removeClient(client)
				fmt.Println("Client disconnected", client.id)
				r.RemoveClientFromRedis(client.id)
				r.BroadcastUserCountUpdate()
			case edit := <-r.broadcast:	
				r.handleEdit(edit.Message)
				r.BroadcastEdit(edit)
		}
	}
}

func (r *Room) AddClientToRedis(clientID string) {
	if err := redis.Client.SAdd(r.Ctx, "room:"+r.Id+":clients", clientID).Err(); err != nil {
		fmt.Println(fmt.Errorf("Error adding client %s to Redis for room %s: %w", clientID, r.Id, err))
	}
}

func (r *Room) RemoveClientFromRedis(clientID string) {
	if err := redis.Client.SRem(r.Ctx, "room:"+r.Id+":clients", clientID).Err(); err != nil {
		fmt.Println(fmt.Errorf("Error removing client %s from Redis for room %s: %w", clientID, r.Id, err))
	}
	//If no users left delete client set immediately
	if count, _ := redis.Client.SCard(r.Ctx, "room:"+r.Id+":clients").Result(); count == 0 {
		if err := redis.Client.Del(r.Ctx, "room:"+r.Id+":clients").Err(); err != nil {
			fmt.Println("Error deleting empty room key:", err)
		}
	}
}

func (r *Room) BroadcastUserCountUpdate() {
	count, err := redis.Client.SCard(r.Ctx, "room:"+r.Id+":clients").Result()
	if err != nil {
		fmt.Println(fmt.Errorf("Error getting user count for room %s: %w", r.Id, err))
		return
	}
	for c := range r.clients {
		if err := c.conn.WriteJSON(map[string]interface{}{
			"type":  "userCountUpdate",
			"count": count,
		}); err != nil {
			fmt.Println("Error sending user count to client:", err)
		}
	}
}
