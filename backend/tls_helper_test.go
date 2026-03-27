package main

import (
	"os"
	"testing"
)

func TestEnsureCert(t *testing.T) {
	certFile := "test_server.crt"
	keyFile := "test_server.key"

	// Cleanup before test
	os.Remove(certFile)
	os.Remove(keyFile)
	defer os.Remove(certFile)
	defer os.Remove(keyFile)

	// Test generation
	err := ensureCert(certFile, keyFile)
	if err != nil {
		t.Fatalf("ensureCert failed: %v", err)
	}

	// Verify files exist
	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		t.Errorf("Certificate file was not created")
	}
	if _, err := os.Stat(keyFile); os.IsNotExist(err) {
		t.Errorf("Key file was not created")
	}

	// Test idempotency (should not fail if called again)
	err = ensureCert(certFile, keyFile)
	if err != nil {
		t.Fatalf("ensureCert failed on second call: %v", err)
	}
}
