package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"E-Bu-backend/database"
	"E-Bu-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newQuestionTestRouter(t *testing.T) (*gin.Engine, *database.DB) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	dsn := filepath.Join(t.TempDir(), "ebu_question_test.db")
	db, err := database.NewDB(dsn)
	require.NoError(t, err, "NewDB failed")

	r := gin.New()
	qh := NewQuestionHandler(db)

	api := r.Group("/api")
	api.POST("/questions", qh.CreateQuestion)

	return r, db
}

func TestCreateQuestion_HappyPath(t *testing.T) {
	r, db := newQuestionTestRouter(t)

	img := "base64encodedimage"
	cropped := "base64encodedcropped"
	desc := "a diagram of a triangle"
	ans := "C"

	payload := map[string]interface{}{
		"image":              &img,
		"croppedDiagram":     &cropped,
		"content":            "What is 1+1?",
		"options":            []string{"A. 1", "B. 2", "C. 3", "D. 4"},
		"diagramDescription": &desc,
		"answer":             &ans,
		"analysis":           "1+1 is 2 because math.",
		"learningGuide":      "Study basic addition.",
		"knowledgePoints":    []string{"Addition", "Basic Math"},
		"subject":            "数学",
		"difficulty":         3,
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/questions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp models.Question
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)

	assert.NotEmpty(t, resp.ID)
	assert.Equal(t, "What is 1+1?", resp.Content)
	assert.Equal(t, "1+1 is 2 because math.", resp.Analysis)
	assert.Equal(t, "Study basic addition.", resp.LearningGuide)
	assert.Equal(t, models.Math, resp.Subject)
	assert.Equal(t, 3, resp.Difficulty)

	if assert.NotNil(t, resp.Image) {
		assert.Equal(t, img, *resp.Image)
	}
	if assert.NotNil(t, resp.CroppedDiagram) {
		assert.Equal(t, cropped, *resp.CroppedDiagram)
	}
	if assert.NotNil(t, resp.DiagramDescription) {
		assert.Equal(t, desc, *resp.DiagramDescription)
	}
	if assert.NotNil(t, resp.Answer) {
		assert.Equal(t, ans, *resp.Answer)
	}

	if assert.NotNil(t, resp.Options) {
		var opts []string
		err = json.Unmarshal([]byte(*resp.Options), &opts)
		require.NoError(t, err)
		assert.Equal(t, []string{"A. 1", "B. 2", "C. 3", "D. 4"}, opts)
	}

	if assert.NotNil(t, resp.KnowledgePoints) {
		var kps []string
		err = json.Unmarshal([]byte(*resp.KnowledgePoints), &kps)
		require.NoError(t, err)
		assert.Equal(t, []string{"Addition", "Basic Math"}, kps)
	}

	// Verify it's actually in the database
	dbQuestion, err := db.GetQuestionByID(resp.ID)
	require.NoError(t, err)
	assert.Equal(t, resp.ID, dbQuestion.ID)
	assert.Equal(t, "What is 1+1?", dbQuestion.Content)
}

func TestCreateQuestion_MissingRequired(t *testing.T) {
	r, _ := newQuestionTestRouter(t)

	// Missing "content"
	payload := map[string]interface{}{
		"analysis":        "Missing content",
		"learningGuide":   "Test",
		"knowledgePoints": []string{"Test"},
		"subject":         "物理",
		"difficulty":      2,
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/questions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateQuestion_InvalidDifficulty(t *testing.T) {
	r, _ := newQuestionTestRouter(t)

	payload := map[string]interface{}{
		"content":         "Valid content",
		"analysis":        "Valid analysis",
		"learningGuide":   "Test",
		"knowledgePoints": []string{"Test"},
		"subject":         "物理",
		"difficulty":      6, // Invalid, max is 5
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/questions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateQuestion_InvalidJSON(t *testing.T) {
	r, _ := newQuestionTestRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/api/questions", bytes.NewReader([]byte("{invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateQuestion_SubjectEnumMapping(t *testing.T) {
	r, _ := newQuestionTestRouter(t)

	testCases := []struct {
		inputString   string
		expectedModel models.Subject
	}{
		{"数学", models.Math},
		{"物理", models.Physics},
		{"化学", models.Chemistry},
		{"生物", models.Biology},
		{"英语", models.English},
		{"语文", models.Chinese},
		{"未知", models.Other},
	}

	for _, tc := range testCases {
		t.Run(string(tc.expectedModel), func(t *testing.T) {
			payload := map[string]interface{}{
				"content":         "Content",
				"analysis":        "Analysis",
				"learningGuide":   "Guide",
				"knowledgePoints": []string{"Point"},
				"subject":         tc.inputString,
				"difficulty":      1,
			}

			body, err := json.Marshal(payload)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPost, "/api/questions", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			assert.Equal(t, http.StatusCreated, w.Code)

			var resp models.Question
			err = json.Unmarshal(w.Body.Bytes(), &resp)
			require.NoError(t, err)

			assert.Equal(t, tc.expectedModel, resp.Subject)
		})
	}
}
