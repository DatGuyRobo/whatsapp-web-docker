# Migration Guide

Guide for upgrading from v1.0 to v2.0.

## Overview

WhatsApp Web API v2.0 introduces several enhancements while maintaining backward compatibility with v1.0 endpoints.

## Breaking Changes

### 1. API Endpoint Prefix

All API endpoints now require the `/api/` prefix.

**v1.0**:
```bash
POST /send-message
GET /contacts
```

**v2.0**:
```bash
POST /api/send-message
GET /api/contacts
```

### 2. Database Required

v2.0 requires MongoDB for full functionality:
- Message persistence
- Contact management
- Webhook logging

Without database, some features will be unavailable.

### 3. Redis Required for Bulk Messaging

Bulk messaging feature requires Redis:
- Message queue management
- Job processing
- Retry handling

Can run without Redis, but bulk messaging won't work.

## New Dependencies

### Required Services

```yaml
# docker-compose.yml
services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
```

### Environment Variables

New required variables:

```env
# Database
MONGODB_URI=mongodb://mongodb:27017/whatsapp-api

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Webhooks (enhanced)
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_DIR=/app/logs
```

## Migration Steps

### Step 1: Backup Current Installation

```bash
# Backup session data
cp -r sessions sessions-backup-$(date +%Y%m%d)

# Backup logs (if any)
cp -r logs logs-backup-$(date +%Y%m%d)

# Export environment
cp .env .env.backup
```

### Step 2: Update Repository

```bash
# Pull latest changes
git pull origin main

# Or clone fresh
git clone https://github.com/DatGuyRobo/whatsapp-web-docker.git whatsapp-web-docker-v2
cd whatsapp-web-docker-v2
```

### Step 3: Update Configuration

```bash
# Copy your API key from old .env
cp ../whatsapp-web-docker-v1/.env.backup .env

# Add new required variables
cat >> .env << 'EOF'

# Database Configuration
MONGODB_URI=mongodb://mongodb:27017/whatsapp-api

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Webhook Configuration
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=5000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_DIR=/app/logs
EOF
```

### Step 4: Copy Session Data

```bash
# Copy sessions from v1.0
cp -r ../whatsapp-web-docker-v1/sessions ./sessions
```

### Step 5: Update Docker Compose

```bash
# Stop v1.0
cd ../whatsapp-web-docker-v1
docker-compose down

# Start v2.0
cd ../whatsapp-web-docker-v2
docker-compose up -d
```

### Step 6: Verify Installation

```bash
# Check all services are running
docker-compose ps

# Should show:
# - whatsapp-api
# - mongodb
# - redis

# Check health
curl http://localhost:3000/health

# Should return:
# {
#   "status": "ok",
#   "ready": true,
#   "database": true,
#   "timestamp": "..."
# }
```

### Step 7: Update API Clients

Update all applications that call the API to use `/api/` prefix.

**Before (v1.0)**:
```javascript
axios.post('http://localhost:3000/send-message', ...)
```

**After (v2.0)**:
```javascript
axios.post('http://localhost:3000/api/send-message', ...)
```

## API Compatibility

### Unchanged Endpoints

These endpoints work the same way (with `/api/` prefix):

- `POST /api/send-message`
- `POST /api/send-media`
- `POST /api/send-file`
- `GET /api/contacts`
- `GET /api/chats`
- `GET /api/chat/:chatId/messages`
- `POST /api/group/create`
- `GET /api/group/:groupId`
- `POST /api/group/:groupId/add-participants`
- `POST /api/group/:groupId/remove-participants`
- `POST /api/group/:groupId/promote`
- `POST /api/group/:groupId/demote`
- `POST /api/group/:groupId/settings`
- `POST /api/group/:groupId/leave`
- `GET /api/profile-picture/:contactId`
- `POST /api/chat/:chatId/archive`
- `POST /api/chat/:chatId/unarchive`
- `POST /api/chat/:chatId/pin`
- `POST /api/chat/:chatId/unpin`
- `POST /api/chat/:chatId/mute`
- `POST /api/chat/:chatId/unmute`
- `POST /api/chat/:chatId/mark-read`
- `POST /api/chat/:chatId/mark-unread`
- `DELETE /api/chat/:chatId`
- `POST /api/chat/:chatId/clear-messages`
- `POST /api/logout`
- `POST /api/restart`

### New Endpoints

New endpoints in v2.0:

- `POST /api/send-bulk-messages` - Bulk messaging
- `POST /api/send-reaction` - Message reactions
- `POST /api/create-poll` - Create polls
- `GET /api/poll-votes/:messageId` - Get poll results
- `POST /api/set-typing` - Typing indicators
- `POST /api/send-status` - Post status/story
- `POST /api/block-contact` - Block contacts
- `POST /api/unblock-contact` - Unblock contacts

## Feature Migration

### Webhooks

v2.0 webhooks include retry logic and logging.

**No changes required** - existing webhooks continue to work.

**New features**:
- Automatic retries on failure
- Database logging
- New event: `message_reaction`

### Message Persistence

Messages are now automatically saved to MongoDB.

**Query message history**:
```javascript
db.messages.find({ chatId: "1234567890@c.us" })
  .sort({ timestamp: -1 })
  .limit(50)
```

### Contact Management

Contacts are now saved to database.

**Query contacts**:
```javascript
db.contacts.find({ isBlocked: true })
```

## Rollback Procedure

If you need to rollback to v1.0:

```bash
# Stop v2.0
cd whatsapp-web-docker-v2
docker-compose down

# Restore v1.0
cd ../whatsapp-web-docker-v1

# Restore sessions if needed
rm -rf sessions/*
cp -r sessions-backup-20241001/* sessions/

# Start v1.0
docker-compose up -d
```

**Note**: You'll lose v2.0 data (messages, contacts in database).

## Testing After Migration

### 1. Authentication

```bash
# Check if still authenticated
curl http://localhost:3000/health

# If not authenticated, visit /qr to scan again
```

### 2. Send Message

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "message": "Test migration"
  }'
```

### 3. Check Database

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh whatsapp-api

# Verify collections
show collections
# Should show: contacts, messages, webhooklogs

# Check message was saved
db.messages.findOne()
```

### 4. Check Redis

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check connection
PING
# Should return: PONG
```

### 5. Test New Features

```bash
# Test bulk messaging
curl -X POST http://localhost:3000/api/send-bulk-messages \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"number": "1234567890", "message": "Test 1", "delay": 2000},
      {"number": "0987654321", "message": "Test 2", "delay": 2000}
    ]
  }'
```

## Common Issues

### "Database connection failed"

**Solution**: Ensure MongoDB is running
```bash
docker-compose logs mongodb
docker-compose restart mongodb
```

### "Message queue not available"

**Solution**: Ensure Redis is running
```bash
docker-compose logs redis
docker-compose restart redis
```

### Session lost after migration

**Solution**: Sessions should be preserved, but if lost:
1. Visit `/qr`
2. Scan QR code with WhatsApp
3. Wait for authentication

### API endpoints return 404

**Solution**: Add `/api/` prefix to all endpoint URLs

### Rate limiting triggered

**Solution**: Adjust rate limits in `.env`:
```env
RATE_LIMIT_MAX_REQUESTS=500
```

## Performance Considerations

v2.0 is more resource-intensive due to:
- MongoDB (persistent storage)
- Redis (message queue)
- Enhanced logging

**Recommendations**:
- Minimum 4GB RAM (was 2GB in v1.0)
- SSD storage recommended
- Monitor resource usage after migration

## Support

If you encounter issues:

1. Check logs:
```bash
docker-compose logs -f
```

2. Review [Troubleshooting Guide](Troubleshooting.md)

3. Check [FAQ](FAQ.md)

4. Create GitHub issue with:
   - Migration steps taken
   - Error messages
   - Log output
   - Environment details

---

[← Back to Performance](Performance.md) | [Next: Message Queue →](Message-Queue.md)
