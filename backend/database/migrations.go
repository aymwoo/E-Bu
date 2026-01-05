package database

import (
	"fmt"
	"sort"

	"gorm.io/gorm"
)

type Migration struct {
	Version int
	Name    string
	Up      func(db *gorm.DB) error
}

type AppliedMigration struct {
	Version int    `gorm:"primaryKey"`
	Name    string `gorm:"not null"`
}

func migrations() []Migration {
	return []Migration{
		{
			Version: 1,
			Name:    "ensure questions.learning_guide column",
			Up: func(db *gorm.DB) error {
				// Older DBs created before LearningGuide existed.
				// Keep the DDL idempotent via HasColumn check.
				if db.Migrator().HasColumn("questions", "learning_guide") {
					return nil
				}
				return db.Exec("ALTER TABLE questions ADD COLUMN learning_guide TEXT NOT NULL DEFAULT ''").Error
			},
		},
	}
}

func ensureMigrationsTable(db *gorm.DB) error {
	return db.AutoMigrate(&AppliedMigration{})
}

func LatestMigrationVersion() int {
	m := migrations()
	latest := 0
	for _, mig := range m {
		if mig.Version > latest {
			latest = mig.Version
		}
	}
	return latest
}

type MigrationStatus struct {
	DBPath       string             `json:"dbPath"`
	Applied      []AppliedMigration `json:"applied"`
	Pending      []MigrationInfo    `json:"pending"`
	Current      int                `json:"current"`
	Latest       int                `json:"latest"`
	PendingCount int                `json:"pendingCount"`
	AppliedCount int                `json:"appliedCount"`
}

type MigrationInfo struct {
	Version int    `json:"version"`
	Name    string `json:"name"`
}

func GetMigrationStatus(db *gorm.DB, dbPath string) (*MigrationStatus, error) {
	if err := ensureMigrationsTable(db); err != nil {
		return nil, err
	}

	var applied []AppliedMigration
	if err := db.Order("version ASC").Find(&applied).Error; err != nil {
		return nil, err
	}
	appliedSet := map[int]bool{}
	current := 0
	for _, a := range applied {
		appliedSet[a.Version] = true
		if a.Version > current {
			current = a.Version
		}
	}

	migs := migrations()
	sort.Slice(migs, func(i, j int) bool {
		return migs[i].Version < migs[j].Version
	})

	pending := make([]MigrationInfo, 0)
	for _, mig := range migs {
		if appliedSet[mig.Version] {
			continue
		}
		pending = append(pending, MigrationInfo{Version: mig.Version, Name: mig.Name})
	}

	latest := LatestMigrationVersion()
	return &MigrationStatus{
		DBPath:       dbPath,
		Applied:      applied,
		Pending:      pending,
		Current:      current,
		Latest:       latest,
		PendingCount: len(pending),
		AppliedCount: len(applied),
	}, nil
}

func ApplyMigrationsToLatest(db *gorm.DB) ([]MigrationInfo, error) {
	if err := ensureMigrationsTable(db); err != nil {
		return nil, err
	}

	// Ensure we still apply legacy one-off sqlite fixes for installations
	// that never created schema_migrations before.
	migs := migrations()
	sort.Slice(migs, func(i, j int) bool {
		return migs[i].Version < migs[j].Version
	})

	appliedSet := map[int]bool{}
	var applied []AppliedMigration
	if err := db.Find(&applied).Error; err != nil {
		return nil, err
	}
	for _, a := range applied {
		appliedSet[a.Version] = true
	}

	appliedNow := make([]MigrationInfo, 0)
	for _, mig := range migs {
		if appliedSet[mig.Version] {
			continue
		}

		err := db.Transaction(func(tx *gorm.DB) error {
			if err := mig.Up(tx); err != nil {
				return err
			}
			return tx.Create(&AppliedMigration{Version: mig.Version, Name: mig.Name}).Error
		})
		if err != nil {
			return appliedNow, fmt.Errorf("migration %d failed: %w", mig.Version, err)
		}

		appliedNow = append(appliedNow, MigrationInfo{Version: mig.Version, Name: mig.Name})
	}

	return appliedNow, nil
}
