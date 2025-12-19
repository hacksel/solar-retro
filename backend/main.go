package main

import (
	"os"
	"solar-retro/backend/db"
	"solar-retro/backend/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	db.Init()
	r := GinRouter()

	// Read PORT from environment, default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r.Run(":" + port)
}

func GinRouter() *gin.Engine {
	r := gin.Default()

	// CORS Middleware (Simple version)
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, ngrok-skip-browser-warning")
		c.Writer.Header().Set("ngrok-skip-browser-warning", "69420")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	handlers.SetupRoutes(r)
	return r
}
