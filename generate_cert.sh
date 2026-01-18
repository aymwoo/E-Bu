#!/bin/bash

# Create certs directory
mkdir -p certs

# Check if certificates already exist
if [ -f "certs/cert.pem" ] && [ -f "certs/key.pem" ]; then
    echo "Certificates already exist in certs/"
    exit 0
fi

echo "Generating self-signed certificate..."

# Generate self-signed certificate
# CN=localhost is important for local development
openssl req -x509 -newkey rsa:4096 \
    -keyout certs/key.pem \
    -out certs/cert.pem \
    -days 365 \
    -nodes \
    -subj "/CN=localhost"

echo "Certificate generated successfully."
