package websocket

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

type Init struct{
	Type string `json:"type"`
	Content string `json:"content"`
}

/*Init passes the current contents of the codefile to the client
Before I had this pass r.content which is how the content was initialized for rooms in the same server.
Now, we are loading the content from the redis hash so that clients on diff servers can access the same content*/

func (c *Client) InitClientContent(content string){
	log.Println("Sending editor content to client: ", content)
	initContent := Init{Type: "init", Content: content}
	if err := c.conn.WriteJSON(initContent); err != nil{
		log.Println("Error sending editor content to client")
		return
	}
}

//Handler for a http connection, this upgrades the http connection to a websocket then start goroutines for reading and writing
func (r *Room) ServeWS(c *gin.Context){
	log.Println("New ServeWS connection:", time.Now())
	conn, err := Upgrade(c)
	if err != nil{
		log.Println("Websocket upgrade failed")
		return
	}
	client := NewClient(conn, r)
	initContent, _ := r.redisClient.SyncContentFromRedis(r.Ctx, r.Id) //This is where we are pulling from the hash rather than reading the room's local value
	log.Println("initContent: ", initContent)
	client.InitClientContent(initContent)
	r.register <- client
	go client.readPump()
	go client.writePump()
}