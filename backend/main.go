package main

import (
	"log"
	"os"
	"path/filepath"

	"E-Bu-backend/database"
	"E-Bu-backend/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	// Set up Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Enable CORS
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Requested-With")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Initialize database
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "/app/ebu.db" // Default path in container
	}

	// Ensure the directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatal("Failed to create database directory:", err)
	}

	db, err := database.NewDB(dbPath)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Initialize handlers
	questionHandler := handlers.NewQuestionHandler(db)
	aiConfigHandler := handlers.NewAIConfigHandler(db)
	backupHandler := handlers.NewBackupHandler(db)

	// API routes
	api := r.Group("/api")
	{
		// Question routes
		api.GET("/questions", questionHandler.GetQuestions)
		api.GET("/trash", questionHandler.GetTrash)
		api.POST("/questions", questionHandler.CreateQuestion)
		api.PUT("/questions/:id", questionHandler.UpdateQuestion)
		api.DELETE("/questions/:id", questionHandler.DeleteQuestion)
		api.PATCH("/questions/:id/restore", questionHandler.RestoreQuestion)
		api.DELETE("/questions/:id/hard", questionHandler.HardDeleteQuestion)

		// AI Config routes
		api.GET("/config", aiConfigHandler.GetAIConfig)
		api.PUT("/config", aiConfigHandler.SaveAIConfig)
		api.POST("/analyze", aiConfigHandler.AnalyzeImage)

		// Backup routes
		api.GET("/export", backupHandler.ExportBackup)
		api.POST("/import", backupHandler.ImportBackup)
	}

	// Serve static files from frontend if available
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../dist" // Default to frontend build directory
	}

	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		// If static directory doesn't exist, create a simple health check endpoint
		r.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "E-Bu Backend API",
				"status":  "running",
			})
		})
	} else {
		r.Static("/static", staticDir)
		r.NoRoute(func(c *gin.Context) {
			c.File(staticDir + "/index.html")
		})
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}