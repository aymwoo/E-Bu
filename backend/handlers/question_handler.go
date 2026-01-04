package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"E-Bu-backend/database"
	"E-Bu-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type QuestionHandler struct {
	DB *database.DB
}

func NewQuestionHandler(db *database.DB) *QuestionHandler {
	return &QuestionHandler{DB: db}
}

// GetQuestions retrieves all non-deleted questions
func (h *QuestionHandler) GetQuestions(c *gin.Context) {
	questions, err := h.DB.GetQuestions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch questions"})
		return
	}
	c.JSON(http.StatusOK, questions)
}

// GetTrash retrieves all deleted questions
func (h *QuestionHandler) GetTrash(c *gin.Context) {
	questions, err := h.DB.GetTrash()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trash"})
		return
	}
	c.JSON(http.StatusOK, questions)
}

// CreateQuestion creates a new question
func (h *QuestionHandler) CreateQuestion(c *gin.Context) {
	var req struct {
		Image             *string  `json:"image"`
		CroppedDiagram    *string  `json:"croppedDiagram"`
		Content           string   `json:"content" binding:"required"`
		Options           []string `json:"options"`
		DiagramDescription *string `json:"diagramDescription"`
		Answer            *string  `json:"answer"`
		Analysis          string   `json:"analysis" binding:"required"`
		LearningGuide     string   `json:"learningGuide" binding:"required"`
		KnowledgePoints   []string `json:"knowledgePoints" binding:"required"`
		Subject           string   `json:"subject" binding:"required"`
		Difficulty        int      `json:"difficulty" binding:"min=1,max=5"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert subject string to enum
	var subject models.Subject
	switch req.Subject {
	case "数学":
		subject = models.Math
	case "物理":
		subject = models.Physics
	case "化学":
		subject = models.Chemistry
	case "生物":
		subject = models.Biology
	case "英语":
		subject = models.English
	case "语文":
		subject = models.Chinese
	default:
		subject = models.Other
	}

	// Convert options and knowledgePoints to JSON strings
	optionsJSON, _ := json.Marshal(req.Options)
	kpJSON, _ := json.Marshal(req.KnowledgePoints)

	question := &models.Question{
		ID:                uuid.New().String(),
		Image:             req.Image,
		CroppedDiagram:    req.CroppedDiagram,
		Content:           req.Content,
		Options:           jsonStringPtr(string(optionsJSON)),
		DiagramDescription: req.DiagramDescription,
		Answer:            req.Answer,
		Analysis:          req.Analysis,
		LearningGuide:     req.LearningGuide,
		KnowledgePoints:   jsonStringPtr(string(kpJSON)),
		Subject:           subject,
		Difficulty:        req.Difficulty,
		CreatedAt:         time.Now(),
	}

	if err := h.DB.CreateQuestion(question); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create question"})
		return
	}

	c.JSON(http.StatusCreated, question)
}

// UpdateQuestion updates an existing question
func (h *QuestionHandler) UpdateQuestion(c *gin.Context) {
	id := c.Param("id")
	
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Handle subject conversion if present
	if subjectStr, ok := req["subject"].(string); ok {
		var subject models.Subject
		switch subjectStr {
		case "数学":
			subject = models.Math
		case "物理":
			subject = models.Physics
		case "化学":
			subject = models.Chemistry
		case "生物":
			subject = models.Biology
		case "英语":
			subject = models.English
		case "语文":
			subject = models.Chinese
		default:
			subject = models.Other
		}
		req["subject"] = subject
	}

	// Handle options conversion if present
	if options, ok := req["options"].([]interface{}); ok {
		optionStrings := make([]string, len(options))
		for i, opt := range options {
			optionStrings[i] = opt.(string)
		}
		optionsJSON, _ := json.Marshal(optionStrings)
		req["options"] = string(optionsJSON)
	}

	// Handle knowledgePoints conversion if present
	if kps, ok := req["knowledgePoints"].([]interface{}); ok {
		kpStrings := make([]string, len(kps))
		for i, kp := range kps {
			kpStrings[i] = kp.(string)
		}
		kpJSON, _ := json.Marshal(kpStrings)
		req["knowledgePoints"] = string(kpJSON)
	}

	if err := h.DB.UpdateQuestion(id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update question"})
		return
	}

	question, err := h.DB.GetQuestionByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated question"})
		return
	}

	c.JSON(http.StatusOK, question)
}

// DeleteQuestion soft deletes a question
func (h *QuestionHandler) DeleteQuestion(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.DB.DeleteQuestion(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete question"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Question deleted successfully"})
}

// RestoreQuestion restores a question from trash
func (h *QuestionHandler) RestoreQuestion(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.DB.RestoreQuestion(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore question"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Question restored successfully"})
}

// HardDeleteQuestion permanently deletes a question
func (h *QuestionHandler) HardDeleteQuestion(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.DB.HardDeleteQuestion(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to permanently delete question"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Question permanently deleted"})
}

// Helper function to convert string to *string
func jsonStringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Helper function to convert *string to []string
func jsonStringToSlice(s *string) []string {
	if s == nil {
		return []string{}
	}
	var result []string
	if err := json.Unmarshal([]byte(*s), &result); err != nil {
		return []string{}
	}
	return result
}

// Helper function to convert *string to []string for options
func jsonStringToOptionsSlice(s *string) []string {
	if s == nil {
		return []string{}
	}
	var result []string
	if err := json.Unmarshal([]byte(*s), &result); err != nil {
		return []string{}
	}
	return result
}

// Helper function to convert []string to JSON string
func stringSliceToJSONString(slice []string) *string {
	if len(slice) == 0 {
		return nil
	}
	jsonBytes, _ := json.Marshal(slice)
	result := string(jsonBytes)
	return &result
}