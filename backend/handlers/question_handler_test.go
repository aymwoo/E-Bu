package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"E-Bu-backend/database"

	"github.com/gin-gonic/gin"
)

func newTestQuestionRouter(t *testing.T) (*gin.Engine, *database.DB) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	dsn := filepath.Join(t.TempDir(), "ebu_test.db")
	db, err := database.NewDB(dsn)
	if err != nil {
		t.Fatalf("NewDB failed: %v", err)
	}

	r := gin.New()
	qh := NewQuestionHandler(db)

	api := r.Group("/api")
	api.PUT("/questions/:id", qh.UpdateQuestion)

	return r, db
}

func TestUpdateQuestion_NotFound(t *testing.T) {
	r, _ := newTestQuestionRouter(t)

	// Update payload
	payload := map[string]interface{}{
		"content": "Updated content",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPut, "/api/questions/non-existent-id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status code %d, got %d", http.StatusNotFound, w.Code)
	}

	var response map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response body: %v", err)
	}

	if response["error"] != "Question not found" {
		t.Errorf("Expected error message 'Question not found', got '%s'", response["error"])
	}
}
