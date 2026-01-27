package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"log"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"time"

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
	migrationHandler := handlers.NewMigrationHandler(db, dbPath)

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

		// Database migrations
		api.GET("/db/migrations", migrationHandler.GetMigrations)
		api.POST("/db/migrate", migrationHandler.ApplyMigrations)
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
		// Serve assets directory for JS/CSS files
		r.Static("/assets", filepath.Join(staticDir, "assets"))
		// Serve fonts and other static folders
		r.Static("/fonts", filepath.Join(staticDir, "fonts"))
		// Serve other static files from root
		r.StaticFile("/gitee.ico", filepath.Join(staticDir, "gitee.ico"))
		r.StaticFile("/screenshot.png", filepath.Join(staticDir, "screenshot.png"))
		// Serve index.html for root path
		r.GET("/", func(c *gin.Context) {
			c.File(filepath.Join(staticDir, "index.html"))
		})
		// Fallback to index.html for SPA routing
		r.NoRoute(func(c *gin.Context) {
			c.File(filepath.Join(staticDir, "index.html"))
		})
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	certFile := os.Getenv("TLS_CERT")
	keyFile := os.Getenv("TLS_KEY")

	if certFile != "" && keyFile != "" {
		if err := ensureCert(certFile, keyFile); err != nil {
			log.Printf("Failed to generate/check certificates: %v", err)
		} else {
			log.Printf("Server starting on port %s (HTTPS)", port)
			// RunTLS is blocking
			if err := r.RunTLS(":"+port, certFile, keyFile); err != nil {
				log.Fatalf("Failed to start HTTPS server: %v", err)
			}
			return
		}
	}

	log.Printf("Server starting on port %s (HTTP)", port)
	r.Run(":" + port)
}

func ensureCert(certFile, keyFile string) error {
	// Check if files exist
	if _, err := os.Stat(certFile); err == nil {
		if _, err := os.Stat(keyFile); err == nil {
			return nil // Both exist
		}
	}

	log.Println("Generating self-signed certificate...")

	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(certFile), 0755); err != nil {
		return err
	}

	// Generate key
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return err
	}

	// Template
	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization: []string{"E-Bu Local"},
		},
		NotBefore: time.Now(),
		NotAfter:  time.Now().Add(365 * 24 * time.Hour),

		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}

	// Add localhost IPs
	template.IPAddresses = []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")}
	template.DNSNames    = []string{"localhost"}

	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		return err
	}

	// Write cert
	certOut, err := os.Create(certFile)
	if err != nil {
		return err
	}
	pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes})
	certOut.Close()

	// Write key
	keyOut, err := os.Create(keyFile)
	if err != nil {
		return err
	}
	privBytes := x509.MarshalPKCS1PrivateKey(priv)
	pem.Encode(keyOut, &pem.Block{Type: "RSA PRIVATE KEY", Bytes: privBytes})
	keyOut.Close()

	log.Println("Certificate generated.")
	return nil
}
