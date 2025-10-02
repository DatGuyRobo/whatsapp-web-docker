# Examples and Use Cases

Practical code examples for common scenarios.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Chatbot Examples](#chatbot-examples)
- [Integration Examples](#integration-examples)
- [Automation Examples](#automation-examples)
- [Advanced Examples](#advanced-examples)

## Basic Examples

### Send Simple Message

**cURL**:
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "message": "Hello from WhatsApp API!"
  }'
```

**JavaScript**:
```javascript
const axios = require('axios');

async function sendMessage(number, message) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/send-message',
      { number, message },
      { headers: { 'X-API-Key': 'your-api-key' } }
    );
    console.log('Message sent:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

sendMessage('1234567890', 'Hello!');
```

**Python**:
```python
import requests

def send_message(number, message):
    url = 'http://localhost:3000/api/send-message'
    headers = {'X-API-Key': 'your-api-key'}
    data = {'number': number, 'message': message}
    
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code == 200:
        print('Message sent:', response.json())
    else:
        print('Error:', response.text)

send_message('1234567890', 'Hello from Python!')
```

**PHP**:
```php
<?php
function sendMessage($number, $message) {
    $url = 'http://localhost:3000/api/send-message';
    $data = ['number' => $number, 'message' => $message];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-API-Key: your-api-key'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode == 200) {
        echo "Message sent: " . $response;
    } else {
        echo "Error: " . $response;
    }
}

sendMessage('1234567890', 'Hello from PHP!');
?>
```

### Send Image

**JavaScript**:
```javascript
async function sendImage(number, imageUrl, caption) {
  const response = await axios.post(
    'http://localhost:3000/api/send-media',
    {
      number,
      mediaUrl: imageUrl,
      caption
    },
    { headers: { 'X-API-Key': 'your-api-key' } }
  );
  return response.data;
}

sendImage('1234567890', 'https://example.com/image.jpg', 'Check this out!');
```

**Python**:
```python
def send_image(number, image_url, caption):
    url = 'http://localhost:3000/api/send-media'
    headers = {'X-API-Key': 'your-api-key'}
    data = {
        'number': number,
        'mediaUrl': image_url,
        'caption': caption
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

### Send Document

**JavaScript**:
```javascript
const FormData = require('form-data');
const fs = require('fs');

async function sendDocument(number, filePath, caption) {
  const form = new FormData();
  form.append('number', number);
  form.append('file', fs.createReadStream(filePath));
  form.append('caption', caption);
  
  const response = await axios.post(
    'http://localhost:3000/api/send-file',
    form,
    {
      headers: {
        'X-API-Key': 'your-api-key',
        ...form.getHeaders()
      }
    }
  );
  return response.data;
}

sendDocument('1234567890', './document.pdf', 'Here is the document');
```

## Chatbot Examples

### Simple Echo Bot

**JavaScript**:
```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const API_KEY = 'your-api-key';
const API_URL = 'http://localhost:3000';

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const { event, data } = req.body;
  
  // Handle incoming messages
  if (event === 'message_create' && !data.fromMe) {
    const from = data.from;
    const message = data.body;
    
    // Echo the message back
    await sendMessage(from, `You said: ${message}`);
  }
  
  res.status(200).send('OK');
});

async function sendMessage(number, message) {
  try {
    await axios.post(
      `${API_URL}/api/send-message`,
      { number, message },
      { headers: { 'X-API-Key': API_KEY } }
    );
  } catch (error) {
    console.error('Error sending message:', error.message);
  }
}

app.listen(4000, () => {
  console.log('Webhook server running on port 4000');
});
```

### Command Bot

**JavaScript**:
```javascript
app.post('/webhook', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'message_create' && !data.fromMe) {
    const from = data.from;
    const message = data.body.trim().toLowerCase();
    
    let reply;
    
    // Command handling
    switch (message) {
      case '/help':
        reply = 'Available commands:\n/help - Show this message\n/time - Get current time\n/joke - Get a random joke';
        break;
        
      case '/time':
        reply = `Current time: ${new Date().toLocaleString()}`;
        break;
        
      case '/joke':
        reply = 'Why did the programmer quit his job? Because he didn\'t get arrays!';
        break;
        
      default:
        if (message.startsWith('/')) {
          reply = 'Unknown command. Type /help for available commands.';
        } else {
          reply = 'Hello! Type /help to see available commands.';
        }
    }
    
    await sendMessage(from, reply);
  }
  
  res.status(200).send('OK');
});
```

### AI Chatbot with OpenAI

**JavaScript**:
```javascript
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Store conversation history
const conversations = new Map();

app.post('/webhook', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'message_create' && !data.fromMe) {
    const from = data.from;
    const message = data.body;
    
    // Get or create conversation history
    if (!conversations.has(from)) {
      conversations.set(from, []);
    }
    const history = conversations.get(from);
    
    // Add user message to history
    history.push({ role: 'user', content: message });
    
    // Keep only last 10 messages
    if (history.length > 10) {
      history.shift();
    }
    
    try {
      // Get AI response
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant on WhatsApp.' },
          ...history
        ]
      });
      
      const reply = completion.choices[0].message.content;
      
      // Add assistant response to history
      history.push({ role: 'assistant', content: reply });
      
      // Send reply
      await sendMessage(from, reply);
    } catch (error) {
      console.error('OpenAI error:', error);
      await sendMessage(from, 'Sorry, I encountered an error. Please try again.');
    }
  }
  
  res.status(200).send('OK');
});
```

## Integration Examples

### Node-RED Flow

Create a flow in Node-RED to handle WhatsApp messages:

```json
[
  {
    "id": "webhook",
    "type": "http in",
    "url": "/webhook",
    "method": "post"
  },
  {
    "id": "process",
    "type": "function",
    "func": "const { event, data } = msg.payload;\nif (event === 'message_create' && !data.fromMe) {\n  msg.payload = {\n    number: data.from,\n    message: `Auto-reply: ${data.body}`\n  };\n  return msg;\n}\nreturn null;"
  },
  {
    "id": "send",
    "type": "http request",
    "method": "POST",
    "url": "http://localhost:3000/api/send-message",
    "headers": {
      "X-API-Key": "your-api-key"
    }
  }
]
```

### Zapier Integration

**Trigger**: Webhook (receive WhatsApp messages)
1. Set webhook URL: `https://your-zapier-webhook.com`
2. Configure in `.env`: `WEBHOOK_URL=https://your-zapier-webhook.com`
3. Parse incoming JSON data

**Action**: Send WhatsApp message
1. Choose "Webhooks by Zapier"
2. POST to `http://your-server:3000/api/send-message`
3. Add X-API-Key header
4. Configure JSON body with number and message

### n8n Workflow

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "webhookId": "whatsapp-webhook"
    },
    {
      "name": "IF Message",
      "type": "n8n-nodes-base.if",
      "position": [450, 300],
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.event}}",
              "value2": "message_create"
            }
          ]
        }
      }
    },
    {
      "name": "Send Reply",
      "type": "n8n-nodes-base.httpRequest",
      "position": [650, 300],
      "parameters": {
        "url": "http://localhost:3000/api/send-message",
        "method": "POST",
        "headerParameters": {
          "parameters": [
            {
              "name": "X-API-Key",
              "value": "your-api-key"
            }
          ]
        },
        "bodyParameters": {
          "parameters": [
            {
              "name": "number",
              "value": "={{$json.data.from}}"
            },
            {
              "name": "message",
              "value": "Thanks for your message!"
            }
          ]
        }
      }
    }
  ]
}
```

## Automation Examples

### Order Confirmation

**JavaScript**:
```javascript
// When order is created
async function sendOrderConfirmation(order) {
  const message = `
✅ Order Confirmed!

Order #: ${order.id}
Items: ${order.items.join(', ')}
Total: $${order.total}

Your order will be delivered in 2-3 days.

Track: https://example.com/track/${order.id}
  `.trim();
  
  await sendMessage(order.customerPhone, message);
}

// Usage
sendOrderConfirmation({
  id: 'ORD-12345',
  customerPhone: '1234567890',
  items: ['Product A', 'Product B'],
  total: 99.99
});
```

### Appointment Reminder

**JavaScript**:
```javascript
const cron = require('node-cron');

// Check appointments every hour
cron.schedule('0 * * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get appointments for tomorrow
  const appointments = await getAppointments(tomorrow);
  
  for (const apt of appointments) {
    const message = `
🗓️ Appointment Reminder

Date: ${apt.date}
Time: ${apt.time}
Location: ${apt.location}

Please arrive 10 minutes early.
Reply CONFIRM to confirm or CANCEL to cancel.
    `.trim();
    
    await sendMessage(apt.customerPhone, message);
  }
});
```

### Customer Support Ticket

**JavaScript**:
```javascript
app.post('/webhook', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'message_create' && !data.fromMe) {
    const from = data.from;
    const message = data.body;
    
    // Create support ticket
    const ticket = await createTicket({
      phone: from,
      message: message,
      source: 'whatsapp'
    });
    
    // Send confirmation
    await sendMessage(from, `
Thank you for contacting support!

Your ticket #${ticket.id} has been created.
Our team will respond within 24 hours.

You can track your ticket at:
https://support.example.com/ticket/${ticket.id}
    `.trim());
  }
  
  res.status(200).send('OK');
});
```

### Bulk Notification

**JavaScript**:
```javascript
async function sendBulkNotification(users, message) {
  const messages = users.map(user => ({
    number: user.phone,
    message: message.replace('{{name}}', user.name),
    delay: 3000 // 3 seconds between messages
  }));
  
  const response = await axios.post(
    'http://localhost:3000/api/send-bulk-messages',
    { messages },
    { headers: { 'X-API-Key': 'your-api-key' } }
  );
  
  console.log(`${response.data.message}`);
  return response.data;
}

// Usage
const users = [
  { name: 'John', phone: '1234567890' },
  { name: 'Jane', phone: '0987654321' }
];

sendBulkNotification(users, 'Hi {{name}}, we have an update for you!');
```

## Advanced Examples

### Message Queue with Database

**JavaScript**:
```javascript
const Queue = require('bull');
const messageQueue = new Queue('whatsapp-messages', {
  redis: { host: 'localhost', port: 6379 }
});

// Add message to queue
async function queueMessage(number, message, priority = 'normal') {
  const job = await messageQueue.add(
    { number, message },
    {
      priority: priority === 'high' ? 1 : 5,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    }
  );
  
  // Store in database
  await db.messages.create({
    jobId: job.id,
    number,
    message,
    status: 'queued',
    priority
  });
  
  return job.id;
}

// Process queue
messageQueue.process(async (job) => {
  const { number, message } = job.data;
  
  try {
    const result = await sendMessage(number, message);
    
    // Update database
    await db.messages.update(
      { jobId: job.id },
      { status: 'sent', sentAt: new Date(), messageId: result.messageId }
    );
    
    return result;
  } catch (error) {
    // Update database with error
    await db.messages.update(
      { jobId: job.id },
      { status: 'failed', error: error.message }
    );
    
    throw error;
  }
});

// Monitor queue
messageQueue.on('completed', (job) => {
  console.log(`Message ${job.id} sent successfully`);
});

messageQueue.on('failed', (job, error) => {
  console.error(`Message ${job.id} failed:`, error.message);
});
```

### Rate Limiter

**JavaScript**:
```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient
  }),
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    // Different limits for different users
    const apiKey = req.headers['x-api-key'];
    const tier = await getUserTier(apiKey);
    
    return tier === 'premium' ? 1000 : 100;
  },
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);
```

### Analytics Dashboard

**JavaScript**:
```javascript
// Get message statistics
async function getMessageStats(startDate, endDate) {
  const stats = await db.messages.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          type: '$type'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
  
  return stats;
}

// Get webhook success rate
async function getWebhookStats() {
  const stats = await db.webhooklogs.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const successful = stats.find(s => s._id === 'success')?.count || 0;
  const successRate = (successful / total * 100).toFixed(2);
  
  return {
    total,
    successful,
    successRate: `${successRate}%`,
    breakdown: stats
  };
}
```

## Testing Examples

### Unit Test

**JavaScript (Jest)**:
```javascript
const axios = require('axios');
jest.mock('axios');

describe('WhatsApp API', () => {
  it('should send message successfully', async () => {
    const mockResponse = {
      data: { success: true, messageId: 'msg-123' }
    };
    axios.post.mockResolvedValue(mockResponse);
    
    const result = await sendMessage('1234567890', 'Test');
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-123');
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/send-message',
      { number: '1234567890', message: 'Test' },
      { headers: { 'X-API-Key': expect.any(String) } }
    );
  });
});
```

### Integration Test

**JavaScript**:
```javascript
const request = require('supertest');

describe('API Integration Tests', () => {
  it('should return 401 without API key', async () => {
    const response = await request('http://localhost:3000')
      .post('/api/send-message')
      .send({ number: '1234567890', message: 'Test' });
    
    expect(response.status).toBe(401);
  });
  
  it('should send message with valid API key', async () => {
    const response = await request('http://localhost:3000')
      .post('/api/send-message')
      .set('X-API-Key', 'your-api-key')
      .send({ number: '1234567890', message: 'Test' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

---

[← Back to FAQ](FAQ.md) | [Next: Security →](Security.md)
