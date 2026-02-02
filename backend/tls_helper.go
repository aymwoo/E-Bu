package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"log"
	"math/big"
	"net"
	"os"
	"time"
)

// EnsureCert checks if the certificate and key files exist.
// If not, it generates a self-signed ECDSA certificate.
func EnsureCert(certPath, keyPath string) error {
	// Check if both files exist
	if _, err := os.Stat(certPath); err == nil {
		if _, err := os.Stat(keyPath); err == nil {
			return nil // Both exist, nothing to do
		}
	}

	log.Println("Generating self-signed certificate...")

	// Generate ECDSA key
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return fmt.Errorf("failed to generate private key: %v", err)
	}

	// Prepare certificate template
	notBefore := time.Now()
	notAfter := notBefore.Add(365 * 24 * time.Hour) // 1 year validity

	serialNumberLimit := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
	if err != nil {
		return fmt.Errorf("failed to generate serial number: %v", err)
	}

	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			Organization: []string{"E-Bu Development"},
		},
		NotBefore: notBefore,
		NotAfter:  notAfter,

		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}

	// Add IP addresses
	template.IPAddresses = append(template.IPAddresses, net.ParseIP("127.0.0.1"), net.ParseIP("::1"))
	template.DNSNames = append(template.DNSNames, "localhost")

	// Detect local IP addresses
	addrs, err := net.InterfaceAddrs()
	if err == nil {
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok {
				if ip := ipnet.IP.To4(); ip != nil {
					template.IPAddresses = append(template.IPAddresses, ip)
				}
			}
		}
	}

	// Create certificate
	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		return fmt.Errorf("failed to create certificate: %v", err)
	}

	// Save certificate
	certOut, err := os.Create(certPath)
	if err != nil {
		return fmt.Errorf("failed to open %s for writing: %v", certPath, err)
	}
	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes}); err != nil {
		certOut.Close()
		return fmt.Errorf("failed to write data to %s: %v", certPath, err)
	}
	if err := certOut.Close(); err != nil {
		return fmt.Errorf("error closing %s: %v", certPath, err)
	}
	log.Printf("wrote %s\n", certPath)

	// Save private key
	keyOut, err := os.Create(keyPath)
	if err != nil {
		return fmt.Errorf("failed to open %s for writing: %v", keyPath, err)
	}
	privBytes, err := x509.MarshalECPrivateKey(priv)
	if err != nil {
		keyOut.Close()
		return fmt.Errorf("unable to marshal private key: %v", err)
	}
	if err := pem.Encode(keyOut, &pem.Block{Type: "EC PRIVATE KEY", Bytes: privBytes}); err != nil {
		keyOut.Close()
		return fmt.Errorf("failed to write data to %s: %v", keyPath, err)
	}
	if err := keyOut.Close(); err != nil {
		return fmt.Errorf("error closing %s: %v", keyPath, err)
	}
	log.Printf("wrote %s\n", keyPath)

	return nil
}
