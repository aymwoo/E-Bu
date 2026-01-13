#!/bin/bash
mkdir -p certs

if [ -f "certs/server.key" ] && [ -f "certs/server.crt" ]; then
    echo "Certificates already exist in certs/"
    exit 0
fi

echo "Generating self-signed certificates..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key \
  -out certs/server.crt \
  -subj "/C=CN/ST=State/L=City/O=E-Bu/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Certificates generated in certs/"
