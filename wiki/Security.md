# Security Best Practices

Comprehensive security guide for WhatsApp Web API deployments.

## Table of Contents

- [Authentication Security](#authentication-security)
- [Network Security](#network-security)
- [Data Security](#data-security)
- [Application Security](#application-security)
- [Infrastructure Security](#infrastructure-security)
- [Compliance](#compliance)

## Authentication Security

### Strong API Keys

Generate cryptographically secure API keys:

```bash
# 64-character hex key (recommended)
openssl rand -hex 32

# 256-bit base64 key
openssl rand -base64 32
```

**Key Requirements**:
- Minimum 32 characters
- Use random generation (not manual)
- Unique per environment
- Rotate regularly (every 90 days)

### API Key Storage

**Never commit API keys**:

```bash
# .gitignore
.env
.env.local
.env.*.local
```

**Use environment variables**:
```javascript
// ✅ Good
const API_KEY = process.env.API_KEY;

// ❌ Bad
const API_KEY = 'hardcoded-key-123';
```

**Use secret management** in production:
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault
- Kubernetes Secrets

### IP Whitelisting

Restrict API access to known IPs:

```javascript
// middleware/ipWhitelist.js
const ipWhitelist = ['192.168.1.100', '10.0.0.50'];

function ipWhitelistMiddleware(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!ipWhitelist.includes(clientIP)) {
    logger.warn(`Unauthorized IP: ${clientIP}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
}

app.use('/api/', ipWhitelistMiddleware);
```

**For multiple IPs or ranges**:
```javascript
const ipRangeCheck = require('ip-range-check');

const allowedRanges = [
  '192.168.1.0/24',
  '10.0.0.0/8',
  '172.16.0.0/12'
];

function ipRangeWhitelist(req, res, next) {
  const clientIP = req.ip;
  
  if (!ipRangeCheck(clientIP, allowedRanges)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
}
```

## Network Security

### Use HTTPS/TLS

**Always use HTTPS in production**:

```nginx
# nginx configuration
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    # Strong SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Firewall Configuration

**UFW (Ubuntu)**:
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTPS only
sudo ufw allow 443/tcp

# Block direct access to API port
sudo ufw deny 3000/tcp

# Enable firewall
sudo ufw enable
```

**iptables**:
```bash
# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTPS
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Block everything else
iptables -A INPUT -j DROP
```

### CORS Configuration

Restrict CORS to specific domains:

```env
# .env - Restrict to your domain
CORS_ORIGIN=https://yourdomain.com

# Multiple domains (comma-separated)
CORS_ORIGIN=https://app.yourdomain.com,https://dashboard.yourdomain.com
```

**Custom CORS configuration**:
```javascript
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://yourdomain.com',
      'https://app.yourdomain.com'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization']
};

app.use(cors(corsOptions));
```

## Data Security

### Database Security

**MongoDB authentication**:
```yaml
# docker-compose.yml
services:
  mongodb:
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=strong-password
```

```env
# .env
MONGODB_URI=mongodb://admin:strong-password@mongodb:27017/whatsapp-api?authSource=admin
```

**Database encryption at rest**:
```bash
# Enable MongoDB encryption
mongod --enableEncryption \
  --encryptionKeyFile /path/to/keyfile
```

**Network isolation**:
```yaml
# docker-compose.yml
services:
  mongodb:
    networks:
      - internal
  
  whatsapp-api:
    networks:
      - internal
      - external

networks:
  internal:
    internal: true
  external:
```

### Sensitive Data Protection

**Mask phone numbers in logs**:
```javascript
function maskPhone(phone) {
  return phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
}

logger.info(`Message sent to ${maskPhone(phone)}`);
```

**Encrypt sensitive data**:
```javascript
const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Backup Security

**Encrypted backups**:
```bash
# Backup with encryption
mongodump --uri="mongodb://localhost/whatsapp-api" --archive | \
  openssl enc -aes-256-cbc -salt -pbkdf2 -out backup-$(date +%Y%m%d).enc

# Restore from encrypted backup
openssl enc -aes-256-cbc -d -pbkdf2 -in backup-20241001.enc | \
  mongorestore --archive
```

## Application Security

### Input Validation

**Use Joi for validation** (already implemented):
```javascript
const Joi = require('joi');

const messageSchema = Joi.object({
  number: Joi.string().pattern(/^\d+$/).required(),
  message: Joi.string().max(4096).required()
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details
      });
    }
    
    next();
  };
}

app.post('/api/send-message', validate(messageSchema), handler);
```

### Sanitize Input

**Prevent injection attacks**:
```javascript
const validator = require('validator');

function sanitizeInput(input) {
  // Remove HTML tags
  let sanitized = validator.stripLow(input);
  
  // Escape HTML entities
  sanitized = validator.escape(sanitized);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

app.post('/api/send-message', (req, res) => {
  const message = sanitizeInput(req.body.message);
  // Process sanitized message
});
```

### Rate Limiting

**Per-IP rate limiting** (already implemented):
```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**Per-user rate limiting**:
```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 1000,
  max: async (req) => {
    // Different limits per API key
    const apiKey = req.headers['x-api-key'];
    const tier = await getUserTier(apiKey);
    
    return {
      'free': 10,
      'basic': 100,
      'premium': 1000
    }[tier] || 10;
  }
});
```

### Error Handling

**Don't expose internal errors**:
```javascript
// ❌ Bad
app.use((error, req, res, next) => {
  res.status(500).json({ error: error.stack });
});

// ✅ Good
app.use((error, req, res, next) => {
  logger.error('Error:', error);
  
  // Generic error for client
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id
  });
});
```

## Infrastructure Security

### Docker Security

**Run as non-root user**:
```dockerfile
# Dockerfile
FROM node:20-alpine

# Create user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Switch to user
USER nodejs

# Rest of Dockerfile...
```

**Scan for vulnerabilities**:
```bash
# Scan Docker image
docker scan whatsapp-api:latest

# Update dependencies
npm audit fix
```

**Limit container resources**:
```yaml
# docker-compose.yml
services:
  whatsapp-api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Secret Management

**Docker secrets**:
```yaml
# docker-compose.yml
services:
  whatsapp-api:
    secrets:
      - api_key
      - mongodb_password
    environment:
      - API_KEY_FILE=/run/secrets/api_key

secrets:
  api_key:
    file: ./secrets/api_key.txt
  mongodb_password:
    file: ./secrets/mongodb_password.txt
```

**Read secrets in app**:
```javascript
const fs = require('fs');

function loadSecret(secretName) {
  const secretPath = `/run/secrets/${secretName}`;
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  return process.env[secretName.toUpperCase()];
}

const API_KEY = loadSecret('api_key');
```

### Monitoring & Alerting

**Log security events**:
```javascript
// Failed authentication attempts
logger.warn('Failed authentication', {
  ip: req.ip,
  endpoint: req.path,
  timestamp: new Date()
});

// Suspicious activity
if (failedAttempts > 5) {
  logger.error('Possible brute force attack', {
    ip: req.ip,
    attempts: failedAttempts
  });
  
  // Alert admin
  sendAlert('Security Alert', `Suspicious activity from ${req.ip}`);
}
```

**Set up monitoring**:
```javascript
const prometheus = require('prom-client');

// Metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const failedAuthCounter = new prometheus.Counter({
  name: 'failed_auth_attempts_total',
  help: 'Total failed authentication attempts'
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

## Compliance

### GDPR Compliance

**Data minimization**:
- Only collect necessary data
- Delete data when no longer needed
- Implement data retention policies

**Right to erasure**:
```javascript
async function deleteUserData(userId) {
  // Delete messages
  await db.messages.deleteMany({ from: userId });
  await db.messages.deleteMany({ to: userId });
  
  // Delete contact info
  await db.contacts.deleteOne({ contactId: userId });
  
  // Log deletion
  logger.info(`User data deleted: ${userId}`);
}
```

**Data portability**:
```javascript
async function exportUserData(userId) {
  const messages = await db.messages.find({
    $or: [{ from: userId }, { to: userId }]
  }).toArray();
  
  const contact = await db.contacts.findOne({ contactId: userId });
  
  return {
    messages,
    contact,
    exportDate: new Date()
  };
}
```

### Audit Logging

**Log all API access**:
```javascript
function auditLogger(req, res, next) {
  const logEntry = {
    timestamp: new Date(),
    ip: req.ip,
    method: req.method,
    path: req.path,
    apiKey: req.headers['x-api-key']?.substring(0, 10) + '...',
    statusCode: res.statusCode,
    userAgent: req.headers['user-agent']
  };
  
  res.on('finish', () => {
    logEntry.statusCode = res.statusCode;
    logger.info('API Access', logEntry);
  });
  
  next();
}

app.use(auditLogger);
```

## Security Checklist

### Pre-Deployment

- [ ] Strong API key generated
- [ ] `.env` not in version control
- [ ] HTTPS/TLS configured
- [ ] Firewall rules configured
- [ ] CORS restricted to domains
- [ ] Database authentication enabled
- [ ] Input validation implemented
- [ ] Rate limiting configured
- [ ] Error handling sanitized
- [ ] Docker security hardened
- [ ] Secret management configured
- [ ] Monitoring & alerting set up

### Post-Deployment

- [ ] SSL certificate valid
- [ ] Firewall rules tested
- [ ] Backups configured
- [ ] Log rotation enabled
- [ ] Monitoring dashboard active
- [ ] Security updates scheduled
- [ ] Incident response plan documented
- [ ] Access audit completed

### Regular Maintenance

- [ ] Rotate API keys (every 90 days)
- [ ] Update dependencies (monthly)
- [ ] Review logs (weekly)
- [ ] Test backups (monthly)
- [ ] Security audit (quarterly)
- [ ] Penetration testing (annually)

## Incident Response

### Security Breach Response

1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope of breach
3. **Mitigate**: Stop ongoing breach
4. **Recover**: Restore from clean backups
5. **Review**: Analyze and improve

**Emergency commands**:
```bash
# Immediately stop all services
docker-compose down

# Rotate all API keys
# Update .env with new keys

# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL

# Review logs for suspicious activity
docker-compose logs | grep "ERROR\|WARN"

# Restore from last known good backup
# Test in isolated environment first
```

---

[← Back to Examples](Examples.md) | [Next: Performance →](Performance.md)
