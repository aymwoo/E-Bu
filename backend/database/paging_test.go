package database

import (
	"encoding/json"
	"strconv"
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

func TestGetQuestionsPagedFiltered_QueryMatches(t *testing.T) {
	db := newTestDB(t)
	api := &DB{db}

	q1 := &models.Question{
		ID:            "q1",
		Content:       "Apple banana",
		Analysis:      "Nothing here",
		LearningGuide:   "Study well",
		KnowledgePoints: stringPtr("[]"),
		Subject:         models.English,
		Difficulty:      1,
		CreatedAt:       time.Now(),
	}
	q2 := &models.Question{
		ID:              "q2",
		Content:         "Other fruit",
		Analysis:        "Contains apple seeds",
		LearningGuide:   "Eat healthy",
		KnowledgePoints: stringPtr("[]"),
		Subject:         models.English,
		Difficulty:      2,
		CreatedAt:       time.Now(),
	}
	q3 := &models.Question{
		ID:              "q3",
		Content:         "No match",
		Analysis:        "No match",
		LearningGuide:   "No match",
		KnowledgePoints: stringPtr("[]"),
		Subject:         models.English,
		Difficulty:      3,
		CreatedAt:       time.Now(),
	}

	for _, q := range []*models.Question{q1, q2, q3} {
		if err := api.CreateQuestion(q); err != nil {
			t.Fatalf("CreateQuestion: %v", err)
		}
	}

	paged, err := api.GetQuestionsPagedFiltered("", "apple", "", 1, 20)
	if err != nil {
		t.Fatalf("GetQuestionsPagedFiltered: %v", err)
	}
	if paged.Total != 2 {
		t.Fatalf("expected total=2, got %d", paged.Total)
	}

	// Check that we got q1 and q2
	foundQ1, foundQ2 := false, false
	for _, q := range paged.Items {
		if q.ID == "q1" {
			foundQ1 = true
		}
		if q.ID == "q2" {
			foundQ2 = true
		}
	}
	if !foundQ1 || !foundQ2 {
		t.Errorf("Expected to find q1 and q2, found: %v", paged.Items)
	}
}

func TestGetQuestionsPagedFiltered_SubjectMatches(t *testing.T) {
	db := newTestDB(t)
	api := &DB{db}

	q1 := &models.Question{ID: "q1", Content: "Math 1", Analysis: "A", LearningGuide: "L", KnowledgePoints: stringPtr("[]"), Subject: models.Math, Difficulty: 1, CreatedAt: time.Now()}
	q2 := &models.Question{ID: "q2", Content: "Physics 1", Analysis: "A", LearningGuide: "L", KnowledgePoints: stringPtr("[]"), Subject: models.Physics, Difficulty: 2, CreatedAt: time.Now()}
	q3 := &models.Question{ID: "q3", Content: "Math 2", Analysis: "A", LearningGuide: "L", KnowledgePoints: stringPtr("[]"), Subject: models.Math, Difficulty: 3, CreatedAt: time.Now()}

	for _, q := range []*models.Question{q1, q2, q3} {
		if err := api.CreateQuestion(q); err != nil {
			t.Fatalf("CreateQuestion: %v", err)
		}
	}

	paged, err := api.GetQuestionsPagedFiltered("", "", string(models.Math), 1, 20)
	if err != nil {
		t.Fatalf("GetQuestionsPagedFiltered: %v", err)
	}
	if paged.Total != 2 {
		t.Fatalf("expected total=2, got %d", paged.Total)
	}

	for _, q := range paged.Items {
		if q.Subject != models.Math {
			t.Errorf("Expected only Math subject, got: %s", q.Subject)
		}
	}
}

func TestGetQuestionsPagedFiltered_Pagination(t *testing.T) {
	db := newTestDB(t)
	api := &DB{db}

	for i := 1; i <= 25; i++ {
		q := &models.Question{
			ID:              "q" + strconv.Itoa(i), // Use readable dummy IDs
			Content:         "Content",
			Analysis:        "Analysis",
			LearningGuide:   "LearningGuide",
			KnowledgePoints: stringPtr("[]"),
			Subject:         models.Math,
			Difficulty:      1,
			CreatedAt:       time.Now().Add(time.Duration(i) * time.Minute), // Ascending creation time
		}
		if err := api.CreateQuestion(q); err != nil {
			t.Fatalf("CreateQuestion: %v", err)
		}
	}

	// Test default page size (should be 20 when passing <= 0)
	pagedDefault, err := api.GetQuestionsPagedFiltered("", "", "", -1, -1)
	if err != nil {
		t.Fatalf("GetQuestionsPagedFiltered: %v", err)
	}
	if pagedDefault.Page != 1 || pagedDefault.PageSize != 20 {
		t.Errorf("Expected default pagination 1/20, got %d/%d", pagedDefault.Page, pagedDefault.PageSize)
	}
	if len(pagedDefault.Items) != 20 {
		t.Errorf("Expected 20 items, got %d", len(pagedDefault.Items))
	}
	if pagedDefault.Total != 25 {
		t.Errorf("Expected total=25, got %d", pagedDefault.Total)
	}

	// Test page 2 with size 10
	pagedP2, err := api.GetQuestionsPagedFiltered("", "", "", 2, 10)
	if err != nil {
		t.Fatalf("GetQuestionsPagedFiltered: %v", err)
	}
	if len(pagedP2.Items) != 10 {
		t.Errorf("Expected 10 items, got %d", len(pagedP2.Items))
	}

	// Test page 3 with size 10 (should return remaining 5)
	pagedP3, err := api.GetQuestionsPagedFiltered("", "", "", 3, 10)
	if err != nil {
		t.Fatalf("GetQuestionsPagedFiltered: %v", err)
	}
	if len(pagedP3.Items) != 5 {
		t.Errorf("Expected 5 items, got %d", len(pagedP3.Items))
	}

	// Test max page size (should be 100 when passing > 100)
	pagedMax, err := api.GetQuestionsPagedFiltered("", "", "", 1, 1000)
	if err != nil {
		t.Fatalf("GetQuestionsPagedFiltered: %v", err)
	}
	if pagedMax.PageSize != 100 {
		t.Errorf("Expected page size 100, got %d", pagedMax.PageSize)
	}
}

func TestGetQuestionsPagedFiltered_DeletedIgnored(t *testing.T) {
	db := newTestDB(t)
	api := &DB{db}

	q1 := &models.Question{ID: "q1", Content: "Active", Analysis: "A", LearningGuide: "L", KnowledgePoints: stringPtr("[]"), Subject: models.Math, Difficulty: 1, CreatedAt: time.Now()}
	deletedTime := time.Now()
	q2 := &models.Question{ID: "q2", Content: "Deleted", Analysis: "A", LearningGuide: "L", KnowledgePoints: stringPtr("[]"), Subject: models.Math, Difficulty: 2, CreatedAt: time.Now(), DeletedAt: &deletedTime}

	for _, q := range []*models.Question{q1, q2} {
		if err := api.CreateQuestion(q); err != nil {
			t.Fatalf("CreateQuestion: %v", err)
		}
	}

	paged, err := api.GetQuestionsPagedFiltered("", "", "", 1, 20)
	if err != nil {
		t.Fatalf("GetQuestionsPagedFiltered: %v", err)
	}
	if paged.Total != 1 {
		t.Fatalf("expected total=1, got %d", paged.Total)
	}
	if paged.Items[0].ID != "q1" {
		t.Errorf("Expected only active question q1, got %s", paged.Items[0].ID)
	}
}

func stringPtr(s string) *string { return &s }
