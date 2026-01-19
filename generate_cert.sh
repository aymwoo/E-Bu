#!/bin/bash

# Certificate Generation Script
# Generates self-signed certificates for local development

set -e

GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check for OpenSSL
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is not installed."
    exit 1
fi

CERT_DIR="certs"
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"

mkdir -p "$CERT_DIR"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo -e "${GREEN}Certificates already exist in $CERT_DIR. Skipping generation.${NC}"
else
    echo "Generating self-signed certificates..."
    openssl req -x509 -newkey rsa:4096 -keyout "$KEY_FILE" -out "$CERT_FILE" -days 365 -nodes -subj "/CN=localhost"
    echo -e "${GREEN}Certificates generated successfully in $CERT_DIR.${NC}"
fi
