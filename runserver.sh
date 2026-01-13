#!/bin/bash

# E-Bu Local Server Startup Script (Linux/macOS)
# Usage: ./runserver.sh [--rebuild]

set -e

GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== E-Bu Local Server Startup ===${NC}"

# Check for Go
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed. Please install Go (https://go.dev/)."
    exit 1
fi

# Check for Node/npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js."
    exit 1
fi

# Check for OpenSSL
if ! command -v openssl &> /dev/null; then
    echo "Warning: openssl is not installed. HTTPS certificates cannot be generated."
else
    # Generate certificates if they don't exist
    if [ ! -f "certs/server.key" ] || [ ! -f "certs/server.crt" ]; then
        echo "Generating SSL certificates..."
        ./generate_cert.sh
    fi
fi

# Frontend Build
echo -e "${GREEN}[1/2] Checking Frontend...${NC}"
if [ ! -d "dist" ] || [ "$1" == "--rebuild" ]; then
    echo "Building frontend..."
    npm install
    npm run build
else
    echo "Frontend build found. Skipping rebuild. Use --rebuild to force update."
fi

# Create data directory if not exists
mkdir -p data

# Start Backend
echo -e "${GREEN}[2/2] Starting Backend Server...${NC}"
cd backend

# Set environment variables
export DB_PATH="../data/ebu.db"
export STATIC_DIR="../dist"
export PORT=8080
export GIN_MODE=release
export CGO_ENABLED=1
export GOPROXY=https://goproxy.cn,direct

# Pass certificate paths if they exist
if [ -f "../certs/server.crt" ] && [ -f "../certs/server.key" ]; then
    export CERT_FILE="../certs/server.crt"
    export KEY_FILE="../certs/server.key"
    echo "SSL Certificates found. Enabling HTTPS."
fi

echo "Downloading Go dependencies..."
go mod download

echo "Server starting..."
if [ -n "$CERT_FILE" ]; then
    echo "HTTPS enabled at https://localhost:$PORT"
else
    echo "HTTP only at http://localhost:$PORT"
fi
echo "Press Ctrl+C to stop."

go run main.go
