#!/bin/bash

# Create certs directory
mkdir -p certs

# Check for openssl
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is not installed. Cannot generate certificates."
    echo "Please install openssl or provide your own certificates in certs/ directory."
    exit 1
fi

# Generate certificates if they don't exist
if [ ! -f certs/server.key ] || [ ! -f certs/server.crt ]; then
    echo "Generating self-signed certificate..."
    openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=E-Bu/CN=localhost" \
        -keyout certs/server.key -out certs/server.crt
    echo "Certificate generated in certs/ directory."
else
    echo "Certificate already exists in certs/ directory."
fi
