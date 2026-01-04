package handlers

import (
	"net/http"
	"time"

	"E-Bu-backend/database"
	"E-Bu-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BackupHandler struct {
	DB *database.DB
}

func NewBackupHandler(db *database.DB) *BackupHandler {
	return &BackupHandler{DB: db}
}

// ExportBackup exports all questions as a JSON backup
func (h *BackupHandler) ExportBackup(c *gin.Context) {
	// Get all questions (including deleted ones)
	var allQuestions []models.Question
	result := h.DB.Find(&allQuestions)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch questions for backup"})
		return
	}

	backupData := models.BackupData{
		Version:    "1.2.0",
		ExportedAt: time.Now().Unix(),
		Data:       allQuestions,
	}

	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", "attachment; filename=E-Bu_backup.json")
	c.JSON(http.StatusOK, backupData)
}

// ImportBackup imports questions from a JSON backup
func (h *BackupHandler) ImportBackup(c *gin.Context) {
	var backupData models.BackupData
	if err := c.ShouldBindJSON(&backupData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid backup file format"})
		return
	}

	// Clear existing data (optional - you might want to merge instead)
	var existingQuestions []models.Question
	h.DB.Find(&existingQuestions)
	for _, question := range existingQuestions {
		h.DB.Delete(&question)
	}

	// Import new data
	for i := range backupData.Data {
		// Generate new IDs for imported questions to avoid conflicts
		backupData.Data[i].ID = ""
	}

	for i := range backupData.Data {
		// Generate a new ID for each question
		backupData.Data[i].ID = uuid.New().String()
		if err := h.DB.Create(&backupData.Data[i]).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to import questions"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Backup imported successfully", "count": len(backupData.Data)})
}