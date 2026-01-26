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

# Generate Certificates
echo -e "${GREEN}[1.5/2] Checking SSL Certificates...${NC}"
chmod +x generate_cert.sh
./generate_cert.sh

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
export TLS_CERT="../certs/server.crt"
export TLS_KEY="../certs/server.key"

echo "Downloading Go dependencies..."
go mod download

echo "Server starting at https://localhost:8080"
echo "Note: You will need to accept the self-signed certificate in your browser."
echo "Press Ctrl+C to stop."

go run main.go
