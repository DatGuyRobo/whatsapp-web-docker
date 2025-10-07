# n8n MCP Integration Guide

This guide explains how to integrate the WhatsApp MCP Server with n8n's MCP Client feature.

## Prerequisites

1. **n8n** with MCP support (latest version)
2. **WhatsApp Web API** running on `http://localhost:3000`
3. **WhatsApp authenticated** (scan QR code at `http://localhost:3000/qr`)

## Setup

### 1. Install Dependencies

```bash
cd /opt/containers/whatsapp-web/mcp-server
npm install
```

### 2. Configure Environment

Edit `.env` file:

```env
# WhatsApp API Configuration
WHATSAPP_API_URL=http://localhost:3000
WHATSAPP_API_KEY=your-secret-api-key-change-this

# MCP Server Configuration (for HTTP mode)
MCP_SERVER_PORT=3001
```

### 3. Start the HTTP MCP Server

```bash
npm run start:http
```

This will start the MCP server with HTTP/SSE transport on port 3001.

You should see:
```
WhatsApp MCP Server (HTTP) running on http://localhost:3001
SSE endpoint: http://localhost:3001/sse

For n8n MCP integration, use: http://localhost:3001/sse
```

### 4. Verify Server is Running

Open your browser or use curl:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "whatsapp-mcp-server"
}
```

Get server info:
```bash
curl http://localhost:3001/
```

## n8n Configuration

### Add MCP Server to n8n

In n8n, configure the MCP client with the following endpoint:

**MCP Server URL (Streamable HTTP):**
```
http://localhost:3001/mcp
```

If your n8n is running in Docker, use:
```
http://host.docker.internal:3001/mcp
```

Or if running on a different machine:
```
http://YOUR_SERVER_IP:3001/mcp
```

**Transport Type:** Streamable HTTP (MCP 2025-03-26 specification)

### Available Tools in n8n

Once connected, you'll have access to these WhatsApp tools in n8n:

#### Messaging
- `send_whatsapp_message` - Send text message
- `send_whatsapp_media` - Send media from URL
- `send_bulk_whatsapp_messages` - Send bulk messages
- `send_whatsapp_reaction` - Send reaction to message
- `create_whatsapp_poll` - Create a poll

#### Chat Management
- `get_whatsapp_chats` - Get all chats
- `get_chat_messages` - Get messages from chat
- `archive_whatsapp_chat` - Archive/unarchive chat
- `pin_whatsapp_chat` - Pin/unpin chat
- `mark_whatsapp_chat_read` - Mark as read/unread

#### Contacts
- `get_whatsapp_contacts` - Get all contacts
- `get_whatsapp_profile_picture` - Get profile picture
- `block_whatsapp_contact` - Block contact
- `unblock_whatsapp_contact` - Unblock contact

#### Groups
- `create_whatsapp_group` - Create new group
- `get_whatsapp_group_info` - Get group information
- `add_group_participants` - Add members to group
- `remove_group_participants` - Remove members from group

#### Status
- `get_whatsapp_info` - Get WhatsApp client status

## Example n8n Workflows

### 1. Send WhatsApp Message on Webhook

**Workflow:**
1. **Webhook** node (trigger)
2. **MCP Tool** node
   - Tool: `send_whatsapp_message`
   - Parameters:
     - `number`: `{{ $json.phone }}`
     - `message`: `{{ $json.message }}`

### 2. Send WhatsApp When Email Received

**Workflow:**
1. **Email Trigger** node
2. **MCP Tool** node
   - Tool: `send_whatsapp_message`
   - Parameters:
     - `number`: `1234567890`
     - `message`: `New email from {{ $json.from }}: {{ $json.subject }}`

### 3. Daily WhatsApp Summary

**Workflow:**
1. **Schedule Trigger** node (daily at 9 AM)
2. **HTTP Request** node (get data from your API)
3. **MCP Tool** node
   - Tool: `send_whatsapp_message`
   - Parameters:
     - `number`: `1234567890`
     - `message`: `Daily summary: {{ $json.summary }}`

### 4. WhatsApp Bot with AI

**Workflow:**
1. **Webhook** node (receives WhatsApp messages via WhatsApp API webhook)
2. **AI Agent** node (process message with AI)
3. **MCP Tool** node
   - Tool: `send_whatsapp_message`
   - Parameters:
     - `number`: `{{ $json.from }}`
     - `message`: `{{ $json.aiResponse }}`

### 5. Bulk WhatsApp Messages

**Workflow:**
1. **Schedule Trigger** node
2. **HTTP Request** node (get contacts list)
3. **MCP Tool** node
   - Tool: `send_bulk_whatsapp_messages`
   - Parameters:
     - `messages`: `{{ $json.contacts }}`

## Tool Usage Examples

### Send Message

```json
{
  "tool": "send_whatsapp_message",
  "arguments": {
    "number": "1234567890",
    "message": "Hello from n8n!"
  }
}
```

### Send Media

```json
{
  "tool": "send_whatsapp_media",
  "arguments": {
    "number": "1234567890",
    "mediaUrl": "https://example.com/image.jpg",
    "caption": "Check this out!"
  }
}
```

### Create Poll

```json
{
  "tool": "create_whatsapp_poll",
  "arguments": {
    "number": "1234567890",
    "question": "What's your favorite color?",
    "options": ["Red", "Blue", "Green", "Yellow"],
    "allowMultipleAnswers": false
  }
}
```

### Get Chat Messages

```json
{
  "tool": "get_chat_messages",
  "arguments": {
    "chatId": "1234567890@c.us",
    "limit": 20
  }
}
```

### Send Bulk Messages

```json
{
  "tool": "send_bulk_whatsapp_messages",
  "arguments": {
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
}
```

## Phone Number Format

Phone numbers should be formatted as:
- Include country code
- No + sign
- No spaces or special characters
- Example: `1234567890` for US number +1 234-567-890

## Chat ID Format

- **Individual chats**: `{phone_number}@c.us` (e.g., `1234567890@c.us`)
- **Group chats**: `{group_id}@g.us` (e.g., `123456789@g.us`)

## Running in Production

### Using PM2

```bash
npm install -g pm2
pm2 start index-http.js --name whatsapp-mcp-http
pm2 save
pm2 startup
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "index-http.js"]
```

Build and run:

```bash
docker build -t whatsapp-mcp-http .
docker run -d \
  --name whatsapp-mcp-http \
  -p 3001:3001 \
  --env-file .env \
  whatsapp-mcp-http
```

### Using Docker Compose

Add to `docker-compose.yml`:

```yaml
services:
  whatsapp-mcp-http:
    build: ./mcp-server
    ports:
      - "3001:3001"
    environment:
      - WHATSAPP_API_URL=http://whatsapp-api:3000
      - WHATSAPP_API_KEY=${WHATSAPP_API_KEY}
      - MCP_SERVER_PORT=3001
    depends_on:
      - whatsapp-api
    restart: unless-stopped
```

## Troubleshooting

### MCP Server Not Connecting

1. **Check server is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check logs:**
   ```bash
   # If running with npm
   # Check terminal output

   # If running with PM2
   pm2 logs whatsapp-mcp-http

   # If running with Docker
   docker logs whatsapp-mcp-http
   ```

3. **Verify environment variables:**
   ```bash
   cat .env
   ```

### n8n Can't Reach MCP Server

1. **If n8n is in Docker**, use:
   ```
   http://host.docker.internal:3001/sse
   ```

2. **If on different machines**, ensure firewall allows port 3001:
   ```bash
   sudo ufw allow 3001
   ```

3. **Test from n8n container:**
   ```bash
   docker exec -it n8n curl http://host.docker.internal:3001/health
   ```

### WhatsApp API Connection Issues

1. **Verify WhatsApp API is running:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check API key is correct:**
   ```bash
   curl -H "X-API-Key: your-api-key" http://localhost:3000/api/info
   ```

3. **Verify WhatsApp is authenticated:**
   - Visit: `http://localhost:3000/qr`
   - Scan QR code with WhatsApp mobile app

### Tool Execution Errors

1. **Check phone number format** (no + sign, with country code)
2. **Verify chat ID format** (must include `@c.us` or `@g.us`)
3. **Check WhatsApp API logs** for detailed errors
4. **Test tool directly:**
   ```bash
   curl -X POST http://localhost:3000/api/send-message \
     -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"number":"1234567890","message":"test"}'
   ```

## Security Considerations

1. **Use HTTPS** in production with reverse proxy (nginx, Traefik)
2. **Restrict access** to MCP server port (only allow n8n IP)
3. **Keep API key secure** - never commit to git
4. **Monitor usage** to prevent abuse
5. **Use firewall rules** to restrict access

## Advanced Configuration

### Custom Port

Edit `.env`:
```env
MCP_SERVER_PORT=8080
```

### CORS Configuration

The server allows all origins by default. To restrict, edit `index-http.js`:

```javascript
app.use(cors({
  origin: ['http://your-n8n-instance.com']
}));
```

### Timeout Configuration

Edit `index-http.js` to adjust timeout:

```javascript
const whatsappAPI = axios.create({
  baseURL: WHATSAPP_API_URL,
  headers: {
    'X-API-Key': WHATSAPP_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds
});
```

## Performance Tips

1. **Use bulk messaging** for multiple recipients
2. **Add delays** between bulk messages to avoid rate limits
3. **Monitor server resources** with PM2 or Docker stats
4. **Use Redis** for session management in multi-instance setups
5. **Enable compression** in reverse proxy

## Support

For issues:
1. Check server logs
2. Verify WhatsApp API is running and authenticated
3. Test tools directly via API
4. Check n8n MCP client configuration
5. Review firewall and network settings

## Related Documentation

- [Main README](./README.md) - General MCP server documentation
- [WhatsApp Web API](../README.md) - WhatsApp API documentation
- [n8n Documentation](https://docs.n8n.io/) - n8n official docs
- [MCP Specification](https://modelcontextprotocol.io/) - MCP protocol docs
