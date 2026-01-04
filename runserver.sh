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

# Start Backend
echo -e "${GREEN}[2/2] Starting Backend Server...${NC}"
cd backend

# Set environment variables
export DB_PATH="../data/ebu.db"
export STATIC_DIR="../dist"
export PORT=8080
export GIN_MODE=release

echo "Server starting at http://localhost:8080"
echo "Press Ctrl+C to stop."

go run main.go
