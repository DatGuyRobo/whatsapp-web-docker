# WhatsApp Web API v2.0

A powerful, enterprise-grade REST API for WhatsApp Web built with Express.js and whatsapp-web.js. This fully containerized solution provides comprehensive WhatsApp automation with advanced features including bulk messaging, real-time webhooks, database persistence, message queuing, and much more.

## What's New in v2.0

### Performance & Security Enhancements
- **Rate Limiting**: Protection against API abuse with configurable limits
- **Request Validation**: Joi-based schema validation for all endpoints
- **Response Compression**: Gzip compression for faster API responses
- **Security Headers**: Helmet.js integration for enhanced security
- **CORS Configuration**: Flexible cross-origin resource sharing setup
- **Error Logging**: Winston-based structured logging with daily rotation
- **Database Integration**: MongoDB for message/contact persistence
- **Message Queue**: Bull/Redis-based queue for bulk operations

### New Features
- **Bulk Messaging**: Send messages to multiple recipients with queue management
- **Message Reactions**: Send and receive emoji reactions
- **Polls**: Create and manage polls in chats
- **Status/Stories**: Post and manage WhatsApp statuses
- **Contact Management**: Block/unblock contacts
- **Typing Indicators**: Show typing status in chats
- **Always Online**: Keep WhatsApp presence always available
- **Enhanced Webhooks**: Retry logic and database logging for webhook events

## Features

### Core Functionality
- **Message Operations**
  - Send text messages to individuals and groups
  - Send media files (images, videos, audio, documents)
  - Send voice messages with automatic audio conversion
  - Send videos as GIFs
  - Support for multipart file uploads
  - **NEW**: Bulk message sending with queue management
  - **NEW**: Message reactions

### Chat Management
- Get all chats and contacts
- Fetch chat messages with customizable limits
- Archive/unarchive chats
- Pin/unpin chats
- Mute/unmute chats (with custom duration)
- Mark chats as read/unread
- Delete chats and clear messages
- **NEW**: Typing indicators

### Group Operations
- Create new groups
- Get group information and participants
- Add/remove participants
- Promote/demote admins
- Configure group settings (message permissions, info permissions)
- Leave groups
- **NEW**: Create and manage polls

### Contact Management (NEW)
- Block/unblock contacts
- Get contact information
- Track blocked contacts in database

### Status/Stories (NEW)
- Post text statuses
- Post media statuses
- Custom status styling options

### Real-time Events & Webhooks
- Webhook support with automatic retry logic
- Database logging of all webhook deliveries
- Message received/sent events
- Message acknowledgment tracking
- **NEW**: Message reaction events
- Group join/leave notifications
- Call notifications
- Authentication status updates
- Contact change events

### Database & Persistence (NEW)
- MongoDB integration for data persistence
- Message history storage
- Contact information tracking
- Webhook delivery logs
- Automatic data synchronization

### Infrastructure (NEW)
- Redis-based message queue for bulk operations
- Rate limiting and request throttling
- Structured logging with daily rotation
- Health check endpoints with detailed status
- Graceful shutdown handling
- Docker Compose orchestration

## Prerequisites

- Docker and Docker Compose (recommended)
- Node.js 20+ (if running without Docker)
- MongoDB 7.0+ (provided via Docker)
- Redis 7+ (provided via Docker)

## Quick Start

### 1. Clone and Configure

```bash
cd /opt/containers/whatsapp-web
```

### 2. Update Environment Variables

Edit `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# API Authentication
API_KEY=your-secret-api-key-change-this

# Webhook Configuration
WEBHOOK_URL=https://your-webhook-endpoint.com/webhook
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=5000

# Database Configuration
MONGODB_URI=mongodb://mongodb:27017/whatsapp-api

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# WhatsApp Features
ALWAYS_ONLINE=true

# Logging
LOG_LEVEL=info
LOG_DIR=/app/logs
```

### 3. Run with Docker Compose

```bash
docker-compose up -d
```

This will start:
- WhatsApp API server (port 3000)
- MongoDB (port 27017)
- Redis (port 6379)

### 4. Authenticate with WhatsApp

1. Open your browser: `http://localhost:3000/qr`
2. Scan the QR code with WhatsApp mobile app
3. Wait for authentication to complete

## API Documentation

### Authentication

All API endpoints (except `/qr` and `/health`) require authentication:

```bash
# Using X-API-Key header
curl -H "X-API-Key: your-secret-api-key" http://localhost:3000/api/info

# Using Authorization Bearer
curl -H "Authorization: Bearer your-secret-api-key" http://localhost:3000/api/info
```

### New Endpoints (v2.0)

#### Bulk Messaging

**POST /api/send-bulk-messages**

Send messages to multiple recipients with automatic queuing:

```bash
curl -X POST http://localhost:3000/api/send-bulk-messages \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "number": "1234567890",
        "message": "Hello User 1",
        "delay": 2000
      },
      {
        "number": "0987654321",
        "message": "Hello User 2",
        "delay": 2000
      }
    ]
  }'
```

Response:
```json
{
  "success": true,
  "message": "2 messages queued",
  "jobs": [
    { "number": "1234567890", "jobId": "1" },
    { "number": "0987654321", "jobId": "2" }
  ]
}
```

#### Message Reactions

**POST /api/send-reaction**

Send emoji reaction to a message:

```bash
curl -X POST http://localhost:3000/api/send-reaction \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "true_1234567890@c.us_ABCDEF123456",
    "reaction": "👍"
  }'
```

#### Create Poll

**POST /api/create-poll**

Create a poll in a chat:

```bash
curl -X POST http://localhost:3000/api/create-poll \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "question": "What is your favorite color?",
    "options": ["Red", "Blue", "Green", "Yellow"],
    "allowMultipleAnswers": false
  }'
```

**GET /api/poll-votes/:messageId**

Get poll results:

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/poll-votes/MESSAGE_ID
```

#### Typing Indicators

**POST /api/set-typing**

Show or hide typing indicator:

```bash
curl -X POST http://localhost:3000/api/set-typing \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "1234567890@c.us",
    "typing": true
  }'
```

#### Status/Stories

**POST /api/send-status**

Post a text status:

```bash
curl -X POST http://localhost:3000/api/send-status \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello from the API!",
    "backgroundColor": "#25D366",
    "font": 1
  }'
```

Post a media status:

```bash
curl -X POST http://localhost:3000/api/send-status \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrl": "https://example.com/image.jpg",
    "content": "Check this out!"
  }'
```

#### Contact Management

**POST /api/block-contact**

Block a contact:

```bash
curl -X POST http://localhost:3000/api/block-contact \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "1234567890@c.us"
  }'
```

**POST /api/unblock-contact**

Unblock a contact:

```bash
curl -X POST http://localhost:3000/api/unblock-contact \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "1234567890@c.us"
  }'
```

### Existing Endpoints

All original v1.0 endpoints remain available with the `/api/` prefix:

- **POST /api/send-message** - Send text message
- **POST /api/send-media** - Send media from URL or base64
- **POST /api/send-file** - Upload and send file
- **GET /api/contacts** - Get all contacts
- **GET /api/chats** - Get all chats
- **GET /api/chat/:chatId/messages** - Get chat messages
- **POST /api/group/create** - Create group
- **GET /api/group/:groupId** - Get group info
- **POST /api/group/:groupId/add-participants** - Add participants
- **POST /api/group/:groupId/remove-participants** - Remove participants
- **POST /api/group/:groupId/promote** - Promote to admin
- **POST /api/group/:groupId/demote** - Demote from admin
- **POST /api/group/:groupId/settings** - Update group settings
- **POST /api/group/:groupId/leave** - Leave group
- **GET /api/profile-picture/:contactId** - Get profile picture
- **POST /api/chat/:chatId/archive** - Archive chat
- **POST /api/chat/:chatId/pin** - Pin chat
- **POST /api/chat/:chatId/mute** - Mute chat
- **POST /api/chat/:chatId/mark-read** - Mark as read
- **DELETE /api/chat/:chatId** - Delete chat
- **POST /api/logout** - Logout
- **POST /api/restart** - Restart client

## Webhook Events

### New Events in v2.0

| Event | Description |
|-------|-------------|
| `message_reaction` | Emoji reaction received on a message |

All webhook events now include:
- Automatic retry with exponential backoff
- Database logging for audit trail
- Detailed error tracking

### Enhanced Webhook Payload Format

```json
{
  "event": "message_reaction",
  "data": {
    "id": "reaction_id",
    "msgId": "message_id",
    "reaction": "👍",
    "senderId": "1234567890@c.us",
    "timestamp": 1234567890
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

## Database Schema

### Messages Collection

Stores all sent and received messages:

```javascript
{
  messageId: String,
  chatId: String,
  from: String,
  to: String,
  body: String,
  type: String, // 'chat', 'image', 'video', 'audio', 'poll', etc.
  hasMedia: Boolean,
  timestamp: Number,
  ack: Number, // Delivery status
  fromMe: Boolean,
  isForwarded: Boolean
}
```

### Contacts Collection

Stores contact information:

```javascript
{
  contactId: String,
  name: String,
  number: String,
  isMyContact: Boolean,
  isBlocked: Boolean,
  profilePicUrl: String,
  labels: [String]
}
```

### WebhookLogs Collection

Tracks webhook delivery:

```javascript
{
  event: String,
  payload: Mixed,
  webhookUrl: String,
  status: String, // 'pending', 'success', 'failed', 'retrying'
  statusCode: Number,
  retryCount: Number,
  errorMessage: String
}
```

## Docker Configuration

### Architecture

```
┌─────────────────────┐
│  WhatsApp API       │
│  (Express + WW.js)  │
│  Port: 3000         │
└──────┬──────────────┘
       │
       ├─────────────────┐
       │                 │
┌──────▼──────┐   ┌─────▼──────┐
│  MongoDB    │   │   Redis    │
│  Port: 27017│   │   Port:6379│
└─────────────┘   └────────────┘
```

### Services

1. **whatsapp-api**: Main application server
2. **mongodb**: Database for persistence
3. **redis**: Message queue and caching

### Volumes

- `./sessions` - WhatsApp session data
- `./logs` - Application logs
- `mongodb_data` - MongoDB data
- `redis_data` - Redis persistence

### Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f whatsapp-api

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View database logs
docker-compose logs -f mongodb

# View queue logs
docker-compose logs -f redis
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `API_KEY` | API authentication key | Required |
| `WEBHOOK_URL` | Webhook endpoint URL | Optional |
| `WEBHOOK_RETRY_ATTEMPTS` | Max webhook retries | `3` |
| `WEBHOOK_RETRY_DELAY` | Retry delay (ms) | `5000` |
| `SESSION_PATH` | Session storage path | `/app/sessions` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongodb:27017/whatsapp-api` |
| `REDIS_HOST` | Redis hostname | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `ALWAYS_ONLINE` | Keep presence online | `true` |
| `LOG_LEVEL` | Logging level | `info` |
| `LOG_DIR` | Log directory | `/app/logs` |

## Monitoring & Logging

### Health Check

Enhanced health endpoint with detailed status:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "ready": true,
  "database": true,
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

### Log Files

Logs are stored in `./logs` directory:

- `combined-YYYY-MM-DD.log` - All logs
- `error-YYYY-MM-DD.log` - Error logs only
- Automatic daily rotation
- 14-day retention

### Log Levels

- `error` - Errors only
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging
- `verbose` - Very detailed logs

## Performance & Limits

### Rate Limiting

Default: 100 requests per minute per IP

Customize in `.env`:
```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Bulk Messaging

- Maximum: 100 messages per request
- Automatic queue management
- Configurable delays between messages
- Retry on failure (3 attempts)

### File Uploads

- Maximum file size: 50MB
- Automatic audio conversion for voice messages
- Supports all WhatsApp media types

## Project Structure

```
.
├── index.js                    # Main application
├── config.js                   # Configuration management
├── package.json               # Dependencies
├── Dockerfile                 # Docker image
├── docker-compose.yml         # Docker orchestration
├── .env                       # Environment variables
├── .gitignore                # Git ignore rules
├── src/
│   ├── models/
│   │   ├── database.js       # Database connection
│   │   ├── Message.js        # Message model
│   │   ├── Contact.js        # Contact model
│   │   └── WebhookLog.js     # Webhook log model
│   ├── validators/
│   │   ├── schemas.js        # Joi validation schemas
│   │   └── validate.js       # Validation middleware
│   └── utils/
│       └── logger.js         # Winston logger config
├── sessions/                  # WhatsApp sessions (auto-generated)
└── logs/                     # Application logs (auto-generated)
```

## Troubleshooting

### Database Connection Issues

```bash
# Check MongoDB status
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Message Queue Issues

```bash
# Check Redis status
docker-compose logs redis

# Clear Redis queue
docker-compose exec redis redis-cli FLUSHALL
```

### WhatsApp Authentication

```bash
# Clear session and restart
docker-compose down
rm -rf sessions/*
docker-compose up -d
```

### High Memory Usage

Increase Docker resources or adjust:

```yaml
# docker-compose.yml
services:
  whatsapp-api:
    shm_size: '4gb'  # Increase from 2gb
```

## Security Best Practices

1. **Change default API key** immediately
2. **Use HTTPS** for webhook URLs
3. **Restrict CORS** to specific domains
4. **Enable rate limiting** (included by default)
5. **Use strong MongoDB passwords** in production
6. **Keep dependencies updated** regularly
7. **Monitor logs** for suspicious activity
8. **Backup database** regularly
9. **Use environment variables** for secrets
10. **Implement IP whitelisting** for production

## Migration from v1.0 to v2.0

### Breaking Changes

1. API endpoints now use `/api/` prefix
2. Database required for full functionality
3. Redis required for bulk messaging

### Migration Steps

1. Update `docker-compose.yml` with new services
2. Update `.env` with new variables
3. Update API endpoint URLs to include `/api/` prefix
4. Install new dependencies: `npm install`
5. Start new services: `docker-compose up -d`

## Performance Optimization Tips

1. **Enable compression** (included by default)
2. **Use bulk messaging** for multiple recipients
3. **Implement caching** for frequently accessed data
4. **Monitor database indexes** for query performance
5. **Use Redis** for session storage in multi-instance setups
6. **Enable log rotation** to prevent disk space issues
7. **Set appropriate rate limits** based on your needs

## License

MIT

## Acknowledgments

Built with:
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API client
- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Redis](https://redis.io/) - Cache and queue
- [Bull](https://github.com/OptimalBits/bull) - Job queue
- [Winston](https://github.com/winstonjs/winston) - Logging
- [Joi](https://joi.dev/) - Validation
- [Helmet](https://helmetjs.github.io/) - Security
- [Puppeteer](https://pptr.dev/) - Headless Chrome
- [FFmpeg](https://ffmpeg.org/) - Media processing

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs: `docker-compose logs -f`
3. Check database connectivity
4. Verify environment variables
5. Consult documentation

---

**Version**: 2.0.0
**Last Updated**: October 2024

**⚠️ Disclaimer**: This project is not affiliated with WhatsApp or Meta. Use responsibly and in accordance with WhatsApp's Terms of Service. Automating WhatsApp may result in your number being banned.
