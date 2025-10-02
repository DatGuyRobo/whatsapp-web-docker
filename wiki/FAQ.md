# Frequently Asked Questions (FAQ)

Common questions about WhatsApp Web API v2.0.

## General Questions

### Is this official WhatsApp software?

No, this project is **not affiliated** with WhatsApp or Meta. It's a third-party implementation using the unofficial WhatsApp Web API through the `whatsapp-web.js` library.

### Can my number get banned?

Yes, using automation tools with WhatsApp may result in your number being banned, either temporarily or permanently. WhatsApp's Terms of Service prohibit unauthorized automated use of their service. Use at your own risk.

**To minimize risk**:
- Add delays between messages
- Don't send bulk messages too quickly
- Don't use with your personal phone number
- Use a dedicated business number
- Follow WhatsApp's rate limits
- Don't spam users

### Is this legal?

This depends on your jurisdiction and use case. The software itself is open source (MIT license), but:
- You must comply with WhatsApp's Terms of Service
- You must comply with local laws (GDPR, CCPA, etc.)
- You must have consent for automated messages
- Commercial use may have additional restrictions

**Consult a lawyer** for legal advice specific to your situation.

### What's the difference between v1.0 and v2.0?

v2.0 adds:
- Database persistence (MongoDB)
- Message queue (Redis/Bull)
- Bulk messaging
- Message reactions
- Polls
- Status/stories
- Enhanced webhooks with retry logic
- Rate limiting
- Request validation
- Better logging
- Security improvements

All v1.0 endpoints remain compatible.

## Technical Questions

### What are the system requirements?

**Minimum**:
- 2 CPU cores
- 4GB RAM
- 10GB disk space
- Docker 20.10+
- Docker Compose 2.0+

**Recommended**:
- 4 CPU cores
- 8GB RAM
- 20GB SSD
- Stable internet connection

### Can I run this without Docker?

Yes, see the [Manual Installation](Installation.md#manual-installation) guide. You'll need:
- Node.js 20+
- MongoDB 7.0+
- Redis 7+
- Chromium/Chrome
- FFmpeg

### How many messages can I send?

There's no hard limit in the API, but:
- WhatsApp has rate limits (unofficial: ~40-50 messages/hour)
- Exceeding limits may result in bans
- Use bulk messaging with delays
- Default API rate limit: 100 requests/minute (configurable)

### Can I use multiple WhatsApp accounts?

Not with a single instance. Each instance can only authenticate with one WhatsApp account. For multiple accounts:
- Run multiple containers on different ports
- Use different session directories
- Assign different API keys

Example:
```yaml
services:
  whatsapp-api-1:
    ports: ["3001:3000"]
    environment:
      - API_KEY=key1
      - SESSION_PATH=/app/sessions1
    
  whatsapp-api-2:
    ports: ["3002:3000"]
    environment:
      - API_KEY=key2
      - SESSION_PATH=/app/sessions2
```

### Does this work with WhatsApp Business?

Yes, it works with both regular WhatsApp and WhatsApp Business accounts. Just scan the QR code with your WhatsApp Business app.

### Can I send messages to users who don't have my number?

No, WhatsApp requires users to be contacts or for you to have communicated before. You cannot send unsolicited messages to random numbers.

## Authentication Questions

### How long does authentication last?

Once authenticated, the session persists indefinitely as long as:
- Session files are preserved
- You don't logout on phone
- You don't unlink device on phone
- WhatsApp doesn't force re-authentication

Sessions are stored in the `sessions/` directory.

### Do I need to scan QR code every time?

No, only on first authentication or if:
- Session data is lost
- You manually logout
- Session expires (rare)
- You restart and session directory is empty

### Can I authenticate programmatically?

No, WhatsApp requires manual QR code scanning for security. There's no way to authenticate without scanning the QR code with your phone.

### What if QR code expires?

QR codes expire after about 20 seconds. Simply refresh the `/qr` page to generate a new one.

## Feature Questions

### Can I receive messages?

Yes, through webhooks. Configure `WEBHOOK_URL` to receive real-time notifications for:
- Incoming messages
- Message status updates
- Message reactions
- Group events
- Call notifications
- And more

See [Webhook Events](Webhook-Events.md) for details.

### Can I send images/videos/documents?

Yes, use:
- `/api/send-media` for URLs or base64
- `/api/send-file` for file uploads

Supported formats:
- Images: JPEG, PNG, GIF, WebP
- Videos: MP4, AVI, MOV
- Audio: MP3, OGG, WAV
- Documents: PDF, DOC, DOCX, XLS, XLSX, etc.
- Max size: 50MB

### Can I send voice messages?

Yes, use `/api/send-media` with `sendAudioAsVoice: true`:

```bash
curl -X POST http://localhost:3000/api/send-media \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "mediaUrl": "https://example.com/audio.mp3",
    "sendAudioAsVoice": true
  }'
```

### Can I create groups?

Yes, use `/api/group/create`:

```bash
curl -X POST http://localhost:3000/api/group/create \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Group",
    "participants": ["1234567890", "0987654321"]
  }'
```

### Can I send location?

Not directly supported in current version. This is a planned feature.

### Can I read message history?

Yes, via database. Messages are stored in MongoDB:

```bash
docker-compose exec mongodb mongosh whatsapp-api
> db.messages.find({ chatId: "1234567890@c.us" }).sort({ timestamp: -1 })
```

Or via API:
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/chat/1234567890@c.us/messages
```

## Deployment Questions

### Can I use this in production?

Yes, but consider:
- **Risk**: Possible WhatsApp bans
- **Compliance**: Legal requirements in your jurisdiction
- **Security**: Use HTTPS, secure API keys, IP whitelisting
- **Monitoring**: Set up logging and alerting
- **Backup**: Regular backups of session and database
- **Scalability**: Plan for growth

### How do I secure the API?

1. **Strong API key**: Use cryptographically random key
2. **HTTPS**: Use SSL/TLS in production
3. **IP whitelisting**: Restrict access to known IPs
4. **Rate limiting**: Prevent abuse (enabled by default)
5. **CORS**: Restrict to specific domains
6. **Firewall**: Use network-level security
7. **Updates**: Keep dependencies updated
8. **Monitoring**: Log and alert on suspicious activity

See [Security](Security.md) for detailed guide.

### Can I use this on shared hosting?

No, this requires:
- Docker support (or ability to install Node.js, MongoDB, Redis)
- Root/sudo access for installation
- Sufficient resources (4GB+ RAM)
- Persistent storage

Use VPS (Digital Ocean, Linode, AWS EC2, etc.) instead.

### What about serverless (AWS Lambda, etc.)?

Not recommended because:
- Requires persistent WebSocket connection
- Needs stateful session management
- Chromium/Puppeteer is resource-intensive
- Would be very expensive at scale

Use container services like AWS ECS, Google Cloud Run, or Azure Container Instances instead.

## Database Questions

### Do I need MongoDB?

For full functionality, yes. MongoDB stores:
- Message history
- Contact information
- Webhook delivery logs

You can run without database, but:
- No message persistence
- No webhook logging
- Limited analytics
- Some features may not work

### How much storage do I need?

Depends on usage:
- **Messages**: ~1KB per message
- **Contacts**: ~500B per contact
- **Webhook logs**: ~2KB per log

Examples:
- 10,000 messages/day = ~300MB/month
- 1,000 contacts = ~500KB
- 10,000 webhooks/day = ~600MB/month

Plan for 3-6 months of data retention.

### Can I use external MongoDB?

Yes, configure in `.env`:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/whatsapp-api

# Remote MongoDB
MONGODB_URI=mongodb://user:pass@mongo.example.com:27017/whatsapp-api

# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/whatsapp-api
```

## Performance Questions

### How fast can I send messages?

Factors affecting speed:
- WhatsApp rate limits (~40-50 messages/hour recommended)
- Network latency
- Message queue configuration
- Server resources

For bulk messaging:
- Use `/api/send-bulk-messages`
- Add 2-5 second delays between messages
- Monitor for rate limit responses
- Scale horizontally if needed

### Why are messages slow to send?

Possible causes:
1. **Network latency**: Check connection
2. **Queue backlog**: Clear old jobs
3. **Rate limiting**: Add delays
4. **Resource limits**: Increase CPU/RAM
5. **Database slow**: Add indexes

### Can I handle multiple requests simultaneously?

Yes, the API is asynchronous and can handle concurrent requests. Default rate limit is 100 requests/minute, configurable in `.env`.

## Troubleshooting Questions

### Messages aren't sending. What's wrong?

Check:
1. **Authentication**: Visit `/qr` - still connected?
2. **Client ready**: `curl http://localhost:3000/health`
3. **Valid number**: Correct format (no + or spaces)
4. **Logs**: `docker-compose logs -f whatsapp-api`
5. **Queue**: Redis running and accessible?

### Why do I keep getting disconnected?

Common causes:
1. **Multiple devices**: Only one device can be linked
2. **WhatsApp ban**: Temporary or permanent ban
3. **Network issues**: Unstable connection
4. **Resource limits**: Insufficient memory
5. **Session corruption**: Clear and re-authenticate

See [Troubleshooting](Troubleshooting.md) for detailed solutions.

### How do I reset everything?

```bash
# WARNING: Deletes all data
docker-compose down -v
rm -rf sessions/* logs/*
docker-compose up -d
# Re-authenticate at /qr
```

## Integration Questions

### Can I integrate with my existing application?

Yes, this is a REST API. Integrate from any language:
- JavaScript/Node.js
- Python
- PHP
- Java
- Go
- Ruby
- .NET

See [Examples](Examples.md) for code samples.

### Do you have SDKs/libraries?

Not officially, but you can use any HTTP client library:
- JavaScript: `fetch`, `axios`
- Python: `requests`
- PHP: `cURL`, `Guzzle`
- Java: `HttpClient`

### Can I use with Zapier/Make/n8n?

Yes! These platforms support webhook triggers and HTTP requests. Use:
- Webhook URLs for receiving events
- HTTP requests for sending messages

### Can I build a chatbot?

Yes, using webhooks:

1. Configure webhook URL
2. Receive incoming messages
3. Process with your logic/AI
4. Send response via API

See [Examples](Examples.md) for chatbot implementation.

## Licensing Questions

### Is this free?

Yes, the software is open source under MIT license. You can:
- Use commercially
- Modify the code
- Distribute copies
- Private use

But:
- No warranty provided
- You assume all risks
- Must include license notice

### Can I sell this as a service?

Yes, MIT license allows commercial use. However:
- You assume all liability
- WhatsApp may ban users
- No support from maintainers
- Must comply with WhatsApp ToS

### Do I need to credit the authors?

MIT license requires including the license notice, but you don't need to actively credit authors in your product.

## Support Questions

### Where can I get help?

1. **Documentation**: Read this wiki thoroughly
2. **GitHub Issues**: Search existing issues
3. **Troubleshooting**: [Guide](Troubleshooting.md)
4. **FAQ**: This page
5. **Community**: GitHub Discussions (if enabled)

### How do I report bugs?

Create a GitHub issue with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs
- Environment details (OS, Docker version, etc.)
- Screenshots if applicable

### Can I request features?

Yes! Create a GitHub issue with:
- Feature description
- Use case explanation
- Expected behavior
- Why it's useful

### Do you offer paid support?

Not officially. This is an open-source project maintained by volunteers.

---

[← Back to Troubleshooting](Troubleshooting.md) | [Next: Examples →](Examples.md)
