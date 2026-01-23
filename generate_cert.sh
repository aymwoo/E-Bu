#!/bin/bash

# Generate self-signed certificate for local development
mkdir -p certs

if [ ! -f certs/server.key ] || [ ! -f certs/server.crt ]; then
  echo "Generating self-signed certificate..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout certs/server.key -out certs/server.crt \
    -subj "/CN=localhost"
  echo "Certificate generated in certs/"
else
  echo "Certificate already exists in certs/"
fi
