#!/bin/bash

# Create certs directory
mkdir -p certs

# Generate self-signed certificate
# key: server.key
# cert: server.crt
# valid for 365 days
openssl req -newkey rsa:2048 \
            -nodes \
            -keyout certs/server.key \
            -x509 \
            -days 365 \
            -out certs/server.crt \
            -subj "/C=CN/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"

echo "Certificate generation complete."
echo "Files created:"
echo "  - certs/server.key"
echo "  - certs/server.crt"
