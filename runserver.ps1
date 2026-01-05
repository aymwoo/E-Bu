# E-Bu Local Server Startup Script (Windows PowerShell)
# Usage: .\runserver.ps1 [--rebuild]
#   --rebuild: Force rebuild frontend

$ErrorActionPreference = 'Stop'

function Write-Info([string]$Message) {
  Write-Host $Message -ForegroundColor Green
}

Write-Info "=== E-Bu Local Server Startup ==="

# Parse args
$forceBuild = $false
foreach ($arg in $args) {
  if ($arg -eq '--rebuild') {
    $forceBuild = $true
  } elseif ($arg -eq '--help' -or $arg -eq '-h') {
    Write-Host "Usage: .\runserver.ps1 [--rebuild]"
    exit 0
  } else {
    Write-Host "Unknown argument: $arg"
    Write-Host "Usage: .\runserver.ps1 [--rebuild]"
    exit 1
  }
}

# Check for Go
if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
  Write-Host "Error: Go is not installed. Please install Go (https://go.dev/)." -ForegroundColor Red
  exit 1
}

# Check for Node/npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "Error: npm is not installed. Please install Node.js." -ForegroundColor Red
  exit 1
}

# Frontend build
Write-Info "[1/2] Checking Frontend..."
$distExists = Test-Path -Path (Join-Path $PSScriptRoot 'dist')
if (-not $distExists -or $forceBuild) {
  Write-Host "Building frontend..."
  npm install
  npm run build
} else {
  Write-Host "Frontend build found. Skipping rebuild. Use --rebuild to force update."
}

# Create data directory
$dataDir = Join-Path $PSScriptRoot 'data'
if (-not (Test-Path -Path $dataDir)) {
  New-Item -ItemType Directory -Path $dataDir | Out-Null
}

# Start backend
Write-Info "[2/2] Starting Backend Server..."
$backendDir = Join-Path $PSScriptRoot 'backend'

$env:DB_PATH = "..\data\ebu.db"
$env:STATIC_DIR = "..\dist"
$env:PORT = "8080"
$env:GIN_MODE = "release"
$env:CGO_ENABLED = "1"
$env:GOPROXY = "https://goproxy.cn,direct"

Write-Host "Downloading Go dependencies..."

Push-Location $backendDir
try {
  go mod download

  Write-Host "Server starting at http://localhost:8080"
  Write-Host "Press Ctrl+C to stop."

  go run main.go
} finally {
  Pop-Location
}
