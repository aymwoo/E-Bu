package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"E-Bu-backend/database"

	"github.com/gin-gonic/gin"
)

type migrationsStatusResponse struct {
	DBPath       string `json:"dbPath"`
	Current      int    `json:"current"`
	Latest       int    `json:"latest"`
	PendingCount int    `json:"pendingCount"`
}

type migrateResponse struct {
	Count int `json:"count"`
}

func newTestRouter(t *testing.T) (*gin.Engine, string) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	dsn := filepath.Join(t.TempDir(), "ebu.db")
	db, err := database.NewDB(dsn)
	if err != nil {
		t.Fatalf("NewDB failed: %v", err)
	}

	r := gin.New()
	mh := NewMigrationHandler(db, dsn)
	api := r.Group("/api")
	api.GET("/db/migrations", mh.GetMigrations)
	api.POST("/db/migrate", mh.ApplyMigrations)

	return r, dsn
}

func TestMigrationEndpoints(t *testing.T) {
	r, dsn := newTestRouter(t)

	// First fetch status
	req := httptest.NewRequest(http.MethodGet, "/api/db/migrations", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/db/migrations = %d, body=%s", w.Code, w.Body.String())
	}

	var status migrationsStatusResponse
	if err := json.Unmarshal(w.Body.Bytes(), &status); err != nil {
		t.Fatalf("unmarshal status failed: %v", err)
	}
	if status.DBPath != dsn {
		t.Fatalf("expected dbPath %q, got %q", dsn, status.DBPath)
	}
	if status.Latest == 0 {
		t.Fatalf("expected latest > 0")
	}

	// Apply migrations
	req2 := httptest.NewRequest(http.MethodPost, "/api/db/migrate", nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("POST /api/db/migrate = %d, body=%s", w2.Code, w2.Body.String())
	}

	var migrate migrateResponse
	if err := json.Unmarshal(w2.Body.Bytes(), &migrate); err != nil {
		t.Fatalf("unmarshal migrate response failed: %v", err)
	}
	if migrate.Count < 0 {
		t.Fatalf("unexpected migrate count: %d", migrate.Count)
	}
}
