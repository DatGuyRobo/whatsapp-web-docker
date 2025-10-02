# API Reference

Complete API endpoint documentation for WhatsApp Web API v2.0.

## Table of Contents

- [Authentication](#authentication)
- [Health & Status](#health--status)
- [Messaging](#messaging)
- [Media](#media)
- [Contacts](#contacts)
- [Chats](#chats)
- [Groups](#groups)
- [Polls](#polls)
- [Status/Stories](#statusstories)
- [Reactions](#reactions)
- [Management](#management)

## Authentication

All API endpoints (except `/qr` and `/health`) require authentication using an API key.

### Methods

**Method 1: X-API-Key Header**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/endpoint
```

**Method 2: Authorization Bearer**
```bash
curl -H "Authorization: Bearer your-api-key" http://localhost:3000/api/endpoint
```

### Error Response

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

---

## Health & Status

### GET /health

Check API health and readiness.

**Authentication**: Not required

**Request**:
```bash
curl http://localhost:3000/health
```

**Response**:
```json
{
  "status": "ok",
  "ready": true,
  "database": true,
  "timestamp": "2024-10-01T12:00:00.000Z"
}
```

### GET /qr

Display QR code for WhatsApp authentication.

**Authentication**: Not required

**Request**:
```bash
# Open in browser
http://localhost:3000/qr
```

**Response**: HTML page with QR code image

### GET /api/info

Get authenticated WhatsApp client information.

**Authentication**: Required

**Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/info
```

**Response**:
```json
{
  "info": {
    "pushname": "My WhatsApp",
    "wid": {
      "server": "c.us",
      "user": "1234567890",
      "_serialized": "1234567890@c.us"
    }
  },
  "state": {
    "platform": "android",
    "phone": {
      "wa_version": "2.23.20.5",
      "os_version": "Android 12"
    }
  }
}
```

### GET /api/state

Get current WhatsApp connection state.

**Authentication**: Required

**Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/state
```

**Response**:
```json
{
  "state": "CONNECTED"
}
```

**States**: `CONFLICT`, `CONNECTED`, `DEPRECATED_VERSION`, `OPENING`, `PAIRING`, `PROXYBLOCK`, `SMB_TOS_BLOCK`, `TIMEOUT`, `TOS_BLOCK`, `UNLAUNCHED`, `UNPAIRED`, `UNPAIRED_IDLE`

---

## Messaging

### POST /api/send-message

Send a text message to a contact or group.

**Authentication**: Required

**Request Body**:
```json
{
  "number": "1234567890",
  "message": "Hello from WhatsApp API!"
}
```

**Parameters**:
- `number` (string, required): Phone number or chat ID
  - Format: `1234567890` or `1234567890@c.us` or `group-id@g.us`
- `message` (string, required): Text message to send

**Request**:
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "message": "Hello!"
  }'
```

**Response**:
```json
{
  "success": true,
  "messageId": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1"
}
```

### POST /api/send-bulk-messages

Send messages to multiple recipients with automatic queuing.

**Authentication**: Required

**Request Body**:
```json
{
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
}
```

**Parameters**:
- `messages` (array, required): Array of message objects
  - `number` (string, required): Phone number
  - `message` (string, required): Message text
  - `delay` (integer, optional): Delay before sending (ms)

**Request**:
```bash
curl -X POST http://localhost:3000/api/send-bulk-messages \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"number": "1234567890", "message": "Hello 1", "delay": 2000},
      {"number": "0987654321", "message": "Hello 2", "delay": 2000}
    ]
  }'
```

**Response**:
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

### POST /api/set-typing

Show or hide typing indicator in a chat.

**Authentication**: Required

**Request Body**:
```json
{
  "chatId": "1234567890@c.us",
  "typing": true
}
```

**Parameters**:
- `chatId` (string, required): Chat ID
- `typing` (boolean, required): `true` to show, `false` to hide

**Request**:
```bash
curl -X POST http://localhost:3000/api/set-typing \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "1234567890@c.us",
    "typing": true
  }'
```

**Response**:
```json
{
  "success": true
}
```

---

## Media

### POST /api/send-media

Send media from URL or base64.

**Authentication**: Required

**Request Body (URL)**:
```json
{
  "number": "1234567890",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Check this out!",
  "filename": "image.jpg"
}
```

**Request Body (Base64)**:
```json
{
  "number": "1234567890",
  "mediaBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "mimetype": "image/jpeg",
  "filename": "image.jpg",
  "caption": "Check this out!"
}
```

**Parameters**:
- `number` (string, required): Phone number
- `mediaUrl` (string): Media file URL (either URL or base64 required)
- `mediaBase64` (string): Base64 encoded media
- `mimetype` (string): MIME type (required for base64)
- `filename` (string, optional): File name
- `caption` (string, optional): Media caption
- `sendAudioAsVoice` (boolean, optional): Send audio as voice message
- `sendVideoAsGif` (boolean, optional): Send video as GIF

**Request**:
```bash
curl -X POST http://localhost:3000/api/send-media \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "mediaUrl": "https://example.com/image.jpg",
    "caption": "Hello!"
  }'
```

**Response**:
```json
{
  "success": true,
  "messageId": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1"
}
```

### POST /api/send-file

Upload and send a file.

**Authentication**: Required

**Request**: Multipart form data
- `number` (string, required): Phone number
- `file` (file, required): File to upload
- `caption` (string, optional): File caption

**Request**:
```bash
curl -X POST http://localhost:3000/api/send-file \
  -H "X-API-Key: your-api-key" \
  -F "number=1234567890" \
  -F "file=@/path/to/document.pdf" \
  -F "caption=Here's the document"
```

**Response**:
```json
{
  "success": true,
  "messageId": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1"
}
```

**Supported Media Types**:
- Images: JPEG, PNG, GIF, WebP
- Videos: MP4, AVI, MOV
- Audio: MP3, OGG, WAV, AAC
- Documents: PDF, DOC, DOCX, XLS, XLSX, TXT, etc.
- Max size: 50MB

---

## Contacts

### GET /api/contacts

Get all contacts.

**Authentication**: Required

**Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/contacts
```

**Response**:
```json
{
  "contacts": [
    {
      "id": "1234567890@c.us",
      "name": "John Doe",
      "number": "1234567890",
      "isMyContact": true,
      "isBlocked": false
    }
  ]
}
```

### GET /api/profile-picture/:contactId

Get contact's profile picture.

**Authentication**: Required

**Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/profile-picture/1234567890@c.us
```

**Response**:
```json
{
  "profilePicUrl": "https://pps.whatsapp.net/..."
}
```

### POST /api/block-contact

Block a contact.

**Authentication**: Required

**Request Body**:
```json
{
  "contactId": "1234567890@c.us"
}
```

**Request**:
```bash
curl -X POST http://localhost:3000/api/block-contact \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"contactId": "1234567890@c.us"}'
```

**Response**:
```json
{
  "success": true,
  "message": "Contact blocked successfully"
}
```

### POST /api/unblock-contact

Unblock a contact.

**Authentication**: Required

**Request Body**:
```json
{
  "contactId": "1234567890@c.us"
}
```

**Request**:
```bash
curl -X POST http://localhost:3000/api/unblock-contact \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"contactId": "1234567890@c.us"}'
```

**Response**:
```json
{
  "success": true,
  "message": "Contact unblocked successfully"
}
```

---

## Chats

### GET /api/chats

Get all chats.

**Authentication**: Required

**Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/chats
```

**Response**:
```json
{
  "chats": [
    {
      "id": "1234567890@c.us",
      "name": "John Doe",
      "isGroup": false,
      "unreadCount": 3,
      "archived": false,
      "pinned": false,
      "lastMessage": {
        "body": "Hello!",
        "timestamp": 1696176000
      }
    }
  ]
}
```

### GET /api/chat/:chatId

Get specific chat information.

**Authentication**: Required

**Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/chat/1234567890@c.us
```

**Response**:
```json
{
  "chat": {
    "id": "1234567890@c.us",
    "name": "John Doe",
    "isGroup": false,
    "unreadCount": 3,
    "archived": false,
    "pinned": false
  }
}
```

### GET /api/chat/:chatId/messages

Get chat messages.

**Authentication**: Required

**Query Parameters**:
- `limit` (integer, optional): Number of messages to retrieve (default: 50)

**Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/api/chat/1234567890@c.us/messages?limit=100"
```

**Response**:
```json
{
  "messages": [
    {
      "id": "true_1234567890@c.us_3EB0",
      "body": "Hello!",
      "timestamp": 1696176000,
      "from": "1234567890@c.us",
      "to": "0987654321@c.us",
      "fromMe": false,
      "hasMedia": false
    }
  ]
}
```

### POST /api/chat/:chatId/archive

Archive a chat.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/chat/1234567890@c.us/archive \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/chat/:chatId/unarchive

Unarchive a chat.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/chat/1234567890@c.us/unarchive \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/chat/:chatId/pin

Pin a chat.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/chat/1234567890@c.us/pin \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/chat/:chatId/unpin

Unpin a chat.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/chat/1234567890@c.us/unpin \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/chat/:chatId/mute

Mute a chat.

**Authentication**: Required

**Request Body**:
```json
{
  "duration": 3600000
}
```

**Parameters**:
- `duration` (integer, optional): Mute duration in milliseconds (omit for indefinite)

**Request**:
```bash
curl -X POST http://localhost:3000/api/chat/1234567890@c.us/mute \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"duration": 3600000}'
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/chat/:chatId/unmute

Unmute a chat.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/chat/1234567890@c.us/unmute \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/chat/:chatId/mark-read

Mark chat as read.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/chat/1234567890@c.us/mark-read \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/chat/:chatId/mark-unread

Mark chat as unread.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/chat/1234567890@c.us/mark-unread \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

### DELETE /api/chat/:chatId

Delete a chat.

**Authentication**: Required

**Request**:
```bash
curl -X DELETE http://localhost:3000/api/chat/1234567890@c.us \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/chat/:chatId/clear-messages

Clear all messages in a chat.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/chat/1234567890@c.us/clear-messages \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

---

## Groups

### POST /api/group/create

Create a new group.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "My Group",
  "participants": ["1234567890", "0987654321"]
}
```

**Parameters**:
- `name` (string, required): Group name
- `participants` (array, required): Array of phone numbers

**Request**:
```bash
curl -X POST http://localhost:3000/api/group/create \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Group",
    "participants": ["1234567890", "0987654321"]
  }'
```

**Response**:
```json
{
  "success": true,
  "groupId": "123456789-1234567890@g.us"
}
```

### GET /api/group/:groupId

Get group information.

**Authentication**: Required

**Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/group/123456789-1234567890@g.us
```

**Response**:
```json
{
  "group": {
    "id": "123456789-1234567890@g.us",
    "name": "My Group",
    "description": "Group description",
    "participants": [
      {
        "id": "1234567890@c.us",
        "isAdmin": true,
        "isSuperAdmin": true
      }
    ],
    "participantCount": 5,
    "owner": "1234567890@c.us"
  }
}
```

### POST /api/group/:groupId/add-participants

Add participants to a group.

**Authentication**: Required

**Request Body**:
```json
{
  "participants": ["1234567890", "0987654321"]
}
```

**Request**:
```bash
curl -X POST http://localhost:3000/api/group/123456789@g.us/add-participants \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "participants": ["1234567890"]
  }'
```

**Response**:
```json
{
  "success": true,
  "added": ["1234567890@c.us"]
}
```

### POST /api/group/:groupId/remove-participants

Remove participants from a group.

**Authentication**: Required

**Request Body**:
```json
{
  "participants": ["1234567890"]
}
```

**Request**:
```bash
curl -X POST http://localhost:3000/api/group/123456789@g.us/remove-participants \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "participants": ["1234567890"]
  }'
```

**Response**:
```json
{
  "success": true,
  "removed": ["1234567890@c.us"]
}
```

### POST /api/group/:groupId/promote

Promote members to admin.

**Authentication**: Required

**Request Body**:
```json
{
  "participants": ["1234567890"]
}
```

**Request**:
```bash
curl -X POST http://localhost:3000/api/group/123456789@g.us/promote \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "participants": ["1234567890"]
  }'
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/group/:groupId/demote

Demote admins to regular members.

**Authentication**: Required

**Request Body**:
```json
{
  "participants": ["1234567890"]
}
```

**Request**:
```bash
curl -X POST http://localhost:3000/api/group/123456789@g.us/demote \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "participants": ["1234567890"]
  }'
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/group/:groupId/settings

Update group settings.

**Authentication**: Required

**Request Body**:
```json
{
  "messageSend": "adminsOnly",
  "infoChange": "adminsOnly"
}
```

**Parameters**:
- `messageSend` (string): `"all"` or `"adminsOnly"`
- `infoChange` (string): `"all"` or `"adminsOnly"`

**Request**:
```bash
curl -X POST http://localhost:3000/api/group/123456789@g.us/settings \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messageSend": "adminsOnly",
    "infoChange": "adminsOnly"
  }'
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/group/:groupId/leave

Leave a group.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/group/123456789@g.us/leave \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

---

## Polls

### POST /api/create-poll

Create a poll in a chat.

**Authentication**: Required

**Request Body**:
```json
{
  "number": "1234567890",
  "question": "What is your favorite color?",
  "options": ["Red", "Blue", "Green", "Yellow"],
  "allowMultipleAnswers": false
}
```

**Parameters**:
- `number` (string, required): Phone number or chat ID
- `question` (string, required): Poll question
- `options` (array, required): Array of poll options (2-12 items)
- `allowMultipleAnswers` (boolean, optional): Allow multiple selections

**Request**:
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

**Response**:
```json
{
  "success": true,
  "messageId": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1"
}
```

### GET /api/poll-votes/:messageId

Get poll results.

**Authentication**: Required

**Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/poll-votes/true_1234567890@c.us_3EB0
```

**Response**:
```json
{
  "votes": [
    {
      "option": "Red",
      "voters": ["1234567890@c.us", "0987654321@c.us"]
    },
    {
      "option": "Blue",
      "voters": ["1111111111@c.us"]
    }
  ]
}
```

---

## Status/Stories

### POST /api/send-status

Post a status/story.

**Authentication**: Required

**Request Body (Text Status)**:
```json
{
  "content": "Hello from the API!",
  "backgroundColor": "#25D366",
  "font": 1
}
```

**Request Body (Media Status)**:
```json
{
  "mediaUrl": "https://example.com/image.jpg",
  "content": "Check this out!"
}
```

**Parameters**:
- `content` (string): Status text
- `backgroundColor` (string, optional): Background color (hex)
- `font` (integer, optional): Font style (0-5)
- `mediaUrl` (string): Media URL

**Request (Text)**:
```bash
curl -X POST http://localhost:3000/api/send-status \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello!",
    "backgroundColor": "#25D366"
  }'
```

**Request (Media)**:
```bash
curl -X POST http://localhost:3000/api/send-status \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrl": "https://example.com/image.jpg",
    "content": "Check this out!"
  }'
```

**Response**:
```json
{
  "success": true,
  "statusId": "status_id_here"
}
```

---

## Reactions

### POST /api/send-reaction

Send emoji reaction to a message.

**Authentication**: Required

**Request Body**:
```json
{
  "messageId": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1",
  "reaction": "👍"
}
```

**Parameters**:
- `messageId` (string, required): Message ID
- `reaction` (string, required): Emoji (or empty string to remove)

**Request**:
```bash
curl -X POST http://localhost:3000/api/send-reaction \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1",
    "reaction": "👍"
  }'
```

**Response**:
```json
{
  "success": true
}
```

**Remove Reaction**:
```bash
curl -X POST http://localhost:3000/api/send-reaction \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "true_1234567890@c.us_3EB0C9A4B7D8E5F9A2C1",
    "reaction": ""
  }'
```

---

## Management

### POST /api/logout

Logout from WhatsApp.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/logout \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/restart

Restart WhatsApp client.

**Authentication**: Required

**Request**:
```bash
curl -X POST http://localhost:3000/api/restart \
  -H "X-API-Key: your-api-key"
```

**Response**:
```json
{
  "success": true
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Common HTTP Status Codes

- `200 OK`: Success
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: WhatsApp client not ready

### Example Error Responses

**401 Unauthorized**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

**503 Service Unavailable**:
```json
{
  "error": "Client not ready"
}
```

**429 Too Many Requests**:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

**400 Bad Request**:
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "number",
      "message": "number is required"
    }
  ]
}
```

---

## Rate Limiting

Default limits:
- 100 requests per minute per IP
- Configurable via environment variables

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696176060
```

---

## Best Practices

1. **Always handle errors**: Check response status codes
2. **Respect rate limits**: Implement exponential backoff
3. **Use bulk endpoints**: For multiple operations
4. **Validate phone numbers**: Use correct format
5. **Store message IDs**: For tracking and reactions
6. **Monitor webhooks**: Set up event handlers
7. **Secure API keys**: Never expose in client-side code
8. **Use HTTPS**: In production environments

---

[← Back to Home](Home.md) | [Next: Webhook Events →](Webhook-Events.md)
