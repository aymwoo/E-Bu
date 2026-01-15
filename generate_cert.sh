#!/bin/bash

# Script to generate self-signed SSL certificates for Nginx

set -e

# Create certs directory if it doesn't exist
mkdir -p certs

# Check if openssl is installed
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is not installed."
    exit 1
fi

echo "Generating self-signed certificate..."

# Generate key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/nginx.key \
  -out certs/nginx.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"

echo "Certificate generation complete."
echo "Key: certs/nginx.key"
echo "Cert: certs/nginx.crt"
