@echo off
setlocal

echo === E-Bu Local Server Startup (Windows) ===

REM Check for Go
where go >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Go is not installed. Please install Go (https://go.dev/).
    pause
    exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed. Please install Node.js.
    pause
    exit /b 1
)

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

set DB_PATH=..\data\ebu.db
set STATIC_DIR=..\dist
set PORT=8080
set GIN_MODE=release

echo Server starting at http://localhost:8080
echo Press Ctrl+C to stop.

go run main.go

endlocal
