package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"interviewlab-backend/internal/config"
	"interviewlab-backend/internal/postgres"
	"interviewlab-backend/internal/redis"
	"interviewlab-backend/internal/websocket"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	log.Println("Frontend url: " , os.Getenv("FRONTEND_URL"))
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{os.Getenv("FRONTEND_URL")},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		AllowCredentials: true,
	  }))


	/*ROOMS LOGIC*/

	websocket.MainManager = websocket.NewManager()
	config.Init() //Sets the serverID
	postgres.Init() //starts postgres connection
	defer postgres.DB.Close()
	redis.InitRedisClient()

	//Have a post method that handles creation of new Room
	r.POST("/api/room/create", func(c *gin.Context){
		log.Println("Generating new Room URL (main.go)")
		websocket.MainManager.HandleGenerateRoomRequest(c)
	})

	//Handles accessing an existing room
	r.GET("/ws/:roomID", func(c *gin.Context){
		roomID := c.Param("roomID")
		exists, err := redis.ClientExists(c.Request.Context(), roomID)
		if err != nil{
			if err == postgres.ErrRoomNotFound{
				c.JSON(404, gin.H{"error": "Room does not exist"})
				return
			}
			c.JSON(500, gin.H{"error": "Error validating room existence"})
			return
		}
		if !exists{
			c.JSON(404, gin.H{"error": "room does not exist"})
        	return
		}
		log.Println("Routing client to Room (main.go)")
		websocket.MainManager.RouteClients(c, roomID)
	})

	r.GET("/api/roomsAllTime", func(c *gin.Context){
		count := redis.GetRoomsCreated(c.Request.Context())
		c.JSON(200, gin.H{"type": "roomsAlltime", "value": count})
	})

	// Proxy hint requests to Python backend
	aiServiceURL := os.Getenv("AI_SERVICE_URL")
	httpClient := &http.Client{Timeout: 30 * time.Second}

	r.POST("/api/hint", func(c *gin.Context) {
		if aiServiceURL == "" {
			c.JSON(500, gin.H{"error": "Python backend URL not configured"})
			return
		}

		var body struct {
			Code     string `json:"code" binding:"required"`
			HintType string `json:"hintType" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": "Invalid request body"})
			return
		}

		payload, _ := json.Marshal(body)
		req, err := http.NewRequestWithContext(c.Request.Context(), "POST", fmt.Sprintf("%s/hint", aiServiceURL), bytes.NewReader(payload))
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create request"})
			return
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := httpClient.Do(req)
		if err != nil {
			log.Printf("Hint proxy error: %v", err)
			c.JSON(502, gin.H{"error": "Failed to reach hint service"})
			return
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(502, gin.H{"error": "Failed to read hint response"})
			return
		}

		log.Printf("Hint proxy response (status %d): %s", resp.StatusCode, string(respBody))
		c.Data(resp.StatusCode, "application/json", respBody)
	})

	//Keep this last in file always
	r.NoRoute(func (c *gin.Context){
		c.File("./frontend/dist/index.html")
	})


	r.GET("/healthz", func(c *gin.Context) {
		if err := redis.Client.Ping(c.Request.Context()).Err(); err != nil {
			c.JSON(500, gin.H{"status": "redis error", "error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
	})



	log.Println("Server starting on port 8080")

	//Last in file
	r.Run(":8080")


	//log.fatal here
}