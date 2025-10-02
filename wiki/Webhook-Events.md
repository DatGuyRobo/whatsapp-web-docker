# Webhook Events

Real-time event notifications for your WhatsApp integrations.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Event Types](#event-types)
- [Webhook Payload Format](#webhook-payload-format)
- [Retry Logic](#retry-logic)
- [Security](#security)
- [Testing Webhooks](#testing-webhooks)
- [Event Examples](#event-examples)

## Overview

Webhooks allow your application to receive real-time notifications when events occur in WhatsApp, such as:
- New messages received
- Message delivery status
- Message reactions
- Group events
- Call notifications
- Authentication events

### How Webhooks Work

1. Configure webhook URL in your `.env` file
2. Events occur in WhatsApp (message received, etc.)
3. API sends HTTP POST request to your webhook URL
4. Your server processes the event
5. Automatic retries on failure

## Configuration

### Enable Webhooks

Add webhook URL to your `.env` file:

```env
# Webhook Configuration
WEBHOOK_URL=https://your-webhook-endpoint.com/webhook
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=5000
```

### Configuration Options

- `WEBHOOK_URL`: Your endpoint URL (HTTPS recommended)
- `WEBHOOK_RETRY_ATTEMPTS`: Number of retry attempts (default: 3)
- `WEBHOOK_RETRY_DELAY`: Delay between retries in ms (default: 5000)

### Requirements

- **HTTPS**: Strongly recommended for security
- **Public URL**: Must be accessible from the internet
- **Response**: Return 2xx status code for success
- **Timeout**: Respond within 30 seconds

## Event Types

### Message Events

#### message_create

Triggered when a new message is received.

```json
{
  "event": "message_create",
  "data": {
    "id": {
      "_serialized": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1"
    },
    "body": "Hello!",
    "type": "chat",
    "timestamp": 1696176000,
    "from": "1234567890@c.us",
    "to": "0987654321@c.us",
    "fromMe": false,
    "hasMedia": false,
    "isForwarded": false
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

#### message_ack

Triggered when message delivery status changes.

```json
{
  "event": "message_ack",
  "data": {
    "id": {
      "_serialized": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1"
    },
    "ack": 3
  },
  "timestamp": "2024-10-01T12:00:01.000Z"
}
```

**ACK Status Codes**:
- `0` - Error
- `1` - Pending
- `2` - Server received
- `3` - Device received (2 checks)
- `4` - Read (2 blue checks)
- `5` - Played (for voice/video)

#### message_revoke_everyone

Triggered when a message is deleted for everyone.

```json
{
  "event": "message_revoke_everyone",
  "data": {
    "id": {
      "_serialized": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1"
    },
    "revokedBy": "1234567890@c.us"
  },
  "timestamp": "2024-10-01T12:01:00.000Z"
}
```

#### message_reaction (NEW in v2.0)

Triggered when someone reacts to a message.

```json
{
  "event": "message_reaction",
  "data": {
    "id": {
      "_serialized": "reaction_id"
    },
    "msgId": {
      "_serialized": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1"
    },
    "reaction": "👍",
    "senderId": "1234567890@c.us",
    "timestamp": 1696176000
  },
  "timestamp": "2024-10-01T12:00:02.000Z"
}
```

### Group Events

#### group_join

Triggered when someone joins a group.

```json
{
  "event": "group_join",
  "data": {
    "chatId": "123456789-1234567890@g.us",
    "participants": ["1234567890@c.us"],
    "author": "0987654321@c.us"
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

#### group_leave

Triggered when someone leaves a group.

```json
{
  "event": "group_leave",
  "data": {
    "chatId": "123456789-1234567890@g.us",
    "participants": ["1234567890@c.us"],
    "author": "1234567890@c.us"
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

#### group_update

Triggered when group settings are updated.

```json
{
  "event": "group_update",
  "data": {
    "chatId": "123456789-1234567890@g.us",
    "subject": "New Group Name",
    "description": "New group description",
    "author": "1234567890@c.us"
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

### Authentication Events

#### authenticated

Triggered when successfully authenticated with WhatsApp.

```json
{
  "event": "authenticated",
  "data": {
    "session": "session_data"
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

#### auth_failure

Triggered when authentication fails.

```json
{
  "event": "auth_failure",
  "data": {
    "message": "Authentication failed"
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

#### ready

Triggered when WhatsApp client is ready.

```json
{
  "event": "ready",
  "data": {
    "info": {
      "pushname": "My WhatsApp",
      "wid": {
        "_serialized": "1234567890@c.us"
      }
    }
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

#### disconnected

Triggered when WhatsApp disconnects.

```json
{
  "event": "disconnected",
  "data": {
    "reason": "NAVIGATION"
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

### Call Events

#### call

Triggered when receiving a call.

```json
{
  "event": "call",
  "data": {
    "id": "call_id",
    "from": "1234567890@c.us",
    "timestamp": 1696176000,
    "isVideo": false,
    "isGroup": false
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

### Contact Events

#### contact_changed

Triggered when contact information changes.

```json
{
  "event": "contact_changed",
  "data": {
    "id": {
      "_serialized": "1234567890@c.us"
    },
    "name": "New Name",
    "number": "1234567890"
  },
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

## Webhook Payload Format

All webhook events follow this format:

```json
{
  "event": "event_name",
  "data": {
    // Event-specific data
  },
  "timestamp": "ISO 8601 timestamp"
}
```

### Headers

```
Content-Type: application/json
User-Agent: WhatsApp-Web-API/2.0
X-Webhook-Signature: hmac-sha256-signature (if configured)
```

## Retry Logic

### Automatic Retries

Failed webhook deliveries are automatically retried with exponential backoff:

1. **Attempt 1**: Immediate
2. **Attempt 2**: After 5 seconds
3. **Attempt 3**: After 10 seconds
4. **Attempt 4**: After 20 seconds (if configured)

### Success Criteria

Webhook is considered successful if:
- HTTP status code is 2xx (200-299)
- Response received within timeout (30s)

### Failure Handling

Webhook is marked failed if:
- HTTP status code is not 2xx
- Connection timeout
- Network error
- All retry attempts exhausted

### Database Logging

All webhook deliveries are logged in MongoDB:

```javascript
{
  event: "message_create",
  payload: { /* event data */ },
  webhookUrl: "https://your-webhook.com/webhook",
  status: "success", // or "failed", "retrying"
  statusCode: 200,
  retryCount: 0,
  errorMessage: null,
  createdAt: "2024-10-01T12:00:00.000Z"
}
```

## Security

### HTTPS Only

Always use HTTPS in production:

```env
# ✅ Good
WEBHOOK_URL=https://api.example.com/webhook

# ❌ Bad (development only)
WEBHOOK_URL=http://api.example.com/webhook
```

### IP Whitelisting

Restrict webhook requests to your API server IP:

```javascript
// Your webhook handler
app.post('/webhook', (req, res) => {
    const allowedIPs = ['1.2.3.4', '5.6.7.8'];
    
    if (!allowedIPs.includes(req.ip)) {
        return res.status(403).send('Forbidden');
    }
    
    // Process webhook
    const event = req.body;
    console.log('Webhook received:', event);
    res.status(200).send('OK');
});
```

### Signature Verification

Implement webhook signature verification:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    const computedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
    );
}

app.post('/webhook', (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const secret = process.env.WEBHOOK_SECRET;
    
    if (!verifyWebhookSignature(req.body, signature, secret)) {
        return res.status(401).send('Invalid signature');
    }
    
    // Process webhook
    res.status(200).send('OK');
});
```

### Rate Limiting

Implement rate limiting on your webhook endpoint:

```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100 // limit each IP to 100 requests per windowMs
});

app.post('/webhook', webhookLimiter, (req, res) => {
    // Process webhook
    res.status(200).send('OK');
});
```

## Testing Webhooks

### Local Testing with ngrok

Test webhooks locally using ngrok:

1. **Install ngrok**:
```bash
# macOS
brew install ngrok

# Linux
sudo snap install ngrok
```

2. **Start your webhook server**:
```bash
node webhook-server.js
# Server running on http://localhost:4000
```

3. **Create ngrok tunnel**:
```bash
ngrok http 4000
# Forwarding https://abc123.ngrok.io -> http://localhost:4000
```

4. **Update .env**:
```env
WEBHOOK_URL=https://abc123.ngrok.io/webhook
```

5. **Restart WhatsApp API**:
```bash
docker-compose restart whatsapp-api
```

### Test Webhook Handler

Simple webhook handler for testing:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
    const event = req.body;
    
    console.log('='.repeat(60));
    console.log('Webhook Event Received');
    console.log('='.repeat(60));
    console.log('Event:', event.event);
    console.log('Timestamp:', event.timestamp);
    console.log('Data:', JSON.stringify(event.data, null, 2));
    console.log('='.repeat(60));
    
    // Respond with success
    res.status(200).json({ received: true });
});

app.listen(4000, () => {
    console.log('Webhook server listening on port 4000');
});
```

### Testing with RequestBin

Use RequestBin to inspect webhooks:

1. Go to https://requestbin.com/
2. Create a new bin
3. Copy the bin URL
4. Set as WEBHOOK_URL
5. View incoming webhooks in browser

## Event Examples

### Handling Message Events

```javascript
app.post('/webhook', async (req, res) => {
    const { event, data } = req.body;
    
    try {
        switch (event) {
            case 'message_create':
                await handleNewMessage(data);
                break;
            case 'message_reaction':
                await handleReaction(data);
                break;
            case 'group_join':
                await handleGroupJoin(data);
                break;
            default:
                console.log('Unhandled event:', event);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Error');
    }
});

async function handleNewMessage(data) {
    console.log('New message from:', data.from);
    console.log('Message:', data.body);
    
    // Auto-reply example
    if (data.body.toLowerCase() === 'help') {
        await sendMessage(data.from, 'How can I help you?');
    }
}

async function handleReaction(data) {
    console.log('Reaction:', data.reaction);
    console.log('On message:', data.msgId._serialized);
}

async function handleGroupJoin(data) {
    console.log('New member joined group:', data.chatId);
    console.log('Members:', data.participants);
}
```

### Database Storage

Store events in database:

```javascript
const Event = require('./models/Event');

app.post('/webhook', async (req, res) => {
    const { event, data, timestamp } = req.body;
    
    try {
        // Store in database
        await Event.create({
            eventType: event,
            eventData: data,
            receivedAt: new Date(timestamp)
        });
        
        // Process event
        await processEvent(event, data);
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error');
    }
});
```

### Async Processing

Use queue for async processing:

```javascript
const Queue = require('bull');
const webhookQueue = new Queue('webhooks');

app.post('/webhook', async (req, res) => {
    // Queue event for processing
    await webhookQueue.add(req.body);
    
    // Respond immediately
    res.status(200).send('OK');
});

// Process events from queue
webhookQueue.process(async (job) => {
    const { event, data } = job.data;
    await processEvent(event, data);
});
```

## Monitoring

### Log Webhook Activity

```bash
# View webhook logs in database
docker-compose exec mongodb mongosh whatsapp-api

> db.webhooklogs.find().sort({createdAt: -1}).limit(10)
```

### Track Success Rate

```javascript
// Monitor webhook success rate
const stats = await WebhookLog.aggregate([
    {
        $group: {
            _id: '$status',
            count: { $sum: 1 }
        }
    }
]);

console.log('Webhook Stats:', stats);
// Output: [
//   { _id: 'success', count: 950 },
//   { _id: 'failed', count: 50 }
// ]
```

## Troubleshooting

### Webhooks Not Received

1. **Check URL**: Verify WEBHOOK_URL is correct
2. **Check Firewall**: Ensure endpoint is publicly accessible
3. **Check Logs**: Review application logs for errors
4. **Test Endpoint**: Use curl to test your endpoint

```bash
# Test webhook endpoint
curl -X POST https://your-webhook.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{},"timestamp":"2024-10-01T12:00:00.000Z"}'
```

### Failed Deliveries

Check webhook logs in database:

```javascript
// Find failed webhooks
const failed = await WebhookLog.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(10);

failed.forEach(log => {
    console.log('Failed:', log.event);
    console.log('Error:', log.errorMessage);
    console.log('Retries:', log.retryCount);
});
```

### Slow Webhook Responses

- Optimize webhook handler performance
- Use async processing with queues
- Increase timeout configuration
- Scale webhook infrastructure

---

[← Back to API Reference](API-Reference.md) | [Next: Database Schema →](Database-Schema.md)
