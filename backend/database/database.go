package database

import (
	"errors"
	"os"
	"path/filepath"
	"time"

	"E-Bu-backend/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type DB struct {
	*gorm.DB
}

func NewDB(dsn string) (*DB, error) {
	// Ensure the directory exists
	dir := filepath.Dir(dsn)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Migrate the schema
	err = db.AutoMigrate(&models.Question{}, &models.AIConfig{})
	if err != nil {
		return nil, err
	}

	// Initialize default AI config if not exists
	var aiConfig models.AIConfig
	if err := db.First(&aiConfig).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			aiConfig = models.AIConfig{
				Type: models.Gemini,
			}
			db.Create(&aiConfig)
		}
	}

	return &DB{db}, nil
}

// Question operations
func (db *DB) GetQuestions() ([]models.Question, error) {
	var questions []models.Question
	result := db.Where("deleted_at IS NULL").Order("created_at DESC").Find(&questions)
	return questions, result.Error
}

func (db *DB) GetTrash() ([]models.Question, error) {
	var questions []models.Question
	result := db.Where("deleted_at IS NOT NULL").Order("deleted_at DESC").Find(&questions)
	return questions, result.Error
}

func (db *DB) GetQuestionByID(id string) (*models.Question, error) {
	var question models.Question
	result := db.First(&question, "id = ?", id)
	return &question, result.Error
}

func (db *DB) CreateQuestion(question *models.Question) error {
	return db.Create(question).Error
}

func (db *DB) UpdateQuestion(id string, updates map[string]interface{}) error {
	result := db.Model(&models.Question{}).Where("id = ?", id).Updates(updates)
	return result.Error
}

func (db *DB) DeleteQuestion(id string) error {
	// Soft delete - set deleted_at timestamp
	return db.Model(&models.Question{}).Where("id = ?", id).Update("deleted_at", time.Now()).Error
}

func (db *DB) RestoreQuestion(id string) error {
	return db.Model(&models.Question{}).Where("id = ?", id).Update("deleted_at", nil).Error
}

func (db *DB) HardDeleteQuestion(id string) error {
	return db.Delete(&models.Question{}, "id = ?", id).Error
}

// AI Config operations
func (db *DB) GetAIConfig() (*models.AIConfig, error) {
	var config models.AIConfig
	result := db.First(&config)
	return &config, result.Error
}

func (db *DB) SaveAIConfig(config *models.AIConfig) error {
	var existingConfig models.AIConfig
	result := db.First(&existingConfig)
	if result.Error != nil {
		// If no config exists, create new one
		return db.Create(config).Error
	}
	// Update existing config
	return db.Model(&existingConfig).Updates(config).Error
}