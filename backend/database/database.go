package database

import (
	"errors"
	"os"
	"path/filepath"
	"time"

	"E-Bu-backend/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func ensureQuestionColumns(db *gorm.DB) error {
	// sqlite schema fix: older DBs may miss newly added columns.
	// Column names follow GORM's default naming strategy (snake_case).
	type columnSpec struct {
		Name string
		DDL  string
	}

	columns := []columnSpec{
		{
			Name: "learning_guide",
			DDL:  "ALTER TABLE questions ADD COLUMN learning_guide TEXT NOT NULL DEFAULT ''",
		},
	}

	for _, col := range columns {
		if db.Migrator().HasColumn(&models.Question{}, col.Name) {
			continue
		}
		if err := db.Exec(col.DDL).Error; err != nil {
			return err
		}
	}
	return nil
}

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

	// Backward-compatible migrations for older sqlite DBs.
	// Keep two layers:
	// 1) apply migrations to latest (tracked by schema_migrations)
	// 2) legacy safety net (ensureQuestionColumns) for very old DBs
	if _, err := ApplyMigrationsToLatest(db); err != nil {
		return nil, err
	}
	if err := ensureQuestionColumns(db); err != nil {
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

type PagedQuestions struct {
	Items    []models.Question `json:"items"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	PageSize int               `json:"pageSize"`
}

func (db *DB) GetQuestionsPaged(tag string, page int, pageSize int) (*PagedQuestions, error) {
	return db.GetQuestionsPagedFiltered(tag, "", "", page, pageSize)
}

func (db *DB) GetQuestionsPagedFiltered(tag string, query string, subject string, page int, pageSize int) (*PagedQuestions, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	base := db.Model(&models.Question{}).Where("deleted_at IS NULL")
	if tag != "" {
		// knowledge_points is stored as JSON string, so match by substring.
		// Stored form is like ["tag1","tag2"], so we search for "tag".
		base = base.Where("knowledge_points LIKE ?", "%\""+tag+"\"%")
	}
	if subject != "" {
		base = base.Where("subject = ?", subject)
	}
	if query != "" {
		like := "%" + query + "%"
		base = base.Where(
			"content LIKE ? OR analysis LIKE ? OR learning_guide LIKE ? OR diagram_description LIKE ? OR answer LIKE ? OR options LIKE ? OR knowledge_points LIKE ?",
			like,
			like,
			like,
			like,
			like,
			like,
			like,
		)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, err
	}

	var questions []models.Question
	offset := (page - 1) * pageSize
	if err := base.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&questions).Error; err != nil {
		return nil, err
	}

	return &PagedQuestions{Items: questions, Total: total, Page: page, PageSize: pageSize}, nil
}

func (db *DB) GetTrash() ([]models.Question, error) {
	var questions []models.Question
	result := db.Where("deleted_at IS NOT NULL").Order("deleted_at DESC").Find(&questions)
	return questions, result.Error
}

func (db *DB) GetTrashPaged(tag string, page int, pageSize int) (*PagedQuestions, error) {
	return db.GetTrashPagedFiltered(tag, "", "", page, pageSize)
}

func (db *DB) GetTrashPagedFiltered(tag string, query string, subject string, page int, pageSize int) (*PagedQuestions, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	base := db.Model(&models.Question{}).Where("deleted_at IS NOT NULL")
	if tag != "" {
		base = base.Where("knowledge_points LIKE ?", "%\""+tag+"\"%")
	}
	if subject != "" {
		base = base.Where("subject = ?", subject)
	}
	if query != "" {
		like := "%" + query + "%"
		base = base.Where(
			"content LIKE ? OR analysis LIKE ? OR learning_guide LIKE ? OR diagram_description LIKE ? OR answer LIKE ? OR options LIKE ? OR knowledge_points LIKE ?",
			like,
			like,
			like,
			like,
			like,
			like,
			like,
		)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, err
	}

	var questions []models.Question
	offset := (page - 1) * pageSize
	if err := base.Order("deleted_at DESC").Offset(offset).Limit(pageSize).Find(&questions).Error; err != nil {
		return nil, err
	}

	return &PagedQuestions{Items: questions, Total: total, Page: page, PageSize: pageSize}, nil
}

func (db *DB) GetQuestionByID(id string) (*models.Question, error) {
	var question models.Question
	result := db.First(&question, "id = ?", id)
	return &question, result.Error
}

func (db *DB) CreateQuestion(question *models.Question) error {
	return db.Create(question).Error
}

func (db *DB) UpdateQuestion(id string, updates *models.Question) error {
	// Use struct updates so GORM maps fields to snake_case columns.
	// Also only non-zero fields are applied unless explicitly selected.
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
