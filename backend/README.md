# E-Bu Backend

This is the Go backend for the E-Bu application, providing API endpoints for managing questions, AI configuration, and data backup/export functionality.

## Features

- RESTful API for question management (CRUD operations)
- Soft delete and trash functionality
- AI configuration management
- Data backup and import/export
- SQLite database with GORM ORM
- CORS support for frontend integration

## API Endpoints

### Questions
- `GET /api/questions` - Get all non-deleted questions
- `GET /api/trash` - Get all deleted questions
- `POST /api/questions` - Create a new question
- `PUT /api/questions/:id` - Update a question
- `DELETE /api/questions/:id` - Soft delete a question
- `PATCH /api/questions/:id/restore` - Restore a question from trash
- `DELETE /api/questions/:id/hard` - Permanently delete a question

### AI Configuration
- `GET /api/config` - Get AI configuration
- `PUT /api/config` - Save AI configuration
- `POST /api/analyze` - Analyze an image with AI (placeholder implementation)

### Backup/Export
- `GET /api/export` - Export all data as JSON
- `POST /api/import` - Import data from JSON

## Setup

1. Install Go 1.21 or later
2. Navigate to the backend directory: `cd backend`
3. Install dependencies: `go mod tidy`
4. Run the server: `go run main.go`

The server will start on port 8080 by default. You can change the port by setting the PORT environment variable.

## Database

The backend uses SQLite as the database, which will create a `E-Bu.db` file in the project directory. The database schema is automatically migrated on startup.

## Frontend Integration

The backend is designed to work with the React frontend. It includes CORS headers to allow requests from the frontend.

## Configuration

- Port: Set with `PORT` environment variable (default: 8080)
- Static files directory: Set with `STATIC_DIR` environment variable (default: ../dist)