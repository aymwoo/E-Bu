//go:build ignore
// +build ignore

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"E-Bu-backend/models"

	"github.com/google/uuid"
)

func main() {
	baseURL := "http://localhost:8080/api"
	
	// Test creating a question
	fmt.Println("Testing question creation...")
	question := models.Question{
		ID:             uuid.New().String(),
		Content:        "If $x = 2$, what is $x^2 + 3x + 1$?",
		Analysis:       "Substituting $x = 2$: $2^2 + 3(2) + 1 = 4 + 6 + 1 = 11$",
		LearningGuide:  "Remember to substitute values and follow order of operations",
		KnowledgePoints: stringSliceToJSONString([]string{"Algebra", "Substitution"}),
		Subject:        models.Math,
		Difficulty:     2,
		CreatedAt:      time.Now(),
	}
	
	questionJSON, _ := json.Marshal(question)
	
	resp, err := http.Post(baseURL+"/questions", "application/json", bytes.NewBuffer(questionJSON))
	if err != nil {
		fmt.Printf("Error creating question: %v\n", err)
		return
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Failed to create question: %s\n", string(body))
		return
	}
	
	fmt.Println("Question created successfully")
	
	// Test getting questions
	fmt.Println("Testing question retrieval...")
	resp, err = http.Get(baseURL + "/questions")
	if err != nil {
		fmt.Printf("Error getting questions: %v\n", err)
		return
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Failed to get questions: %s\n", string(body))
		return
	}
	
	fmt.Println("Questions retrieved successfully")
	
	// Test getting AI config
	fmt.Println("Testing AI config retrieval...")
	resp, err = http.Get(baseURL + "/config")
	if err != nil {
		fmt.Printf("Error getting AI config: %v\n", err)
		return
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Failed to get AI config: %s\n", string(body))
		return
	}
	
	fmt.Println("AI config retrieved successfully")
	
	fmt.Println("All tests passed!")
}

// Helper function to convert []string to *string (JSON string)
func stringSliceToJSONString(slice []string) *string {
	if len(slice) == 0 {
		return nil
	}
	jsonBytes, _ := json.Marshal(slice)
	result := string(jsonBytes)
	return &result
}