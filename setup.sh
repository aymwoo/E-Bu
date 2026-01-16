#!/bin/bash

# Setup script for E-Bu
# Generates certificates and prepares the environment.

set -e

GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== E-Bu Setup ===${NC}"

# Generate Certificates
if [ ! -f "certs/server.crt" ]; then
    echo "Generating self-signed certificates..."
    chmod +x certs/generate_cert.sh
    ./certs/generate_cert.sh
else
    echo "Certificates already exist."
fi

echo -e "${GREEN}Setup complete!${NC}"
echo "You can now run:"
echo "  ./runserver.sh        (for local development)"
echo "  docker compose up -d  (for Docker deployment)"
