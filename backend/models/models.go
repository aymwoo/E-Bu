package models

import (
	"time"
)

type Subject string

const (
	Math      Subject = "数学"
	Physics   Subject = "物理"
	Chemistry Subject = "化学"
	Biology   Subject = "生物"
	English   Subject = "英语"
	Chinese   Subject = "语文"
	Other     Subject = "其他"
)

type AIProviderType string

const (
	Gemini   AIProviderType = "GEMINI"
	Qwen     AIProviderType = "QWEN"
	Doubao   AIProviderType = "DOUBAO"
	OpenAI   AIProviderType = "OPENAI"
)

type AIConfig struct {
	ID           uint           `json:"-" gorm:"primaryKey"`
	Type         AIProviderType `json:"type" gorm:"default:GEMINI"`
	APIKey       string         `json:"apiKey,omitempty" gorm:"column:api_key"`
	BaseURL      string         `json:"baseUrl,omitempty" gorm:"column:base_url"`
	ModelName    string         `json:"modelName,omitempty" gorm:"column:model_name"`
	SystemPrompt string         `json:"systemPrompt,omitempty" gorm:"column:system_prompt"`
	ConfigData   string         `json:"configData,omitempty" gorm:"column:config_data;type:text"` // New: Stores full JSON config
}

type Question struct {
	ID                string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Image             *string   `json:"image,omitempty" gorm:"column:image"`
	CroppedDiagram    *string   `json:"croppedDiagram,omitempty" gorm:"column:cropped_diagram"`
	Content           string    `json:"content" gorm:"not null"`
	Options           *string   `json:"options,omitempty" gorm:"type:text"` // JSON string of options
	DiagramDescription *string  `json:"diagramDescription,omitempty" gorm:"column:diagram_description"`
	Answer            *string   `json:"answer,omitempty" gorm:"column:answer"`
	Analysis          string    `json:"analysis" gorm:"not null;type:text"`
	LearningGuide     string    `json:"learningGuide" gorm:"not null;type:text"`
	KnowledgePoints   *string   `json:"knowledgePoints" gorm:"not null;type:text"` // JSON string of knowledge points
	Subject           Subject   `json:"subject" gorm:"not null"`
	Difficulty        int       `json:"difficulty" gorm:"not null;default:1;check:difficulty >= 1 AND difficulty <= 5"`
	CreatedAt         time.Time `json:"createdAt" gorm:"column:created_at"`
	LastReviewedAt    *time.Time `json:"lastReviewedAt,omitempty" gorm:"column:last_reviewed_at"`
	DeletedAt         *time.Time `json:"deletedAt,omitempty" gorm:"column:deleted_at"`
}

// TableName overrides the table name
func (Question) TableName() string {
	return "questions"
}

type GeminiAnalysisResponse struct {
	Content           string    `json:"content"`
	Options           []string  `json:"options"`
	DiagramDescription string   `json:"diagramDescription"`
	Answer            string    `json:"answer"`
	Analysis          string    `json:"analysis"`
	LearningGuide     string    `json:"learningGuide"`
	KnowledgePoints   []string  `json:"knowledgePoints"`
	Subject           Subject   `json:"subject"`
	Difficulty        int       `json:"difficulty"`
}

type BackupData struct {
	Version    string     `json:"version"`
	ExportedAt int64      `json:"exportedAt"`
	Data       []Question `json:"data"`
}