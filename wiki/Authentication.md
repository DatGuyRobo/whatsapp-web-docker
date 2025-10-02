# Authentication

Learn how to authenticate API requests and secure your WhatsApp API.

## Table of Contents

- [API Key Authentication](#api-key-authentication)
- [Generating API Keys](#generating-api-keys)
- [Using API Keys](#using-api-keys)
- [Security Best Practices](#security-best-practices)
- [Rotating API Keys](#rotating-api-keys)
- [Multiple API Keys](#multiple-api-keys)

## API Key Authentication

WhatsApp Web API v2.0 uses API key authentication to secure all endpoints. Every request (except `/qr` and `/health`) must include a valid API key.

### How It Works

1. You configure an API key in your `.env` file
2. Include the API key in every API request
3. The server validates the key before processing the request
4. Invalid or missing keys result in 401 Unauthorized error

## Generating API Keys

### Strong Random Keys

Generate a cryptographically secure API key:

**Using OpenSSL (Linux/macOS)**:
```bash
openssl rand -hex 32
# Output: 8f3d9c2b7e4a1f6d5c8e9b2a7f4d1c6e3b8a5d2f9c6e3b1a8d5f2c9e6b3a8d5f
```

**Using Node.js**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: 7b2e8f9d3c6a1b5e4f7d2c9a8b5e3f1d6c9b2a7e5f8d3c1b4a7e2f9d6c3b8a5e
```

**Using Python**:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
# Output: 4d8e3b9f2c7a1e6d5b9c8a2e7f1d4c6b9e3a8d5f2c7b1e4a9d6f3c8b5a2e9f7d
```

**Using pwgen**:
```bash
pwgen -s 64 1
# Output: xY9mKp3nL8qR2vF6dT4hW7jC1bN5sA0gE8uI6yO3zM9kP2rT7vX1lQ4nS8fD6jG3
```

### Key Requirements

- **Minimum length**: 32 characters (64 recommended)
- **Character set**: Use alphanumeric and special characters
- **Randomness**: Cryptographically secure random generation
- **Uniqueness**: Different keys for each environment

## Using API Keys

### Method 1: X-API-Key Header (Recommended)

```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/api/info
```

**JavaScript (fetch)**:
```javascript
fetch('http://localhost:3000/api/info', {
  headers: {
    'X-API-Key': 'your-api-key-here'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

**Python (requests)**:
```python
import requests

headers = {
    'X-API-Key': 'your-api-key-here'
}

response = requests.get('http://localhost:3000/api/info', headers=headers)
print(response.json())
```

**PHP (cURL)**:
```php
$ch = curl_init('http://localhost:3000/api/info');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: your-api-key-here'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
```

### Method 2: Authorization Bearer Token

```bash
curl -H "Authorization: Bearer your-api-key-here" \
  http://localhost:3000/api/info
```

**JavaScript (fetch)**:
```javascript
fetch('http://localhost:3000/api/info', {
  headers: {
    'Authorization': 'Bearer your-api-key-here'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

**Python (requests)**:
```python
import requests

headers = {
    'Authorization': 'Bearer your-api-key-here'
}

response = requests.get('http://localhost:3000/api/info', headers=headers)
print(response.json())
```

## Configuration

### Setting the API Key

Add to your `.env` file:

```env
API_KEY=8f3d9c2b7e4a1f6d5c8e9b2a7f4d1c6e3b8a5d2f9c6e3b1a8d5f2c9e6b3a8d5f
```

### Environment-Specific Keys

Use different keys for each environment:

**.env.development**:
```env
API_KEY=dev_key_for_development_only
```

**.env.production**:
```env
API_KEY=8f3d9c2b7e4a1f6d5c8e9b2a7f4d1c6e3b8a5d2f9c6e3b1a8d5f2c9e6b3a8d5f
```

**.env.test**:
```env
API_KEY=test_key_for_automated_tests
```

## Security Best Practices

### 1. Never Hardcode API Keys

❌ **Bad**:
```javascript
// DON'T DO THIS!
const apiKey = '8f3d9c2b7e4a1f6d5c8e9b2a7f4d1c6e';
fetch('http://localhost:3000/api/info', {
  headers: { 'X-API-Key': apiKey }
});
```

✅ **Good**:
```javascript
// Use environment variables
const apiKey = process.env.WHATSAPP_API_KEY;
fetch('http://localhost:3000/api/info', {
  headers: { 'X-API-Key': apiKey }
});
```

### 2. Keep Keys Secret

- Never commit API keys to version control
- Add `.env` to `.gitignore`
- Use secret management systems in production
- Don't expose keys in client-side code
- Don't share keys in public channels

### 3. Use HTTPS in Production

Always use HTTPS to prevent key interception:

```bash
# Development (HTTP is acceptable)
http://localhost:3000/api/info

# Production (HTTPS required)
https://api.yourdomain.com/api/info
```

### 4. Implement IP Whitelisting

Add IP restrictions in production:

```javascript
// In your server configuration
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || 
                   req.headers['authorization']?.replace('Bearer ', '');
    
    // Validate API key
    if (!apiKey || apiKey !== config.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // IP whitelist (optional)
    const allowedIPs = ['192.168.1.100', '10.0.0.50'];
    if (!allowedIPs.includes(req.ip)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
};
```

### 5. Monitor API Usage

Track API key usage:

```javascript
// Log all authenticated requests
logger.info('API request', {
    endpoint: req.path,
    ip: req.ip,
    timestamp: new Date()
});
```

### 6. Set Expiration

Implement key expiration for enhanced security:

```javascript
// Example: Keys expire after 90 days
const keyCreatedDate = new Date('2024-01-01');
const keyAge = Date.now() - keyCreatedDate.getTime();
const keyExpiryDays = 90;

if (keyAge > keyExpiryDays * 24 * 60 * 60 * 1000) {
    return res.status(401).json({ error: 'API key expired' });
}
```

## Rotating API Keys

### Why Rotate Keys?

- Security breach or compromise
- Employee departure
- Regular security maintenance
- Key exposure in logs or code

### Rotation Process

1. **Generate New Key**:
```bash
openssl rand -hex 32
```

2. **Update Environment**:
```env
# Old key (keep temporarily for transition)
API_KEY_OLD=old-key-here

# New key
API_KEY=new-key-here
```

3. **Support Both Keys Temporarily**:
```javascript
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || 
                   req.headers['authorization']?.replace('Bearer ', '');
    
    // Accept both old and new keys during transition
    if (apiKey === config.API_KEY || apiKey === config.API_KEY_OLD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};
```

4. **Update All Clients**:
- Update all applications using the API
- Notify integration partners
- Update documentation

5. **Remove Old Key**:
```env
# After transition period, remove old key
API_KEY=new-key-here
```

### Rotation Schedule

- **Low risk**: Every 90 days
- **Medium risk**: Every 30 days
- **High risk**: Every 7 days
- **After breach**: Immediately

## Multiple API Keys

For advanced scenarios, implement multiple API keys:

### Use Cases

- Different keys per application
- Different permission levels
- Per-customer keys
- Service-specific keys

### Implementation Example

```javascript
// config.js
module.exports = {
    API_KEYS: {
        'admin_key': { permissions: ['all'], rateLimit: 1000 },
        'readonly_key': { permissions: ['read'], rateLimit: 100 },
        'webhook_key': { permissions: ['webhook'], rateLimit: 500 }
    }
};

// Authentication middleware
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || 
                   req.headers['authorization']?.replace('Bearer ', '');
    
    const keyConfig = config.API_KEYS[apiKey];
    
    if (!keyConfig) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Attach key configuration to request
    req.apiKeyConfig = keyConfig;
    next();
};

// Permission check middleware
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (req.apiKeyConfig.permissions.includes('all') || 
            req.apiKeyConfig.permissions.includes(permission)) {
            next();
        } else {
            res.status(403).json({ error: 'Insufficient permissions' });
        }
    };
};

// Usage
app.post('/api/send-message', 
    authenticate, 
    requirePermission('write'), 
    sendMessageHandler
);
```

## Error Handling

### Unauthorized Error (401)

**Request without API key**:
```bash
curl http://localhost:3000/api/info
```

**Response**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

### Invalid API Key

**Request with wrong key**:
```bash
curl -H "X-API-Key: wrong-key" http://localhost:3000/api/info
```

**Response**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

## Testing Authentication

### Test Valid Key

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/health

# Should return 200 OK
```

### Test Invalid Key

```bash
curl -H "X-API-Key: invalid-key" \
  http://localhost:3000/api/info

# Should return 401 Unauthorized
```

### Test Missing Key

```bash
curl http://localhost:3000/api/info

# Should return 401 Unauthorized
```

## Troubleshooting

### Common Issues

**Issue**: "Unauthorized" error with correct key
- Check for typos in API key
- Verify `.env` file is loaded
- Restart server after changing `.env`
- Check for extra spaces in key value

**Issue**: Key works locally but not in production
- Verify environment variable is set in production
- Check deployment configuration
- Ensure `.env` is not in `.dockerignore`

**Issue**: Intermittent authentication failures
- Check for rate limiting
- Verify key hasn't expired
- Check server logs for details

### Debug Authentication

```bash
# Check if environment variable is loaded
echo $API_KEY

# Test with verbose curl
curl -v -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/info

# Check server logs
docker-compose logs -f whatsapp-api | grep "Unauthorized"
```

## Compliance

### Data Protection

- Store API keys encrypted at rest
- Use secure key management systems (AWS KMS, Azure Key Vault, etc.)
- Implement audit logging
- Follow GDPR/CCPA requirements

### Security Standards

- Follow OWASP API Security guidelines
- Implement rate limiting
- Use HTTPS/TLS 1.3
- Regular security audits
- Penetration testing

---

[← Back to Home](Home.md) | [Next: API Reference →](API-Reference.md)
