package handlers

import (
	"crypto/rand"
	"fmt"
	"log"
	"net/http"
	"solar-retro/backend/db"
	"solar-retro/backend/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for now
	},
}

// Clients map: WebSocket connection -> UserSession
var clients = make(map[*websocket.Conn]models.UserSession)
var broadcast = make(chan models.BroadcastMessage)
var decoratingEnabled = false // Global state for decorating access

func SetupRoutes(r *gin.Engine) {
	r.GET("/ws", HandleWebSocket)
	r.GET("/api/tree", GetTree) // Initial load

	// Start broadcaster
	go handleMessages()
}

func HandleWebSocket(c *gin.Context) {
	nickname := c.Query("nickname")
	mood := c.Query("mood")
	moodMessage := c.Query("moodMessage")

	if nickname == "" {
		nickname = "Anonymous"
	}
	if mood == "" {
		mood = "happy" // Default
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WS Upgrade error:", err)
		return
	}
	defer ws.Close()

	// Send initial decorating status to new client
	ws.WriteJSON(models.BroadcastMessage{
		Type:    "decorating_status",
		Payload: decoratingEnabled,
	})

	// Register client
	clients[ws] = models.UserSession{
		Nickname:    nickname,
		Mood:        mood,
		MoodMessage: moodMessage,
	}
	broadcastUserList()

	defer func() {
		delete(clients, ws)
		broadcastUserList()
	}()

	for {
		var msg models.WSIncomingMessage
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("WS Read error: %v", err)
			break
		}

		switch msg.Action {
		case "create", "":
			d := msg.Decoration
			if d.ID == "" {
				d.ID = generateUUID()
			}
			if d.CreatedAt == 0 {
				d.CreatedAt = time.Now().Unix()
			}
			if d.RoomID == "" {
				d.RoomID = "default"
			}
			if err := db.SaveDecoration(d); err != nil {
				log.Printf("Error saving to DB: %v", err)
			}
			broadcast <- models.BroadcastMessage{
				Type:    "new_decoration",
				Payload: d,
			}

		case "toggle_decorating":
			// Only allow Axel to toggle
			session := clients[ws]
			if session.Nickname == "Axel" {
				decoratingEnabled = !decoratingEnabled
				log.Printf("Decorating toggled to: %v by %s", decoratingEnabled, session.Nickname)
				broadcast <- models.BroadcastMessage{
					Type:    "decorating_status",
					Payload: decoratingEnabled,
				}
			}

		case "update":
			d := msg.Decoration
			if d.RoomID == "" {
				d.RoomID = "default"
			}
			if err := db.SaveDecoration(d); err != nil {
				log.Printf("Error updating DB: %v", err)
			}
			broadcast <- models.BroadcastMessage{
				Type:    "decoration_updated",
				Payload: d,
			}

		case "delete":
			id := msg.DecorationID
			if err := db.DeleteDecoration(id, "default"); err != nil {
				log.Printf("Error deleting from DB: %v", err)
			}
			broadcast <- models.BroadcastMessage{
				Type:    "decoration_deleted",
				Payload: id,
			}
		}
	}
}

func GetTree(c *gin.Context) {
	roomID := c.DefaultQuery("roomId", "default")
	decs, err := db.GetAllDecorations(roomID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	if decs == nil {
		decs = []models.Decoration{}
	}
	c.JSON(200, decs)
}

func handleMessages() {
	for {
		msg := <-broadcast
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Printf("WS Write error: %v", err)
				client.Close()
				delete(clients, client)
			}
		}
	}
}

func broadcastUserList() {
	userList := make([]models.UserSession, 0, len(clients))
	for _, session := range clients {
		userList = append(userList, session)
	}

	broadcast <- models.BroadcastMessage{
		Type:    "user_list",
		Payload: userList,
	}
}

func generateUUID() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
