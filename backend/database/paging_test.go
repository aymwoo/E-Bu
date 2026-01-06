package database

import (
	"encoding/json"
	"testing"
	"time"

	"E-Bu-backend/models"
)

func TestGetQuestionsPagedFiltered_TagMatchesJSON(t *testing.T) {
	db := newTestDB(t)
	api := &DB{db}

	kps, err := json.Marshal([]string{"基本不等式", "其他"})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	q := &models.Question{
		ID:              "q1",
		Content:         "c",
		Analysis:        "a",
		LearningGuide:   "l",
		KnowledgePoints: stringPtr(string(kps)),
		Subject:         models.Math,
		Difficulty:      3,
		CreatedAt:       time.Now(),
	}
	if err := api.CreateQuestion(q); err != nil {
		t.Fatalf("CreateQuestion: %v", err)
	}

	paged, err := api.GetQuestionsPagedFiltered("基本不等式", "", "", 1, 20)
	if err != nil {
		t.Fatalf("GetQuestionsPagedFiltered: %v", err)
	}
	if paged.Total != 1 {
		t.Fatalf("expected total=1, got %d", paged.Total)
	}
	if len(paged.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(paged.Items))
	}
}

func stringPtr(s string) *string { return &s }
