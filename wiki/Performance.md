# Performance Optimization

Tips and techniques for optimizing WhatsApp Web API performance.

## Table of Contents

- [System Resources](#system-resources)
- [Database Optimization](#database-optimization)
- [Caching Strategies](#caching-strategies)
- [Message Queue Optimization](#message-queue-optimization)
- [API Optimization](#api-optimization)
- [Network Optimization](#network-optimization)
- [Monitoring Performance](#monitoring-performance)

## System Resources

### Hardware Recommendations

**Development**:
- 2 CPU cores
- 4GB RAM
- 10GB SSD

**Production (Low Traffic)**:
- 4 CPU cores
- 8GB RAM
- 20GB SSD
- 100 Mbps network

**Production (High Traffic)**:
- 8+ CPU cores
- 16GB+ RAM
- 50GB+ NVMe SSD
- 1 Gbps network

### Docker Resource Limits

Optimize container resources:

```yaml
# docker-compose.yml
services:
  whatsapp-api:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
    shm_size: '4gb'  # Increase shared memory for Chromium
```

### Memory Management

**Monitor memory usage**:
```bash
docker stats whatsapp-api --no-stream
```

**Node.js memory optimization**:
```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

```yaml
# docker-compose.yml
services:
  whatsapp-api:
    environment:
      - NODE_OPTIONS=--max-old-space-size=4096
```

## Database Optimization

### Indexes

Create indexes for frequently queried fields:

```javascript
// Connect to MongoDB
db.messages.createIndex({ chatId: 1, timestamp: -1 });
db.messages.createIndex({ messageId: 1 }, { unique: true });
db.messages.createIndex({ from: 1, timestamp: -1 });
db.messages.createIndex({ timestamp: -1 });
db.messages.createIndex({ type: 1, hasMedia: 1 });

db.contacts.createIndex({ contactId: 1 }, { unique: true });
db.contacts.createIndex({ number: 1 });
db.contacts.createIndex({ isBlocked: 1 });

db.webhooklogs.createIndex({ createdAt: -1 });
db.webhooklogs.createIndex({ event: 1, createdAt: -1 });
db.webhooklogs.createIndex({ status: 1, createdAt: -1 });
```

**Verify indexes**:
```javascript
db.messages.getIndexes();
```

**Analyze query performance**:
```javascript
db.messages.find({ chatId: "123@c.us" })
  .sort({ timestamp: -1 })
  .explain("executionStats");
```

### Query Optimization

**Use projections**:
```javascript
// ❌ Bad - fetches all fields
db.messages.find({ chatId: "123@c.us" });

// ✅ Good - only needed fields
db.messages.find(
  { chatId: "123@c.us" },
  { body: 1, timestamp: 1, from: 1 }
);
```

**Limit results**:
```javascript
// Always use limit for large collections
db.messages.find({ chatId: "123@c.us" })
  .sort({ timestamp: -1 })
  .limit(50);
```

**Avoid $where and $regex**:
```javascript
// ❌ Slow
db.messages.find({ body: /hello/i });

// ✅ Better - use text index
db.messages.createIndex({ body: "text" });
db.messages.find({ $text: { $search: "hello" } });
```

### Connection Pooling

Configure MongoDB connection pool:

```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS: 10000
});
```

### Data Archival

Archive old data to improve performance:

```javascript
// Archive messages older than 90 days
const archiveDate = new Date();
archiveDate.setDate(archiveDate.getDate() - 90);

// Move to archive collection
const oldMessages = await db.messages.find({
  createdAt: { $lt: archiveDate }
}).toArray();

await db.messages_archive.insertMany(oldMessages);
await db.messages.deleteMany({
  createdAt: { $lt: archiveDate }
});
```

## Caching Strategies

### Redis Caching

Cache frequently accessed data:

```javascript
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// Cache contact info
async function getContact(contactId) {
  const cacheKey = `contact:${contactId}`;
  
  // Try cache first
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const contact = await db.contacts.findOne({ contactId });
  
  // Cache for 1 hour
  await client.setex(cacheKey, 3600, JSON.stringify(contact));
  
  return contact;
}

// Invalidate cache on update
async function updateContact(contactId, updates) {
  await db.contacts.updateOne({ contactId }, { $set: updates });
  await client.del(`contact:${contactId}`);
}
```

### Response Caching

Cache API responses:

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

app.get('/api/contacts', authenticate, (req, res) => {
  const cacheKey = 'contacts:list';
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  // Fetch from database
  const contacts = await client.getContacts();
  
  // Cache response
  cache.set(cacheKey, { contacts });
  
  res.json({ contacts });
});
```

## Message Queue Optimization

### Queue Configuration

Optimize Bull queue settings:

```javascript
const Queue = require('bull');

const messageQueue = new Queue('messages', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    maxRetriesPerRequest: 3
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,  // Keep last 100 completed
    removeOnFail: 1000      // Keep last 1000 failed
  }
});
```

### Concurrent Processing

Process multiple jobs simultaneously:

```javascript
// Process up to 5 jobs concurrently
messageQueue.process(5, async (job) => {
  const { number, message } = job.data;
  return await sendMessage(number, message);
});
```

### Priority Queues

Prioritize important messages:

```javascript
// High priority
await messageQueue.add(
  { number, message },
  { priority: 1 }
);

// Normal priority
await messageQueue.add(
  { number, message },
  { priority: 5 }
);

// Low priority
await messageQueue.add(
  { number, message },
  { priority: 10 }
);
```

### Queue Monitoring

Monitor queue health:

```javascript
// Get queue statistics
async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    messageQueue.getWaitingCount(),
    messageQueue.getActiveCount(),
    messageQueue.getCompletedCount(),
    messageQueue.getFailedCount()
  ]);
  
  return { waiting, active, completed, failed };
}

// Clean old jobs
async function cleanQueue() {
  await messageQueue.clean(86400000, 'completed'); // 24 hours
  await messageQueue.clean(604800000, 'failed');    // 7 days
}

// Run cleanup daily
setInterval(cleanQueue, 86400000);
```

## API Optimization

### Response Compression

Enable gzip compression (already enabled):

```javascript
const compression = require('compression');

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6  // Balance between speed and compression
}));
```

### Pagination

Implement pagination for large datasets:

```javascript
app.get('/api/messages', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  
  const messages = await db.messages
    .find({ chatId: req.query.chatId })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  const total = await db.messages.countDocuments({
    chatId: req.query.chatId
  });
  
  res.json({
    messages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});
```

### Async Operations

Use async/await properly:

```javascript
// ❌ Bad - sequential
const user = await getUser(userId);
const messages = await getMessages(userId);
const contacts = await getContacts(userId);

// ✅ Good - parallel
const [user, messages, contacts] = await Promise.all([
  getUser(userId),
  getMessages(userId),
  getContacts(userId)
]);
```

### Connection Keep-Alive

Enable HTTP keep-alive:

```javascript
const http = require('http');

const server = http.createServer(app);

// Enable keep-alive
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.listen(config.PORT);
```

## Network Optimization

### CDN for Static Assets

Use CDN for media files:

```javascript
// Upload to CDN (e.g., AWS S3, Cloudflare)
async function uploadToCD N(file) {
  const s3 = new AWS.S3();
  
  const params = {
    Bucket: 'your-bucket',
    Key: `media/${Date.now()}-${file.name}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'max-age=31536000'
  };
  
  const result = await s3.upload(params).promise();
  return result.Location;
}
```

### Load Balancing

Distribute load across multiple instances:

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
  
  whatsapp-api-1:
    build: .
    environment:
      - INSTANCE_ID=1
  
  whatsapp-api-2:
    build: .
    environment:
      - INSTANCE_ID=2
  
  whatsapp-api-3:
    build: .
    environment:
      - INSTANCE_ID=3
```

```nginx
# nginx.conf
upstream whatsapp_api {
    least_conn;
    server whatsapp-api-1:3000;
    server whatsapp-api-2:3000;
    server whatsapp-api-3:3000;
}

server {
    listen 443 ssl;
    
    location / {
        proxy_pass http://whatsapp_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

### HTTP/2

Enable HTTP/2 for better performance:

```nginx
server {
    listen 443 ssl http2;
    # ... rest of config
}
```

## Monitoring Performance

### Application Metrics

Track performance metrics:

```javascript
const prometheus = require('prom-client');

// Request duration histogram
const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Track request duration
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

### Database Profiling

Enable MongoDB profiling:

```javascript
// Enable profiling for slow queries (>100ms)
db.setProfilingLevel(1, { slowms: 100 });

// View slow queries
db.system.profile.find()
  .sort({ ts: -1 })
  .limit(10)
  .pretty();
```

### Performance Testing

Use tools to test performance:

**Apache Bench**:
```bash
# Test concurrent requests
ab -n 1000 -c 10 -H "X-API-Key: your-api-key" \
  http://localhost:3000/health
```

**Artillery**:
```yaml
# load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      X-API-Key: 'your-api-key'

scenarios:
  - name: 'Send messages'
    flow:
      - post:
          url: '/api/send-message'
          json:
            number: '1234567890'
            message: 'Test message'
```

```bash
artillery run load-test.yml
```

### Logging Optimization

Optimize logging for performance:

```javascript
// Use appropriate log levels
if (process.env.NODE_ENV === 'production') {
  logger.level = 'info';
} else {
  logger.level = 'debug';
}

// Async logging
const winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'combined.log',
      handleExceptions: true,
      format: winston.format.json(),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exitOnError: false
});
```

## Performance Checklist

- [ ] Database indexes created
- [ ] Query projections used
- [ ] Connection pooling configured
- [ ] Redis caching implemented
- [ ] Response compression enabled
- [ ] Pagination implemented
- [ ] Queue optimization configured
- [ ] Resource limits set
- [ ] Monitoring enabled
- [ ] Load testing performed
- [ ] CDN configured for media
- [ ] HTTP/2 enabled
- [ ] Keep-alive configured

## Troubleshooting Slow Performance

### Identify Bottlenecks

1. **Check response times**:
```bash
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/info
```

```
# curl-format.txt
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
      time_redirect:  %{time_redirect}\n
   time_starttransfer:  %{time_starttransfer}\n
                      ------\n
          time_total:  %{time_total}\n
```

2. **Profile Node.js**:
```bash
node --prof index.js
# After running, generate report
node --prof-process isolate-*.log > profile.txt
```

3. **Check database**:
```javascript
db.currentOp();  // See running operations
db.serverStatus();  // Server metrics
```

4. **Monitor system**:
```bash
htop  # CPU/Memory usage
iotop  # Disk I/O
netstat -s  # Network statistics
```

---

[← Back to Security](Security.md) | [Next: Migration Guide →](Migration-Guide.md)
