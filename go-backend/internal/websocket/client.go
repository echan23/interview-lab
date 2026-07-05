package websocket

import (
	"encoding/json"
	"interviewlab-backend/internal/types"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func Upgrade(c *gin.Context) (*websocket.Conn, error) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("error while upgrading")
		return nil, err
	}
	return conn, nil
}

type Client struct{
	id string
	room *Room
	conn *websocket.Conn
	receiveEdit chan []types.Edit
	send chan []byte
}

func generateID() string{
	return uuid.NewString()
}

func NewClient(conn *websocket.Conn, room *Room) *Client {
	return &Client{
		id: generateID(),
		room: room,
		conn: conn,
		receiveEdit: make(chan []types.Edit),
		send: make(chan []byte),
	}
}

func (c *Client) readPump() {
	defer func() {
        c.room.unregister <- c
        c.conn.Close()
        log.Println("Client closed connection")
    }()
	for{
		_, payload, err := c.conn.ReadMessage()
		if err != nil{
			log.Println("Error reading message: ", err)
			return
		}
		// Object payloads are control messages (e.g. stopwatch); arrays are editor diffs
		if len(payload) > 0 && payload[0] == '{' {
			var event struct {
				Type      string `json:"type"`
				EventType string `json:"eventType"`
				EventTime int64  `json:"eventTime"`
			}
			if err := json.Unmarshal(payload, &event); err == nil && event.Type == "stopwatch" {
				c.room.stopwatchCh <- types.StopwatchEvent{EventType: event.EventType, EventTime: event.EventTime}
				continue
			}
			log.Println("Unrecognized control message:", string(payload))
			continue
		}
		var edits []types.Edit
		if err := json.Unmarshal(payload, &edits); err != nil{
			log.Println("Error:", err)
			return
		}
		//log.Println("sending diffs to redis")
		c.room.broadcast <- types.Broadcast{Sender: c.id, Message: edits}
		c.room.publishQueue <- edits
	}
}

func (c *Client) writePump(){
	defer func(){
		log.Println("Closing from write pump")
		c.conn.Close()
	}()

	for{
		output, ok := <- c.receiveEdit
		log.Println("Writepump output from broadcast:" , output)
		if !ok{
			log.Println("Error receiving broadcast")
			return
		}

		log.Println("Sending message:", output)
		if err := c.conn.WriteJSON(output); err != nil{
			log.Println("error writing message", err)
			return
		}
	}
}


