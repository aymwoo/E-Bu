package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"log"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"time"
)

// CheckAndGenerateCerts checks if the cert and key exist, if not generates them.
func CheckAndGenerateCerts(certFile, keyFile string) error {
	// Check if files exist
	if _, err := os.Stat(certFile); err == nil {
		if _, err := os.Stat(keyFile); err == nil {
			log.Println("TLS certificates found.")
			return nil
		}
	}

	log.Println("Generating self-signed TLS certificates...")

	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(certFile), 0755); err != nil {
		return fmt.Errorf("failed to create cert directory: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(keyFile), 0755); err != nil {
		return fmt.Errorf("failed to create key directory: %v", err)
	}

	// Generate private key
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate private key: %v", err)
	}

	// Get local IPs
	var ipAddresses []net.IP
	if addrs, err := net.InterfaceAddrs(); err == nil {
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok {
				ipAddresses = append(ipAddresses, ipnet.IP)
			}
		}
	}
    // Add localhost IPs explicitly
	ipAddresses = append(ipAddresses, net.ParseIP("127.0.0.1"), net.ParseIP("::1"))

	// Create certificate template
	template := x509.Certificate{
		SerialNumber: big.NewInt(time.Now().UnixNano()), // Use time as serial number to avoid duplicates if regenerated
		Subject: pkix.Name{
			Organization: []string{"E-Bu Local Server"},
		},
		NotBefore: time.Now(),
		NotAfter:  time.Now().Add(365 * 24 * time.Hour),

		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IPAddresses:           ipAddresses,
		DNSNames:              []string{"localhost"},
	}

	// Create certificate
	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		return fmt.Errorf("failed to create certificate: %v", err)
	}

	// Save certificate
	certOut, err := os.Create(certFile)
	if err != nil {
		return fmt.Errorf("failed to open cert file for writing: %v", err)
	}
	defer certOut.Close()
	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes}); err != nil {
		return fmt.Errorf("failed to write data to cert file: %v", err)
	}

	// Save key
	keyOut, err := os.OpenFile(keyFile, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("failed to open key file for writing: %v", err)
	}
	defer keyOut.Close()
	privBytes := x509.MarshalPKCS1PrivateKey(priv)
	if err := pem.Encode(keyOut, &pem.Block{Type: "RSA PRIVATE KEY", Bytes: privBytes}); err != nil {
		return fmt.Errorf("failed to write data to key file: %v", err)
	}

	log.Printf("Successfully generated certificates at %s and %s", certFile, keyFile)
	return nil
}
