# Configuration Guide

Complete reference for all configuration options.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Server Configuration](#server-configuration)
- [API Authentication](#api-authentication)
- [Database Configuration](#database-configuration)
- [Redis Configuration](#redis-configuration)
- [Webhook Configuration](#webhook-configuration)
- [Rate Limiting](#rate-limiting)
- [WhatsApp Features](#whatsapp-features)
- [Logging Configuration](#logging-configuration)
- [Security Settings](#security-settings)

## Environment Variables

All configuration is managed through environment variables in the `.env` file.

### Complete .env Template

```env
# ===================
# Server Configuration
# ===================
PORT=3000
NODE_ENV=production

# ===================
# API Authentication
# ===================
API_KEY=your-secret-api-key-change-this

# ===================
# Webhook Configuration
# ===================
WEBHOOK_URL=https://your-webhook-endpoint.com/webhook
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=5000

# ===================
# Session Storage
# ===================
SESSION_PATH=/app/sessions

# ===================
# Database Configuration
# ===================
MONGODB_URI=mongodb://mongodb:27017/whatsapp-api

# ===================
# Redis Configuration
# ===================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# ===================
# Rate Limiting
# ===================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ===================
# CORS Configuration
# ===================
CORS_ORIGIN=*

# ===================
# WhatsApp Features
# ===================
ALWAYS_ONLINE=true

# ===================
# Logging
# ===================
LOG_LEVEL=info
LOG_DIR=/app/logs

# ===================
# Puppeteer Configuration
# ===================
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

## Server Configuration

### PORT

The port on which the API server will listen.

- **Type**: Integer
- **Default**: `3000`
- **Example**: `PORT=8080`

```env
PORT=3000
```

### NODE_ENV

The environment mode for the application.

- **Type**: String
- **Default**: `production`
- **Options**: `development`, `production`, `test`
- **Example**: `NODE_ENV=production`

```env
NODE_ENV=production
```

**Effects**:
- `production`: Optimized performance, minimal logging
- `development`: Verbose logging, detailed errors
- `test`: Testing-specific configuration

## API Authentication

### API_KEY

Secret key required for all API requests.

- **Type**: String
- **Required**: Yes
- **Security**: Use a strong, random string
- **Example**: `API_KEY=sk_live_51H8xKj2eZvKYlo2C...`

```env
API_KEY=your-secret-api-key-change-this
```

**Generate a secure API key**:
```bash
# Linux/macOS
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Usage in requests**:
```bash
# Using X-API-Key header
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/info

# Using Authorization Bearer
curl -H "Authorization: Bearer your-api-key" http://localhost:3000/api/info
```

## Database Configuration

### MONGODB_URI

MongoDB connection string.

- **Type**: String
- **Required**: Yes
- **Format**: `mongodb://[username:password@]host[:port]/database[?options]`

```env
# Docker deployment (default)
MONGODB_URI=mongodb://mongodb:27017/whatsapp-api

# Local installation
MONGODB_URI=mongodb://localhost:27017/whatsapp-api

# With authentication
MONGODB_URI=mongodb://user:password@mongodb:27017/whatsapp-api?authSource=admin

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/whatsapp-api

# Replica set
MONGODB_URI=mongodb://host1:27017,host2:27017,host3:27017/whatsapp-api?replicaSet=rs0
```

**Connection Options**:
```env
# With connection pool
MONGODB_URI=mongodb://mongodb:27017/whatsapp-api?maxPoolSize=50&minPoolSize=10

# With SSL
MONGODB_URI=mongodb://mongodb:27017/whatsapp-api?ssl=true

# With timeouts
MONGODB_URI=mongodb://mongodb:27017/whatsapp-api?connectTimeoutMS=10000&socketTimeoutMS=45000
```

## Redis Configuration

### REDIS_HOST

Redis server hostname.

- **Type**: String
- **Default**: `localhost`

```env
# Docker deployment
REDIS_HOST=redis

# Local installation
REDIS_HOST=localhost

# Remote server
REDIS_HOST=redis.example.com
```

### REDIS_PORT

Redis server port.

- **Type**: Integer
- **Default**: `6379`

```env
REDIS_PORT=6379
```

### REDIS_PASSWORD

Redis authentication password.

- **Type**: String
- **Default**: Empty (no authentication)

```env
# No password
REDIS_PASSWORD=

# With password
REDIS_PASSWORD=your-redis-password
```

**Redis Connection String** (alternative format):
```env
REDIS_URL=redis://user:password@redis:6379
```

## Webhook Configuration

### WEBHOOK_URL

URL endpoint to receive webhook events.

- **Type**: String (URL)
- **Optional**: Yes
- **Recommendation**: Use HTTPS in production

```env
# HTTPS webhook (recommended)
WEBHOOK_URL=https://api.example.com/webhooks/whatsapp

# HTTP webhook (development only)
WEBHOOK_URL=http://localhost:4000/webhook

# No webhook
WEBHOOK_URL=
```

### WEBHOOK_RETRY_ATTEMPTS

Number of retry attempts for failed webhook deliveries.

- **Type**: Integer
- **Default**: `3`
- **Range**: 0-10

```env
WEBHOOK_RETRY_ATTEMPTS=3
```

### WEBHOOK_RETRY_DELAY

Delay in milliseconds between webhook retry attempts.

- **Type**: Integer (milliseconds)
- **Default**: `5000` (5 seconds)

```env
WEBHOOK_RETRY_DELAY=5000
```

**Retry Strategy**:
- Attempt 1: Immediate
- Attempt 2: After 5 seconds
- Attempt 3: After 10 seconds (exponential backoff)

## Rate Limiting

### RATE_LIMIT_WINDOW_MS

Time window for rate limiting in milliseconds.

- **Type**: Integer (milliseconds)
- **Default**: `60000` (1 minute)

```env
# 1 minute window
RATE_LIMIT_WINDOW_MS=60000

# 5 minute window
RATE_LIMIT_WINDOW_MS=300000

# 1 hour window
RATE_LIMIT_WINDOW_MS=3600000
```

### RATE_LIMIT_MAX_REQUESTS

Maximum number of requests allowed per window.

- **Type**: Integer
- **Default**: `100`

```env
# Conservative (100 req/min)
RATE_LIMIT_MAX_REQUESTS=100

# Moderate (500 req/min)
RATE_LIMIT_MAX_REQUESTS=500

# Liberal (1000 req/min)
RATE_LIMIT_MAX_REQUESTS=1000
```

**Rate Limit Response**:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

## WhatsApp Features

### ALWAYS_ONLINE

Keep WhatsApp presence status always online.

- **Type**: Boolean
- **Default**: `false`
- **Options**: `true`, `false`

```env
# Always appear online
ALWAYS_ONLINE=true

# Normal presence behavior
ALWAYS_ONLINE=false
```

### SESSION_PATH

Directory path for storing WhatsApp session data.

- **Type**: String (path)
- **Default**: `./sessions`

```env
# Docker deployment
SESSION_PATH=/app/sessions

# Local installation
SESSION_PATH=./sessions

# Custom path
SESSION_PATH=/var/lib/whatsapp/sessions
```

**Note**: This directory must be persistent (mounted as volume in Docker).

## Logging Configuration

### LOG_LEVEL

Application logging verbosity.

- **Type**: String
- **Default**: `info`
- **Options**: `error`, `warn`, `info`, `debug`, `verbose`

```env
# Production (recommended)
LOG_LEVEL=info

# Development
LOG_LEVEL=debug

# Errors only
LOG_LEVEL=error
```

**Log Levels Explained**:
- `error`: Only errors
- `warn`: Warnings and errors
- `info`: General information, warnings, and errors
- `debug`: Detailed debugging information
- `verbose`: Very detailed logs (performance impact)

### LOG_DIR

Directory for storing log files.

- **Type**: String (path)
- **Default**: `./logs`

```env
# Docker deployment
LOG_DIR=/app/logs

# Local installation
LOG_DIR=./logs

# Custom path
LOG_DIR=/var/log/whatsapp-api
```

**Log Files**:
- `combined-YYYY-MM-DD.log`: All logs
- `error-YYYY-MM-DD.log`: Errors only
- Automatic daily rotation
- 14-day retention

## Security Settings

### CORS_ORIGIN

Allowed origins for Cross-Origin Resource Sharing.

- **Type**: String
- **Default**: `*` (allow all)

```env
# Allow all origins (development only)
CORS_ORIGIN=*

# Single origin
CORS_ORIGIN=https://app.example.com

# Multiple origins (comma-separated)
CORS_ORIGIN=https://app.example.com,https://dashboard.example.com

# Regex pattern
CORS_ORIGIN=/\.example\.com$/
```

### PUPPETEER_EXECUTABLE_PATH

Path to Chromium/Chrome executable.

- **Type**: String (path)
- **Default**: System-dependent

```env
# Docker Alpine Linux
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Ubuntu/Debian
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# macOS
PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Windows
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

## Configuration Best Practices

### Production Checklist

- [ ] Change default `API_KEY` to strong random string
- [ ] Use `HTTPS` for `WEBHOOK_URL`
- [ ] Set `NODE_ENV=production`
- [ ] Configure appropriate `RATE_LIMIT_MAX_REQUESTS`
- [ ] Restrict `CORS_ORIGIN` to specific domains
- [ ] Set `LOG_LEVEL=info` or `warn`
- [ ] Use strong MongoDB authentication
- [ ] Enable Redis password authentication
- [ ] Configure SSL/TLS for external connections
- [ ] Set up log rotation and monitoring
- [ ] Backup session data regularly

### Security Recommendations

```env
# Strong API key (32+ characters)
API_KEY=$(openssl rand -hex 32)

# Restricted CORS
CORS_ORIGIN=https://yourdomain.com

# Rate limiting (adjust based on needs)
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Secure database connection
MONGODB_URI=mongodb://user:password@mongodb:27017/whatsapp-api?authSource=admin&ssl=true

# Redis authentication
REDIS_PASSWORD=strong-redis-password

# Production logging
LOG_LEVEL=info
```

### Development Configuration

```env
NODE_ENV=development
API_KEY=dev-api-key
LOG_LEVEL=debug
CORS_ORIGIN=*
RATE_LIMIT_MAX_REQUESTS=1000
WEBHOOK_URL=http://localhost:4000/webhook
```

## Environment-Specific Files

Create multiple environment files:

- `.env` - Main configuration (default)
- `.env.development` - Development settings
- `.env.production` - Production settings
- `.env.test` - Testing configuration

Load specific environment:
```bash
NODE_ENV=development node index.js
```

## Validating Configuration

Check your configuration:

```bash
# Test health endpoint
curl http://localhost:3000/health

# View loaded configuration (in logs)
docker-compose logs whatsapp-api | grep "Configuration loaded"

# Test API authentication
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/info
```

---

[← Back to Home](Home.md) | [Next: API Reference →](API-Reference.md)
