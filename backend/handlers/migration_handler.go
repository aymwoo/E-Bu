package handlers

import (
	"net/http"

	"E-Bu-backend/database"

	"github.com/gin-gonic/gin"
)

type MigrationHandler struct {
	DB     *database.DB
	DBPath string
}

func NewMigrationHandler(db *database.DB, dbPath string) *MigrationHandler {
	return &MigrationHandler{DB: db, DBPath: dbPath}
}

func (h *MigrationHandler) GetMigrations(c *gin.Context) {
	status, err := database.GetMigrationStatus(h.DB.DB, h.DBPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

func (h *MigrationHandler) ApplyMigrations(c *gin.Context) {
	applied, err := database.ApplyMigrationsToLatest(h.DB.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"applied": applied,
		"count":   len(applied),
	})
}
