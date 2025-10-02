# Quick Start Guide

Get your WhatsApp Web API up and running in just a few minutes!

## Prerequisites

- Docker and Docker Compose installed
- A WhatsApp account with phone access for QR code scanning

## Step 1: Clone the Repository

```bash
git clone https://github.com/DatGuyRobo/whatsapp-web-docker.git
cd whatsapp-web-docker
```

## Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# API Authentication
API_KEY=your-secret-api-key-change-this

# Webhook Configuration (Optional)
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

**Important**: Change the `API_KEY` to a secure random string!

## Step 3: Start the Services

```bash
docker-compose up -d
```

This command will:
- Pull and start the WhatsApp API container
- Start MongoDB database
- Start Redis message queue
- Create necessary volumes and networks

## Step 4: Authenticate with WhatsApp

1. Open your browser and navigate to: `http://localhost:3000/qr`

2. You'll see a QR code displayed on the page

3. Open WhatsApp on your phone:
   - **Android/iPhone**: Go to Settings → Linked Devices → Link a Device
   
4. Point your phone camera at the QR code on the screen

5. Wait for the authentication to complete (the page will update automatically)

## Step 5: Verify the Connection

Check if the API is ready:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "ready": true,
  "database": true,
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

## Step 6: Send Your First Message

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "X-API-Key: your-secret-api-key-change-this" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "message": "Hello from WhatsApp API!"
  }'
```

Replace:
- `your-secret-api-key-change-this` with your actual API key from `.env`
- `1234567890` with the recipient's phone number (without + or spaces)

## Quick Commands Reference

```bash
# View logs
docker-compose logs -f whatsapp-api

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Rebuild after changes
docker-compose up -d --build

# View all running containers
docker-compose ps

# Check MongoDB logs
docker-compose logs mongodb

# Check Redis logs
docker-compose logs redis
```

## Troubleshooting Quick Fixes

### QR Code Not Appearing
```bash
docker-compose logs whatsapp-api
docker-compose restart whatsapp-api
```

### Authentication Failed
```bash
# Clear session data and restart
docker-compose down
rm -rf sessions/*
docker-compose up -d
```

### Can't Connect to Database
```bash
# Check MongoDB status
docker-compose logs mongodb
docker-compose restart mongodb
```

## Next Steps

Now that you're up and running:

1. **[Explore the API Reference](API-Reference.md)** - Learn about all available endpoints
2. **[Configure Webhooks](Webhook-Events.md)** - Set up real-time event notifications
3. **[Try Examples](Examples.md)** - See code examples for common use cases
4. **[Review Security](Security.md)** - Implement security best practices
5. **[Optimize Performance](Performance.md)** - Fine-tune for your workload

## Common Use Cases

- **Notifications**: Send order confirmations, shipping updates
- **Customer Support**: Automated responses, ticket updates
- **Marketing**: Bulk campaigns, personalized messages
- **Alerts**: System monitoring, critical notifications
- **Integration**: Connect WhatsApp to your existing systems

## Need Help?

- Check the **[Troubleshooting Guide](Troubleshooting.md)**
- Review the **[FAQ](FAQ.md)**
- Read the full **[Installation Guide](Installation.md)** for advanced setups

---

[← Back to Home](Home.md) | [Next: Installation Guide →](Installation.md)
