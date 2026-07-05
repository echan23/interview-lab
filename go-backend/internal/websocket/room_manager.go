package websocket

import (
	"context"
	"interviewlab-backend/internal/redis"
	"log"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Manager struct {
	rooms       map[string]*Room
	redisClient *redis.RedisClient
	sync.RWMutex
}

var MainManager *Manager

func NewManager() *Manager {
	return &Manager{
		rooms:       make(map[string]*Room),
		redisClient: redis.NewClient(),
	}
}

func (m *Manager) generateRoomID() string {
	return uuid.NewString()
}

func (m *Manager) GetOrCreateRoom(c *gin.Context, roomID string) *Room {
	m.Lock()
	if room, ok := m.rooms[roomID]; ok {
		m.Unlock()
		return room
	}
	m.Unlock()

	newRoom := NewRoom(roomID, m.redisClient)
	content, err := m.redisClient.SyncContentFromRedis(c.Request.Context(), roomID)
	if err == redis.ErrRoomNotFound {
		if saveErr := m.redisClient.SaveRoomToRedis(c.Request.Context(), roomID, ""); saveErr != nil {
			log.Println("failed to save room to redis:", saveErr)
		}
		content = ""
	}
	newRoom.content = content
	go newRoom.Run(roomID)

	m.Lock()
	m.rooms[roomID] = newRoom
	m.Unlock()
	return newRoom
}

func (m *Manager) PingRedis(ctx context.Context) error {
	return m.redisClient.Ping(ctx)
}

func (m *Manager) RoomExists(ctx context.Context, roomID string) (bool, error) {
	return m.redisClient.ClientExists(ctx, roomID)
}

func (m *Manager) GetRoomsCreated(ctx context.Context) int {
	return m.redisClient.GetRoomsCreated(ctx)
}

func (m *Manager) removeRoom(roomID string) {
	m.Lock()
	defer m.Unlock()
	delete(m.rooms, roomID)
	log.Println("Room removed from manager: ", roomID)
}

// Connects clients to their Room
func (m *Manager) RouteClients(c *gin.Context, roomID string) {
	room := m.GetOrCreateRoom(c, roomID)
	log.Println("Routing client to Room")
	room.ServeWS(c)
}

// Handles the post request when a client wants to create a new codefile.
func (m *Manager) HandleGenerateRoomRequest(c *gin.Context) {
	roomID := m.generateRoomID()
	if err := m.redisClient.SaveRoomToRedis(c.Request.Context(), roomID, ""); err != nil {
		log.Println("failed to save room to redis:", err)
		c.JSON(500, gin.H{"error": "failed to create room"})
		return
	}
	m.redisClient.UpdateRoomsCreated(c.Request.Context())
	c.JSON(200, gin.H{"roomID": roomID})
}
