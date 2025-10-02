# Troubleshooting Guide

Common issues and solutions for WhatsApp Web API.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Connection Problems](#connection-problems)
- [Database Issues](#database-issues)
- [Message Queue Issues](#message-queue-issues)
- [API Errors](#api-errors)
- [Performance Issues](#performance-issues)
- [Docker Issues](#docker-issues)
- [Webhook Issues](#webhook-issues)

## Authentication Issues

### QR Code Not Appearing

**Symptoms**: Browser shows "QR Code Loading..." indefinitely

**Solutions**:

1. **Check container logs**:
```bash
docker-compose logs -f whatsapp-api
```

2. **Restart the service**:
```bash
docker-compose restart whatsapp-api
```

3. **Clear browser cache** and reload page

4. **Check Chromium installation**:
```bash
docker-compose exec whatsapp-api which chromium
```

5. **Verify Puppeteer path** in `.env`:
```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Authentication Failed

**Symptoms**: "Authentication failed" error after scanning QR

**Solutions**:

1. **Clear session data**:
```bash
docker-compose down
rm -rf sessions/*
docker-compose up -d
```

2. **Check WhatsApp app version** - Update to latest version

3. **Try different phone** - Some devices have authentication issues

4. **Check logs for errors**:
```bash
docker-compose logs whatsapp-api | grep -i "auth"
```

### Session Expired

**Symptoms**: "Session expired" after working previously

**Solutions**:

1. **Re-authenticate**:
   - Navigate to `/qr`
   - Scan QR code again

2. **Preserve sessions** with Docker volumes:
```yaml
volumes:
  - ./sessions:/app/sessions
```

3. **Backup session regularly**:
```bash
cp -r sessions sessions-backup-$(date +%Y%m%d)
```

## Connection Problems

### "Client not ready" Error

**Symptoms**: API returns 503 "Client not ready"

**Solutions**:

1. **Wait for initialization** (can take 30-60 seconds):
```bash
# Check if ready
curl http://localhost:3000/health
```

2. **Check connection state**:
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/state
```

3. **Verify WhatsApp is connected**:
```bash
docker-compose logs whatsapp-api | grep "ready"
```

4. **Restart if stuck**:
```bash
docker-compose restart whatsapp-api
```

### Frequent Disconnections

**Symptoms**: WhatsApp keeps disconnecting

**Solutions**:

1. **Check network stability**

2. **Increase shared memory**:
```yaml
# docker-compose.yml
services:
  whatsapp-api:
    shm_size: '4gb'  # Increase from 2gb
```

3. **Update dependencies**:
```bash
npm update whatsapp-web.js
```

4. **Check for WhatsApp bans**:
   - Using automation may result in temporary/permanent bans
   - Reduce message frequency
   - Add delays between messages

### Connection Timeout

**Symptoms**: Timeout errors when connecting

**Solutions**:

1. **Check firewall rules**

2. **Verify port 3000 is accessible**:
```bash
curl http://localhost:3000/health
```

3. **Check Docker network**:
```bash
docker network ls
docker network inspect whatsapp-web-docker_default
```

4. **Restart Docker daemon**:
```bash
sudo systemctl restart docker
docker-compose up -d
```

## Database Issues

### "Database connection failed"

**Symptoms**: Error connecting to MongoDB

**Solutions**:

1. **Check MongoDB status**:
```bash
docker-compose ps mongodb
docker-compose logs mongodb
```

2. **Verify connection string** in `.env`:
```env
MONGODB_URI=mongodb://mongodb:27017/whatsapp-api
```

3. **Restart MongoDB**:
```bash
docker-compose restart mongodb
```

4. **Check MongoDB health**:
```bash
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

5. **Verify volume permissions**:
```bash
ls -la mongodb_data/
```

### Slow Database Queries

**Symptoms**: Slow API responses

**Solutions**:

1. **Create indexes**:
```bash
docker-compose exec mongodb mongosh whatsapp-api
> db.messages.createIndex({ chatId: 1, timestamp: -1 })
> db.contacts.createIndex({ contactId: 1 })
```

2. **Check query performance**:
```javascript
db.messages.find({ chatId: "123@c.us" }).explain("executionStats")
```

3. **Monitor MongoDB**:
```bash
docker-compose exec mongodb mongosh --eval "db.stats()"
```

### Database Full

**Symptoms**: Out of disk space errors

**Solutions**:

1. **Check disk usage**:
```bash
df -h
docker system df
```

2. **Clean old data**:
```javascript
// Delete messages older than 90 days
const ninetyDaysAgo = Date.now() / 1000 - (90 * 86400);
db.messages.deleteMany({ timestamp: { $lt: ninetyDaysAgo }})
```

3. **Compact database**:
```bash
docker-compose exec mongodb mongosh whatsapp-api --eval "db.runCommand({compact: 'messages'})"
```

## Message Queue Issues

### "Message queue not available"

**Symptoms**: Bulk messaging returns 503 error

**Solutions**:

1. **Check Redis status**:
```bash
docker-compose ps redis
docker-compose logs redis
```

2. **Verify Redis connection**:
```bash
docker-compose exec redis redis-cli ping
# Should return: PONG
```

3. **Restart Redis**:
```bash
docker-compose restart redis
```

4. **Check Redis configuration** in `.env`:
```env
REDIS_HOST=redis
REDIS_PORT=6379
```

### Messages Stuck in Queue

**Symptoms**: Messages queued but not sending

**Solutions**:

1. **Check queue status**:
```bash
docker-compose exec redis redis-cli
> KEYS bull:messages:*
> LLEN bull:messages:wait
```

2. **View failed jobs**:
```bash
> LRANGE bull:messages:failed 0 -1
```

3. **Clear queue** (if necessary):
```bash
> FLUSHALL
```

4. **Restart API server**:
```bash
docker-compose restart whatsapp-api
```

## API Errors

### 401 Unauthorized

**Symptoms**: "Invalid or missing API key"

**Solutions**:

1. **Verify API key** in `.env`:
```bash
cat .env | grep API_KEY
```

2. **Check header format**:
```bash
# Correct
curl -H "X-API-Key: your-api-key" ...

# Also correct
curl -H "Authorization: Bearer your-api-key" ...
```

3. **Restart after changing `.env`**:
```bash
docker-compose restart whatsapp-api
```

### 429 Too Many Requests

**Symptoms**: Rate limit exceeded

**Solutions**:

1. **Implement exponential backoff** in your client:
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      } else {
        throw error;
      }
    }
  }
}
```

2. **Increase rate limits** in `.env`:
```env
RATE_LIMIT_MAX_REQUESTS=500  # Increase from 100
RATE_LIMIT_WINDOW_MS=60000   # 1 minute window
```

3. **Use bulk endpoints** for multiple operations

### 500 Internal Server Error

**Symptoms**: Server error responses

**Solutions**:

1. **Check logs**:
```bash
docker-compose logs -f whatsapp-api
```

2. **Check disk space**:
```bash
df -h
```

3. **Verify all services are running**:
```bash
docker-compose ps
```

4. **Restart services**:
```bash
docker-compose restart
```

### 503 Service Unavailable

**Symptoms**: "Client not ready" error

**Solutions**:

1. **Wait for client to initialize**
2. **Check authentication status** at `/qr`
3. **Verify WhatsApp connection**
4. **Check logs for errors**

## Performance Issues

### High Memory Usage

**Symptoms**: Container using excessive memory

**Solutions**:

1. **Check memory usage**:
```bash
docker stats whatsapp-api
```

2. **Increase memory limit**:
```yaml
# docker-compose.yml
services:
  whatsapp-api:
    deploy:
      resources:
        limits:
          memory: 2G
```

3. **Clear message cache periodically**

4. **Restart regularly** (e.g., daily):
```bash
# Cron job
0 2 * * * cd /path/to/whatsapp-web-docker && docker-compose restart whatsapp-api
```

### Slow Response Times

**Symptoms**: API requests taking too long

**Solutions**:

1. **Enable compression** (already enabled by default)

2. **Optimize database queries** with indexes

3. **Use caching** for frequently accessed data

4. **Scale horizontally** with multiple instances

5. **Check network latency**:
```bash
ping mongodb
ping redis
```

### CPU Usage Spikes

**Symptoms**: High CPU utilization

**Solutions**:

1. **Monitor processes**:
```bash
docker-compose exec whatsapp-api top
```

2. **Check for loops** in webhook handlers

3. **Limit concurrent operations**

4. **Upgrade server resources**

## Docker Issues

### Container Won't Start

**Symptoms**: Service exits immediately

**Solutions**:

1. **Check logs**:
```bash
docker-compose logs whatsapp-api
```

2. **Verify `.env` file exists**:
```bash
ls -la .env
```

3. **Check port conflicts**:
```bash
sudo lsof -i :3000
```

4. **Remove and recreate**:
```bash
docker-compose down
docker-compose up -d --force-recreate
```

### Volume Permission Issues

**Symptoms**: Permission denied errors

**Solutions**:

1. **Fix permissions**:
```bash
sudo chown -R 1000:1000 sessions/
sudo chown -R 1000:1000 logs/
```

2. **Check volume mounts**:
```bash
docker-compose config | grep volumes -A 5
```

### Image Build Failures

**Symptoms**: Build errors

**Solutions**:

1. **Clean Docker cache**:
```bash
docker-compose build --no-cache
```

2. **Update base image**:
```bash
docker pull node:20-alpine
```

3. **Check Dockerfile** for syntax errors

4. **Verify network connectivity** during build

## Webhook Issues

### Webhooks Not Received

**Symptoms**: No webhook notifications

**Solutions**:

1. **Verify webhook URL** in `.env`:
```env
WEBHOOK_URL=https://your-webhook.com/webhook
```

2. **Test endpoint**:
```bash
curl -X POST https://your-webhook.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{}}'
```

3. **Check webhook logs**:
```bash
docker-compose exec mongodb mongosh whatsapp-api
> db.webhooklogs.find().sort({createdAt:-1}).limit(5)
```

4. **Verify firewall** allows outbound requests

5. **Use ngrok** for local testing:
```bash
ngrok http 4000
# Update WEBHOOK_URL to ngrok URL
```

### Failed Webhook Deliveries

**Symptoms**: Webhook status shows "failed"

**Solutions**:

1. **Check error messages**:
```javascript
db.webhooklogs.find({ status: "failed" }).limit(10)
```

2. **Verify endpoint responds with 2xx**

3. **Increase timeout** on webhook server

4. **Check webhook server logs**

5. **Use request logging** to debug

## General Debugging

### Enable Debug Logging

```env
LOG_LEVEL=debug
```

Restart services:
```bash
docker-compose restart whatsapp-api
```

### Collect Diagnostics

```bash
#!/bin/bash
# diagnostics.sh

echo "=== Docker Status ==="
docker-compose ps

echo "=== Container Logs ==="
docker-compose logs --tail=50 whatsapp-api

echo "=== Health Check ==="
curl http://localhost:3000/health

echo "=== Database Status ==="
docker-compose exec mongodb mongosh --eval "db.stats()"

echo "=== Redis Status ==="
docker-compose exec redis redis-cli info

echo "=== Disk Usage ==="
df -h

echo "=== Memory Usage ==="
free -h

echo "=== Network ==="
docker network ls
```

### Reset Everything

When all else fails:

```bash
# WARNING: This will delete all data
docker-compose down -v
rm -rf sessions/* logs/*
docker-compose up -d
```

## Getting Help

If you're still experiencing issues:

1. **Check logs** thoroughly
2. **Search GitHub issues**: https://github.com/DatGuyRobo/whatsapp-web-docker/issues
3. **Review documentation**: [Home](Home.md)
4. **Check FAQ**: [FAQ](FAQ.md)
5. **Create detailed bug report** with:
   - Steps to reproduce
   - Error messages
   - Log output
   - Environment details
   - Docker/Node versions

---

[← Back to Database Schema](Database-Schema.md) | [Next: FAQ →](FAQ.md)
