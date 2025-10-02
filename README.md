# WhatsApp Web API

A powerful and feature-rich REST API for WhatsApp Web built with Express.js and whatsapp-web.js. This containerized solution allows you to programmatically send messages, manage chats, handle groups, and receive real-time webhooks for WhatsApp events.

## Features

### Core Functionality
- **Message Operations**
  - Send text messages to individuals and groups
  - Send media files (images, videos, audio, documents)
  - Send voice messages with automatic audio conversion
  - Send videos as GIFs
  - Support for multipart file uploads

### Chat Management
- Get all chats and contacts
- Fetch chat messages with customizable limits
- Archive/unarchive chats
- Pin/unpin chats
- Mute/unmute chats (with custom duration)
- Mark chats as read/unread
- Delete chats and clear messages

### Group Operations
- Create new groups
- Get group information and participants
- Add/remove participants
- Promote/demote admins
- Configure group settings (message permissions, info permissions)
- Leave groups

### Real-time Events
- Webhook support for real-time event notifications
- Message received/sent events
- Message acknowledgment tracking (sent, delivered, read)
- Group join/leave notifications
- Call notifications
- Authentication status updates
- QR code generation events

### Additional Features
- Check if a number is registered on WhatsApp
- Get profile pictures
- Get client state and info
- Health check endpoint
- API key authentication
- Docker containerization with optimized Chromium setup

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (if running without Docker)

## Quick Start

### 1. Clone and Configure

```bash
cd /opt/containers/whatsapp-web
cp .env.example .env  # If .env doesn't exist
```

### 2. Update Environment Variables

Edit `.env` file:

```env
# Server Configuration
PORT=3000

# API Authentication
API_KEY=your-secret-api-key-change-this

# Webhook Configuration (optional)
WEBHOOK_URL=https://your-webhook-endpoint.com/webhook

# Session Storage Path
SESSION_PATH=/app/sessions
```

### 3. Run with Docker Compose

```bash
docker-compose up -d
```

### 4. Authenticate with WhatsApp

1. Open your browser and navigate to: `http://localhost:3000/qr`
2. Scan the QR code with WhatsApp mobile app:
   - Open WhatsApp on your phone
   - Tap **Menu** (⋮) or **Settings**
   - Tap **Linked Devices**
   - Tap **Link a Device**
   - Point your phone at the QR code

The page will automatically refresh once authenticated.

## API Documentation

### Authentication

All API endpoints (except `/qr` and `/health`) require authentication using an API key. Include the API key in your requests using one of these methods:

**Header: X-API-Key**
```bash
curl -H "X-API-Key: your-secret-api-key" http://localhost:3000/info
```

**Header: Authorization Bearer**
```bash
curl -H "Authorization: Bearer your-secret-api-key" http://localhost:3000/info
```

### Endpoints

#### Health & Status

**GET /health**
```bash
curl http://localhost:3000/health
```
Response:
```json
{
  "status": "ok",
  "ready": true
}
```

**GET /qr**

Open in browser to view and scan QR code for authentication.

**GET /info**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/info
```

**GET /state**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/state
```

#### Number Validation

**GET /check-number/:number**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/check-number/1234567890
```

#### Messaging

**POST /send-message**
```bash
curl -X POST http://localhost:3000/send-message \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "message": "Hello from WhatsApp API!"
  }'
```

**POST /send-media**

Send media from URL or base64:
```bash
curl -X POST http://localhost:3000/send-media \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "mediaUrl": "https://example.com/image.jpg",
    "caption": "Check this out!",
    "sendVideoAsGif": false
  }'
```

Or with base64:
```bash
curl -X POST http://localhost:3000/send-media \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "mediaBase64": "base64-encoded-data",
    "mimetype": "image/jpeg",
    "filename": "photo.jpg",
    "caption": "My photo"
  }'
```

**POST /send-file**

Upload and send files directly:
```bash
curl -X POST http://localhost:3000/send-file \
  -H "X-API-Key: your-api-key" \
  -F "file=@/path/to/file.jpg" \
  -F "number=1234567890" \
  -F "caption=Here's the file" \
  -F "sendAudioAsVoice=true"
```

#### Contacts & Chats

**GET /contacts**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/contacts
```

**GET /chats**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/chats
```

**GET /chat/:chatId**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/chat/1234567890@c.us
```

**GET /chat/:chatId/messages**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/chat/1234567890@c.us/messages?limit=50
```

#### Chat Operations

**POST /chat/:chatId/archive**
**POST /chat/:chatId/unarchive**
**POST /chat/:chatId/pin**
**POST /chat/:chatId/unpin**
**POST /chat/:chatId/mark-read**
**POST /chat/:chatId/mark-unread**
**DELETE /chat/:chatId**
**POST /chat/:chatId/clear**

**POST /chat/:chatId/mute**
```bash
curl -X POST http://localhost:3000/chat/1234567890@c.us/mute \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"duration": 3600}'  # Mute for 1 hour (in seconds)
```

#### Groups

**POST /group/create**
```bash
curl -X POST http://localhost:3000/group/create \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Group",
    "participants": ["1234567890", "0987654321"]
  }'
```

**GET /group/:groupId**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/group/123456789@g.us
```

**POST /group/:groupId/add-participants**
```bash
curl -X POST http://localhost:3000/group/123456789@g.us/add-participants \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"participants": ["1234567890"]}'
```

**POST /group/:groupId/remove-participants**
**POST /group/:groupId/promote**
**POST /group/:groupId/demote**
**POST /group/:groupId/leave**

**POST /group/:groupId/settings**
```bash
curl -X POST http://localhost:3000/group/123456789@g.us/settings \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messageSend": "admins",
    "settingsChange": "admins"
  }'
```

#### Profile

**GET /profile-picture/:contactId**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/profile-picture/1234567890@c.us
```

#### System

**POST /logout**
```bash
curl -X POST http://localhost:3000/logout \
  -H "X-API-Key: your-api-key"
```

**POST /restart**
```bash
curl -X POST http://localhost:3000/restart \
  -H "X-API-Key: your-api-key"
```

## Webhook Events

When configured, the API will send POST requests to your `WEBHOOK_URL` for the following events:

### Event Types

| Event | Description |
|-------|-------------|
| `qr` | QR code generated for authentication |
| `ready` | Client is authenticated and ready |
| `authenticated` | Authentication successful |
| `auth_failure` | Authentication failed |
| `disconnected` | Client disconnected |
| `message` | Incoming message received |
| `message_create` | Message created (sent/received) |
| `message_ack` | Message acknowledgment status changed |
| `group_join` | Someone joined a group |
| `group_leave` | Someone left a group |
| `call` | Incoming call received |

### Webhook Payload Format

```json
{
  "event": "message",
  "data": {
    "id": "message_id",
    "from": "1234567890@c.us",
    "to": "your_number@c.us",
    "body": "Message content",
    "type": "chat",
    "timestamp": 1234567890,
    "hasMedia": false,
    "isGroup": false
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

## Phone Number Format

WhatsApp uses the format: `[country_code][number]@c.us` for individual chats and `[id]@g.us` for groups.

The API accepts numbers in various formats and automatically converts them:
- `1234567890` → `1234567890@c.us`
- `+1234567890` → `1234567890@c.us`
- `1234567890@c.us` → `1234567890@c.us` (no change)

Examples:
- US: `14155551234@c.us`
- UK: `447700900000@c.us`
- India: `919876543210@c.us`

## Docker Configuration

### Build and Run

```bash
# Build the image
docker-compose build

# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `API_KEY` | API authentication key | Required |
| `WEBHOOK_URL` | URL for event webhooks | Optional |
| `SESSION_PATH` | WhatsApp session storage path | `/app/sessions` |

### Volumes

- `./sessions:/app/sessions` - Persists WhatsApp authentication session

## Audio/Voice Message Features

The API automatically converts audio files to WhatsApp-compatible format (Opus/OGG) when sending as voice messages:

- **Codec**: libopus
- **Bitrate**: 128k (high quality)
- **Channels**: Stereo (2)
- **Sample Rate**: 48kHz

Use `sendAudioAsVoice=true` in your requests to enable this feature.

## Development

### Running Locally (without Docker)

```bash
# Install dependencies
npm install

# Set environment variables
export PORT=3000
export API_KEY=your-secret-key
export WEBHOOK_URL=https://your-webhook.com

# Run the server
npm start
```

### Project Structure

```
.
├── index.js              # Main application file
├── package.json          # Node.js dependencies
├── Dockerfile           # Docker image configuration
├── docker-compose.yml   # Docker Compose setup
├── .env                 # Environment variables (not in git)
├── .dockerignore       # Docker ignore rules
└── sessions/           # WhatsApp session data (auto-generated)
```

## Troubleshooting

### QR Code Not Appearing
- Wait 2-3 seconds for the QR code to generate
- The page auto-refreshes every 2 seconds
- Check logs: `docker-compose logs -f`

### Authentication Fails
- Clear session data: `rm -rf sessions/*`
- Restart container: `docker-compose restart`
- Check if WhatsApp Web is accessible in your region

### Webhook Not Receiving Events
- Verify `WEBHOOK_URL` is set correctly in `.env`
- Check webhook endpoint is publicly accessible
- Review webhook logs in application output

### Container Memory Issues
- The docker-compose.yml includes `shm_size: '2gb'` for Chromium
- Increase if needed for high-volume usage

### Message Sending Fails
- Verify number format (include country code)
- Check if number is registered: `GET /check-number/:number`
- Ensure client is ready: `GET /health`

## Security Considerations

- **Change the default API key** in production
- Use HTTPS for webhook URLs
- Store `.env` file securely (never commit to git)
- Consider rate limiting for production deployments
- Use firewall rules to restrict API access
- Regularly update dependencies for security patches

## License

MIT

## Acknowledgments

Built with:
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API client
- [Express.js](https://expressjs.com/) - Web framework
- [Puppeteer](https://pptr.dev/) - Headless Chrome automation
- [FFmpeg](https://ffmpeg.org/) - Audio/video processing

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review application logs: `docker-compose logs -f`
3. Consult whatsapp-web.js documentation
4. Open an issue in the repository

---

**⚠️ Disclaimer**: This project is not affiliated with WhatsApp or Meta. Use responsibly and in accordance with WhatsApp's Terms of Service. Automating WhatsApp may result in your number being banned.
