# Use the official Golang image to create a build artifact
FROM golang:1.21-alpine AS builder

# Install gcc for CGO support
RUN apk add --no-cache gcc musl-dev

# Set destination for COPY
WORKDIR /app

# Set proxy environment variables (if needed during build)
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV NO_PROXY=$NO_PROXY

# Configure Go to use proxy if provided
RUN if [ -n "$HTTP_PROXY" ]; then \
    go env -w GOPROXY=direct; \
    go env -w GOSUMDB=off; \
    else \
    go env -w GOPROXY=https://goproxy.io,direct; \
    fi

# Copy go mod files
COPY go.mod go.sum ./

# Download deps (cached by go.mod/go.sum layer)
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage: Use Alpine to run the application
FROM alpine:3.19

# Create a non-root user first
RUN adduser -D -s /bin/sh appuser

# Install ca-certificates for HTTPS requests (optional, since it may fail in some environments)
RUN apk add --no-cache ca-certificates || echo "Warning: Could not install ca-certificates"

# Set working directory
WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Change ownership of the working directory to appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]