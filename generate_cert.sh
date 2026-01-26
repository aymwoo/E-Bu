#!/bin/bash
set -e

# Define certificate directory and files
CERT_DIR="certs"
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"

# Check for openssl
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is not installed. Please install it to generate certificates."
    exit 1
fi

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate certificate if it doesn't exist
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "Generating self-signed certificate for localhost..."
    openssl req -x509 -newkey rsa:4096 -keyout "$KEY_FILE" -out "$CERT_FILE" -days 365 -nodes -subj "/CN=localhost"
    echo "Certificate generated in $CERT_DIR"
else
    echo "Certificate already exists in $CERT_DIR"
fi
