package database

import (
	"path/filepath"
	"testing"

	"gorm.io/gorm"
)

func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := filepath.Join(t.TempDir(), "test.db")
	db, err := NewDB(dsn)
	if err != nil {
		t.Fatalf("NewDB failed: %v", err)
	}
	return db.DB
}

func TestApplyMigrationsToLatest_IsIdempotent(t *testing.T) {
	db := newTestDB(t)

	if _, err := ApplyMigrationsToLatest(db); err != nil {
		t.Fatalf("ApplyMigrationsToLatest first run failed: %v", err)
	}

	second, err := ApplyMigrationsToLatest(db)
	if err != nil {
		t.Fatalf("ApplyMigrationsToLatest second run failed: %v", err)
	}
	if len(second) != 0 {
		t.Fatalf("expected no migrations on second run, got %d", len(second))
	}
}

func TestGetMigrationStatus(t *testing.T) {
	db := newTestDB(t)

	status, err := GetMigrationStatus(db, "/tmp/dsn.db")
	if err != nil {
		t.Fatalf("GetMigrationStatus failed: %v", err)
	}
	if status.Latest == 0 {
		t.Fatalf("expected latest > 0")
	}
	if status.DBPath != "/tmp/dsn.db" {
		t.Fatalf("expected dbPath propagated")
	}
}
