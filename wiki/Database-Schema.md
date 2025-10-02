# Database Schema

MongoDB database structure and data models.

## Table of Contents

- [Overview](#overview)
- [Collections](#collections)
- [Messages Collection](#messages-collection)
- [Contacts Collection](#contacts-collection)
- [WebhookLogs Collection](#webhooklogs-collection)
- [Indexes](#indexes)
- [Querying Examples](#querying-examples)
- [Data Retention](#data-retention)

## Overview

WhatsApp Web API v2.0 uses MongoDB for data persistence, storing:
- Message history
- Contact information
- Webhook delivery logs
- Application state

### Connection

Default connection string:
```
mongodb://mongodb:27017/whatsapp-api
```

### Database Name

- **Default**: `whatsapp-api`
- **Configurable**: via `MONGODB_URI` environment variable

## Collections

The database contains three main collections:

1. **messages**: Stores all sent and received messages
2. **contacts**: Stores contact information
3. **webhooklogs**: Tracks webhook delivery status

## Messages Collection

### Schema

```javascript
{
  messageId: String,      // Unique message identifier
  chatId: String,         // Chat/contact identifier
  from: String,           // Sender ID
  to: String,             // Recipient ID
  body: String,           // Message content
  type: String,           // Message type
  hasMedia: Boolean,      // Contains media?
  timestamp: Number,      // Unix timestamp
  ack: Number,           // Delivery status (0-5)
  fromMe: Boolean,       // Sent by me?
  isForwarded: Boolean,  // Forwarded message?
  createdAt: Date,       // Database record creation
  updatedAt: Date        // Last update
}
```

### Field Details

#### messageId
- **Type**: String
- **Required**: Yes
- **Unique**: Yes
- **Example**: `"true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1"`
- **Description**: WhatsApp's unique message identifier

#### chatId
- **Type**: String
- **Required**: Yes
- **Example**: `"1234567890@c.us"` (individual) or `"123456789@g.us"` (group)
- **Description**: Chat or group identifier

#### from
- **Type**: String
- **Required**: Yes
- **Example**: `"1234567890@c.us"`
- **Description**: Sender's WhatsApp ID

#### to
- **Type**: String
- **Required**: Yes
- **Example**: `"0987654321@c.us"`
- **Description**: Recipient's WhatsApp ID

#### body
- **Type**: String
- **Required**: No
- **Example**: `"Hello, how are you?"`
- **Description**: Text content of the message

#### type
- **Type**: String
- **Required**: Yes
- **Values**: 
  - `chat` - Text message
  - `image` - Image
  - `video` - Video
  - `audio` - Audio/voice
  - `document` - Document
  - `ptt` - Voice message (push-to-talk)
  - `sticker` - Sticker
  - `location` - Location
  - `poll` - Poll
  - `reaction` - Emoji reaction

#### hasMedia
- **Type**: Boolean
- **Required**: Yes
- **Description**: Whether message contains media attachment

#### timestamp
- **Type**: Number
- **Required**: Yes
- **Example**: `1696176000`
- **Description**: Unix timestamp of message

#### ack
- **Type**: Number
- **Required**: Yes
- **Values**:
  - `0` - Error/Failed
  - `1` - Pending
  - `2` - Server received
  - `3` - Device received (✓✓)
  - `4` - Read (blue ✓✓)
  - `5` - Played (for audio/video)

#### fromMe
- **Type**: Boolean
- **Required**: Yes
- **Description**: Message sent by authenticated account

#### isForwarded
- **Type**: Boolean
- **Required**: Yes
- **Description**: Message was forwarded

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "messageId": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1",
  "chatId": "1234567890@c.us",
  "from": "0987654321@c.us",
  "to": "1234567890@c.us",
  "body": "Hello! How can I help you today?",
  "type": "chat",
  "hasMedia": false,
  "timestamp": 1696176000,
  "ack": 4,
  "fromMe": false,
  "isForwarded": false,
  "createdAt": "2024-10-01T12:00:00.000Z",
  "updatedAt": "2024-10-01T12:00:05.000Z"
}
```

## Contacts Collection

### Schema

```javascript
{
  contactId: String,      // WhatsApp contact ID
  name: String,           // Contact name
  number: String,         // Phone number
  isMyContact: Boolean,   // In contact list?
  isBlocked: Boolean,     // Contact blocked?
  profilePicUrl: String,  // Profile picture URL
  labels: [String],       // Contact labels/tags
  createdAt: Date,        // Database record creation
  updatedAt: Date         // Last update
}
```

### Field Details

#### contactId
- **Type**: String
- **Required**: Yes
- **Unique**: Yes
- **Example**: `"1234567890@c.us"`
- **Description**: WhatsApp contact identifier

#### name
- **Type**: String
- **Required**: No
- **Example**: `"John Doe"`
- **Description**: Contact's display name

#### number
- **Type**: String
- **Required**: Yes
- **Example**: `"1234567890"`
- **Description**: Phone number without country code prefix

#### isMyContact
- **Type**: Boolean
- **Required**: Yes
- **Description**: Contact is in phone's contact list

#### isBlocked
- **Type**: Boolean
- **Required**: Yes
- **Default**: false
- **Description**: Contact has been blocked

#### profilePicUrl
- **Type**: String
- **Required**: No
- **Example**: `"https://pps.whatsapp.net/..."`
- **Description**: URL to contact's profile picture

#### labels
- **Type**: Array of Strings
- **Required**: No
- **Example**: `["customer", "vip", "support"]`
- **Description**: Custom labels/tags for organization

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "contactId": "1234567890@c.us",
  "name": "John Doe",
  "number": "1234567890",
  "isMyContact": true,
  "isBlocked": false,
  "profilePicUrl": "https://pps.whatsapp.net/v/...",
  "labels": ["customer", "priority"],
  "createdAt": "2024-10-01T10:00:00.000Z",
  "updatedAt": "2024-10-01T12:00:00.000Z"
}
```

## WebhookLogs Collection

### Schema

```javascript
{
  event: String,          // Event type
  payload: Mixed,         // Event data
  webhookUrl: String,     // Target URL
  status: String,         // Delivery status
  statusCode: Number,     // HTTP status code
  retryCount: Number,     // Retry attempts
  errorMessage: String,   // Error details
  createdAt: Date,        // Log creation
  updatedAt: Date         // Last update
}
```

### Field Details

#### event
- **Type**: String
- **Required**: Yes
- **Example**: `"message_create"`, `"message_reaction"`, `"group_join"`
- **Description**: Type of webhook event

#### payload
- **Type**: Mixed (any JSON object)
- **Required**: Yes
- **Description**: Complete event data sent to webhook

#### webhookUrl
- **Type**: String
- **Required**: Yes
- **Example**: `"https://api.example.com/webhook"`
- **Description**: Webhook endpoint URL

#### status
- **Type**: String
- **Required**: Yes
- **Values**:
  - `pending` - Waiting to be sent
  - `success` - Successfully delivered
  - `failed` - All retries failed
  - `retrying` - Currently retrying
- **Description**: Current delivery status

#### statusCode
- **Type**: Number
- **Required**: No
- **Example**: `200`, `404`, `500`
- **Description**: HTTP response status code

#### retryCount
- **Type**: Number
- **Required**: Yes
- **Default**: 0
- **Description**: Number of retry attempts made

#### errorMessage
- **Type**: String
- **Required**: No
- **Example**: `"Connection timeout"`
- **Description**: Error message if delivery failed

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "event": "message_create",
  "payload": {
    "id": "true_1234567890@c.us_3EB0",
    "body": "Hello!",
    "from": "1234567890@c.us",
    "timestamp": 1696176000
  },
  "webhookUrl": "https://api.example.com/webhook",
  "status": "success",
  "statusCode": 200,
  "retryCount": 0,
  "errorMessage": null,
  "createdAt": "2024-10-01T12:00:00.000Z",
  "updatedAt": "2024-10-01T12:00:00.500Z"
}
```

## Indexes

### Recommended Indexes

**Messages Collection**:
```javascript
db.messages.createIndex({ messageId: 1 }, { unique: true })
db.messages.createIndex({ chatId: 1, timestamp: -1 })
db.messages.createIndex({ from: 1, timestamp: -1 })
db.messages.createIndex({ timestamp: -1 })
db.messages.createIndex({ fromMe: 1, ack: 1 })
```

**Contacts Collection**:
```javascript
db.contacts.createIndex({ contactId: 1 }, { unique: true })
db.contacts.createIndex({ number: 1 })
db.contacts.createIndex({ isBlocked: 1 })
db.contacts.createIndex({ labels: 1 })
```

**WebhookLogs Collection**:
```javascript
db.webhooklogs.createIndex({ event: 1, createdAt: -1 })
db.webhooklogs.createIndex({ status: 1, createdAt: -1 })
db.webhooklogs.createIndex({ createdAt: -1 })
```

### Create Indexes

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh whatsapp-api

# Create indexes
db.messages.createIndex({ messageId: 1 }, { unique: true });
db.messages.createIndex({ chatId: 1, timestamp: -1 });
db.contacts.createIndex({ contactId: 1 }, { unique: true });
db.webhooklogs.createIndex({ event: 1, createdAt: -1 });

# Verify indexes
db.messages.getIndexes();
db.contacts.getIndexes();
db.webhooklogs.getIndexes();
```

## Querying Examples

### Messages Queries

**Get recent messages for a chat**:
```javascript
db.messages.find({ 
  chatId: "1234567890@c.us" 
})
.sort({ timestamp: -1 })
.limit(50)
```

**Get unread messages**:
```javascript
db.messages.find({ 
  fromMe: false,
  ack: { $lt: 4 }
})
.sort({ timestamp: -1 })
```

**Get messages with media**:
```javascript
db.messages.find({ 
  hasMedia: true,
  type: "image"
})
.sort({ timestamp: -1 })
.limit(20)
```

**Count messages by type**:
```javascript
db.messages.aggregate([
  {
    $group: {
      _id: "$type",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
])
```

**Get messages from last 24 hours**:
```javascript
const oneDayAgo = Date.now() / 1000 - 86400;
db.messages.find({ 
  timestamp: { $gte: oneDayAgo }
})
.sort({ timestamp: -1 })
```

### Contacts Queries

**Get all blocked contacts**:
```javascript
db.contacts.find({ isBlocked: true })
```

**Find contact by phone number**:
```javascript
db.contacts.findOne({ number: "1234567890" })
```

**Get contacts with specific label**:
```javascript
db.contacts.find({ labels: "customer" })
```

**Count contacts**:
```javascript
db.contacts.countDocuments()
```

### WebhookLogs Queries

**Get failed webhooks**:
```javascript
db.webhooklogs.find({ 
  status: "failed" 
})
.sort({ createdAt: -1 })
.limit(10)
```

**Get webhook statistics**:
```javascript
db.webhooklogs.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  }
])
```

**Get webhook logs for specific event**:
```javascript
db.webhooklogs.find({ 
  event: "message_create" 
})
.sort({ createdAt: -1 })
.limit(20)
```

**Get webhooks from last hour**:
```javascript
const oneHourAgo = new Date(Date.now() - 3600000);
db.webhooklogs.find({ 
  createdAt: { $gte: oneHourAgo }
})
```

## Data Retention

### Configure Retention Policies

**Delete old messages**:
```javascript
// Delete messages older than 90 days
const ninetyDaysAgo = Date.now() / 1000 - (90 * 86400);
db.messages.deleteMany({ 
  timestamp: { $lt: ninetyDaysAgo }
})
```

**Delete old webhook logs**:
```javascript
// Delete logs older than 30 days
const thirtyDaysAgo = new Date(Date.now() - (30 * 86400000));
db.webhooklogs.deleteMany({ 
  createdAt: { $lt: thirtyDaysAgo }
})
```

### Automated Cleanup Script

```javascript
// cleanup.js
const { MongoClient } = require('mongodb');

async function cleanup() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('whatsapp-api');
    
    // Delete messages older than 90 days
    const ninetyDaysAgo = Date.now() / 1000 - (90 * 86400);
    const messagesResult = await db.collection('messages').deleteMany({
      timestamp: { $lt: ninetyDaysAgo }
    });
    console.log(`Deleted ${messagesResult.deletedCount} old messages`);
    
    // Delete webhook logs older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - (30 * 86400000));
    const logsResult = await db.collection('webhooklogs').deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    console.log(`Deleted ${logsResult.deletedCount} old webhook logs`);
    
  } finally {
    await client.close();
  }
}

cleanup().catch(console.error);
```

**Schedule with cron**:
```bash
# Run cleanup daily at 2 AM
0 2 * * * node /path/to/cleanup.js
```

## Backup and Restore

### Backup Database

```bash
# Backup entire database
docker-compose exec mongodb mongodump \
  --db=whatsapp-api \
  --out=/backup

# Copy backup from container
docker cp whatsapp-api-mongodb-1:/backup ./backup

# Backup specific collection
docker-compose exec mongodb mongodump \
  --db=whatsapp-api \
  --collection=messages \
  --out=/backup
```

### Restore Database

```bash
# Restore entire database
docker-compose exec mongodb mongorestore \
  --db=whatsapp-api \
  /backup/whatsapp-api

# Restore specific collection
docker-compose exec mongodb mongorestore \
  --db=whatsapp-api \
  --collection=messages \
  /backup/whatsapp-api/messages.bson
```

## Database Management

### Connect to MongoDB

```bash
# Using Docker
docker-compose exec mongodb mongosh whatsapp-api

# Using connection string
mongosh mongodb://localhost:27017/whatsapp-api
```

### Common Commands

```javascript
// Show all collections
show collections

// Count documents
db.messages.countDocuments()
db.contacts.countDocuments()
db.webhooklogs.countDocuments()

// Database statistics
db.stats()

// Collection statistics
db.messages.stats()

// Drop collection
db.webhooklogs.drop()

// Clear all data from collection
db.webhooklogs.deleteMany({})
```

### Export Data

```bash
# Export to JSON
docker-compose exec mongodb mongoexport \
  --db=whatsapp-api \
  --collection=messages \
  --out=/tmp/messages.json

# Export to CSV
docker-compose exec mongodb mongoexport \
  --db=whatsapp-api \
  --collection=contacts \
  --type=csv \
  --fields=contactId,name,number,isBlocked \
  --out=/tmp/contacts.csv
```

## Performance Optimization

### Monitor Query Performance

```javascript
// Enable profiling
db.setProfilingLevel(2)

// View slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 })

// Explain query
db.messages.find({ chatId: "1234567890@c.us" }).explain("executionStats")
```

### Optimize Queries

1. Use indexes for frequently queried fields
2. Limit result sets with `.limit()`
3. Use projection to fetch only needed fields
4. Avoid `$where` and `$regex` when possible
5. Use covered queries when applicable

---

[← Back to Webhook Events](Webhook-Events.md) | [Next: Troubleshooting →](Troubleshooting.md)
