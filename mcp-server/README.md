# WhatsApp MCP Server

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with WhatsApp Web API. This server exposes WhatsApp functionality as MCP tools that can be used by AI assistants to send messages, manage chats, create groups, and more.

## Features

### Messaging
- **Send Messages**: Send text messages to individuals or groups
- **Send Media**: Send images, videos, audio, and documents from URLs
- **Bulk Messaging**: Send messages to multiple recipients with automatic queuing
- **Reactions**: Send emoji reactions to messages
- **Polls**: Create polls in chats

### Chat Management
- **Get Chats**: Retrieve all WhatsApp chats
- **Get Messages**: Fetch messages from specific chats
- **Archive/Unarchive**: Archive or unarchive chats
- **Pin/Unpin**: Pin or unpin chats
- **Mark Read/Unread**: Mark chats as read or unread

### Contact Management
- **Get Contacts**: Retrieve all WhatsApp contacts
- **Get Profile Picture**: Get profile picture URLs
- **Block/Unblock**: Block or unblock contacts

### Group Management
- **Create Groups**: Create new WhatsApp groups
- **Get Group Info**: Retrieve group information
- **Add/Remove Participants**: Manage group members

### Status
- **Get WhatsApp Info**: Get client information and connection status

## Prerequisites

1. **WhatsApp Web API Server** must be running (see parent directory)
2. **Node.js 18+** installed
3. **WhatsApp API Key** from your WhatsApp Web API instance

## Installation

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Configure Environment

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Edit `.env`:

```env
WHATSAPP_API_URL=http://localhost:3000
WHATSAPP_API_KEY=your-secret-api-key-change-this
```

### 3. Configure Claude Desktop

Add the server to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "node",
      "args": ["/absolute/path/to/whatsapp-web/mcp-server/index.js"],
      "env": {
        "WHATSAPP_API_URL": "http://localhost:3000",
        "WHATSAPP_API_KEY": "your-secret-api-key-change-this"
      }
    }
  }
}
```

**Important**: Use the absolute path to `index.js`

### 4. Restart Claude Desktop

Restart Claude Desktop to load the MCP server.

## Usage

Once configured, you can use natural language in Claude Desktop to interact with WhatsApp:

### Examples

**Send a message:**
```
Send a WhatsApp message to 1234567890 saying "Hello from Claude!"
```

**Send media:**
```
Send this image https://example.com/image.jpg to WhatsApp number 1234567890 with caption "Check this out"
```

**Get chats:**
```
Show me my WhatsApp chats
```

**Get messages:**
```
Get the last 20 messages from chat 1234567890@c.us
```

**Create a group:**
```
Create a WhatsApp group called "Team Meeting" with members 1234567890, 0987654321
```

**Send bulk messages:**
```
Send WhatsApp messages to multiple people: 1234567890 with "Hi there", 0987654321 with "Hello!"
```

**Create a poll:**
```
Create a poll in chat 1234567890@c.us asking "What's your favorite color?" with options Red, Blue, Green
```

**Block a contact:**
```
Block WhatsApp contact 1234567890@c.us
```

## Available Tools

### Messaging Tools

#### `send_whatsapp_message`
Send a text message to a WhatsApp number or group.

**Parameters:**
- `number` (string, required): Phone number with country code (no + sign) or group ID
- `message` (string, required): Message text to send

#### `send_whatsapp_media`
Send media (image, video, audio, document) from URL.

**Parameters:**
- `number` (string, required): Phone number or group ID
- `mediaUrl` (string, required): URL of the media file
- `caption` (string, optional): Caption for the media

#### `send_bulk_whatsapp_messages`
Send messages to multiple recipients with automatic queuing.

**Parameters:**
- `messages` (array, required): Array of message objects
  - `number` (string): Phone number
  - `message` (string): Message text
  - `delay` (number, optional): Delay in milliseconds (default: 2000)

#### `send_whatsapp_reaction`
Send an emoji reaction to a message.

**Parameters:**
- `messageId` (string, required): ID of the message to react to
- `reaction` (string, required): Emoji to react with (e.g., 👍, ❤️)

#### `create_whatsapp_poll`
Create a poll in a WhatsApp chat.

**Parameters:**
- `number` (string, required): Phone number or group ID
- `question` (string, required): Poll question
- `options` (array, required): Array of poll options (2-12 options)
- `allowMultipleAnswers` (boolean, optional): Allow multiple answers (default: false)

### Chat Tools

#### `get_whatsapp_chats`
Get all WhatsApp chats.

**Parameters:** None

#### `get_chat_messages`
Get messages from a specific chat.

**Parameters:**
- `chatId` (string, required): Chat ID (e.g., 1234567890@c.us)
- `limit` (number, optional): Number of messages to retrieve (default: 50)

#### `archive_whatsapp_chat`
Archive or unarchive a WhatsApp chat.

**Parameters:**
- `chatId` (string, required): Chat ID
- `archive` (boolean, required): true to archive, false to unarchive

#### `pin_whatsapp_chat`
Pin or unpin a WhatsApp chat.

**Parameters:**
- `chatId` (string, required): Chat ID
- `pin` (boolean, required): true to pin, false to unpin

#### `mark_whatsapp_chat_read`
Mark a WhatsApp chat as read or unread.

**Parameters:**
- `chatId` (string, required): Chat ID
- `read` (boolean, required): true to mark as read, false to mark as unread

### Contact Tools

#### `get_whatsapp_contacts`
Get all WhatsApp contacts.

**Parameters:** None

#### `get_whatsapp_profile_picture`
Get profile picture URL for a contact.

**Parameters:**
- `contactId` (string, required): Contact ID (e.g., 1234567890@c.us)

#### `block_whatsapp_contact`
Block a WhatsApp contact.

**Parameters:**
- `contactId` (string, required): Contact ID to block

#### `unblock_whatsapp_contact`
Unblock a WhatsApp contact.

**Parameters:**
- `contactId` (string, required): Contact ID to unblock

### Group Tools

#### `create_whatsapp_group`
Create a new WhatsApp group.

**Parameters:**
- `name` (string, required): Group name
- `participants` (array, required): Array of phone numbers to add

#### `get_whatsapp_group_info`
Get information about a WhatsApp group.

**Parameters:**
- `groupId` (string, required): Group ID (e.g., 123456789@g.us)

#### `add_group_participants`
Add participants to a WhatsApp group.

**Parameters:**
- `groupId` (string, required): Group ID
- `participants` (array, required): Array of phone numbers to add

#### `remove_group_participants`
Remove participants from a WhatsApp group.

**Parameters:**
- `groupId` (string, required): Group ID
- `participants` (array, required): Array of phone numbers to remove

### Status Tools

#### `get_whatsapp_info`
Get WhatsApp client information and connection status.

**Parameters:** None

## Phone Number Format

Phone numbers should be formatted as:
- Include country code
- No + sign
- No spaces or special characters
- Example: `1234567890` for US number +1 234-567-890

## Chat ID Format

- **Individual chats**: `{phone_number}@c.us` (e.g., `1234567890@c.us`)
- **Group chats**: `{group_id}@g.us` (e.g., `123456789@g.us`)

## Development

### Run in Development Mode

```bash
npm run dev
```

This will run the server with auto-reload on file changes.

### Testing the Server

You can test the server directly using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node index.js
```

## Troubleshooting

### Server Not Showing in Claude Desktop

1. Check that the path to `index.js` is absolute, not relative
2. Verify the `.env` file exists with correct values
3. Check Claude Desktop logs for errors
4. Restart Claude Desktop completely

### Connection Errors

1. Ensure the WhatsApp Web API server is running (`http://localhost:3000`)
2. Verify the API key is correct
3. Check that WhatsApp Web is authenticated (visit `http://localhost:3000/qr`)

### Tool Execution Errors

1. Check that phone numbers are in the correct format (no + sign)
2. Verify chat IDs include the correct suffix (`@c.us` or `@g.us`)
3. Check the WhatsApp Web API logs for detailed error messages

## Security Considerations

1. **Never commit your `.env` file** with real API keys
2. **Use HTTPS** when connecting to remote WhatsApp API instances
3. **Restrict API access** using the API key authentication
4. **Monitor usage** to prevent abuse of bulk messaging features
5. **Respect privacy** and only access WhatsApp data you have permission to use

## Architecture

```
┌─────────────────────┐
│   Claude Desktop    │
│   (AI Assistant)    │
└──────────┬──────────┘
           │ MCP Protocol
           │ (stdio)
┌──────────▼──────────┐
│   WhatsApp MCP      │
│      Server         │
└──────────┬──────────┘
           │ HTTP/REST
           │ API Calls
┌──────────▼──────────┐
│  WhatsApp Web API   │
│  (Express Server)   │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│    WhatsApp Web     │
│   (Puppeteer +      │
│   whatsapp-web.js)  │
└─────────────────────┘
```

## License

MIT

## Disclaimer

This project is not affiliated with WhatsApp or Meta. Use responsibly and in accordance with WhatsApp's Terms of Service. Automating WhatsApp may result in your number being banned.

## Related Projects

- [WhatsApp Web API](../README.md) - The underlying WhatsApp Web API server
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [Claude Desktop](https://claude.ai/download) - AI assistant with MCP support

## Contributing

Contributions are welcome! Please ensure:
1. Code follows existing patterns
2. All tools are properly documented
3. Environment variables are added to `.env.example`
4. README is updated with new features

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review WhatsApp Web API documentation
3. Check MCP server logs
4. Verify WhatsApp Web API server status
