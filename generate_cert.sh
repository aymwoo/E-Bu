#!/bin/bash

# Create certs directory
mkdir -p certs

# Generate self-signed certificate if it doesn't exist
if [ ! -f certs/server.key ]; then
    echo "Generating self-signed certificate..."
    openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
    -keyout certs/server.key -out certs/server.crt \
    -subj "/C=CN/ST=State/L=Locality/O=Org/CN=localhost"
    echo "Certificate generated in certs/"
else
    echo "Certificate already exists in certs/"
fi
