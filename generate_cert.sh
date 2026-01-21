#!/bin/bash
set -e

mkdir -p certs

if [[ -f "certs/server.key" && -f "certs/server.crt" ]]; then
    echo "Certificates already exist in certs/"
else
    echo "Generating self-signed certificate..."
    openssl req -x509 -newkey rsa:4096 \
      -keyout certs/server.key \
      -out certs/server.crt \
      -days 365 \
      -nodes \
      -subj "/CN=localhost"
    echo "Certificate generated in certs/"
fi
