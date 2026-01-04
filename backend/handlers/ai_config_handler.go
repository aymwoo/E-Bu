package handlers

import (
	"net/http"

	"E-Bu-backend/database"
	"E-Bu-backend/models"

	"github.com/gin-gonic/gin"
)

type AIConfigHandler struct {
	DB *database.DB
}

func NewAIConfigHandler(db *database.DB) *AIConfigHandler {
	return &AIConfigHandler{DB: db}
}

// GetAIConfig retrieves the current AI configuration
func (h *AIConfigHandler) GetAIConfig(c *gin.Context) {
	config, err := h.DB.GetAIConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch AI config"})
		return
	}
	
	// If we have new comprehensive config data, return it
	if config.ConfigData != "" {
		c.JSON(http.StatusOK, gin.H{
			"configData": config.ConfigData,
		})
		return
	}

	// Fallback to old format
	publicConfig := gin.H{
		"type":         config.Type,
		"baseUrl":      config.BaseURL,
		"modelName":    config.ModelName,
		"systemPrompt": config.SystemPrompt,
		// Note: We are now returning keys if they exist in legacy format too? 
		// Actually, let's keep legacy behavior as is, but for new format we MUST return everything.
	}
	
	c.JSON(http.StatusOK, publicConfig)
}

// SaveAIConfig saves the AI configuration
func (h *AIConfigHandler) SaveAIConfig(c *gin.Context) {
	var req models.AIConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save the config
	if err := h.DB.SaveAIConfig(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save AI config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// AnalyzeImage handles image analysis with AI
func (h *AIConfigHandler) AnalyzeImage(c *gin.Context) {
	// This is a placeholder implementation
	// In a real implementation, you would call the AI service here
	// For now, we'll return a mock response

	var req struct {
		Image string `json:"image" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the AI config to determine which provider to use
	_, err := h.DB.GetAIConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get AI config"})
		return
	}

	// Mock response - in a real implementation, this would call the appropriate AI service
	// based on the provider type
	mockResponse := models.GeminiAnalysisResponse{
		Content:            "这是一个示例题目。如果 $x = 2$，求 $x^2 + 3x + 1$ 的值。",
		Options:            []string{"A. 9", "B. 10", "C. 11", "D. 12"},
		DiagramDescription: "",
		Answer:             "C. 11",
		Analysis:           "将 $x = 2$ 代入公式：$x^2 + 3x + 1 = 2^2 + 3(2) + 1 = 4 + 6 + 1 = 11$",
		LearningGuide:      "记住代数替换的基本步骤，先代入数值再按运算顺序计算。",
		KnowledgePoints:    []string{"代数表达式", "数值替换"},
		Subject:            models.Math,
		Difficulty:         2,
	}

	c.JSON(http.StatusOK, mockResponse)
}