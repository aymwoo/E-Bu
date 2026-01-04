@echo off
setlocal EnableDelayedExpansion

echo === E-Bu Local Server Startup (Windows) ===

REM Check for Go
where go >nul 2>nul
if errorlevel 1 (
    echo Error: Go is not installed. Please install Go ^(https://go.dev/^).
    pause
    exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if errorlevel 1 (
    echo Error: npm is not installed. Please install Node.js.
    pause
    exit /b 1
)

REM Set npm to use China mirror
echo Setting npm to use China mirror...
call npm config set registry https://registry.npmmirror.com

REM Frontend Build
echo [1/2] Checking Frontend...
if exist dist (
    echo Frontend build found. Skipping rebuild.
) else (
    echo Building frontend...
    call npm install
    call npm run build
)

REM Create data directory
if not exist data mkdir data

REM Start Backend
echo [2/2] Starting Backend Server...
cd backend

set "DB_PATH=..\data\ebu.db"
set "STATIC_DIR=..\dist"
set "PORT=8080"
set "GIN_MODE=release"
set "CGO_ENABLED=1"
set "GOPROXY=https://goproxy.cn,direct"

echo Downloading Go dependencies...
go mod download

echo Server starting at http://localhost:8080
echo Press Ctrl+C to stop.

go run main.go

endlocal
