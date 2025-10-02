# Installation Guide

Complete installation instructions for different deployment scenarios.

## Table of Contents

- [Docker Installation (Recommended)](#docker-installation-recommended)
- [Manual Installation](#manual-installation)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [System Requirements](#system-requirements)

## Docker Installation (Recommended)

### Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- 4GB RAM minimum
- 10GB disk space

### Step-by-Step Installation

1. **Clone the Repository**

```bash
git clone https://github.com/DatGuyRobo/whatsapp-web-docker.git
cd whatsapp-web-docker
```

2. **Create Environment File**

```bash
cp .env.example .env
nano .env  # Edit with your preferred editor
```

3. **Configure Environment Variables**

Edit `.env` file with your settings (see [Configuration Guide](Configuration.md))

4. **Start Services**

```bash
docker-compose up -d
```

5. **Verify Installation**

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:3000/health
```

### Docker Compose Services

The `docker-compose.yml` file defines three services:

```yaml
services:
  whatsapp-api:
    - Main application server
    - Port: 3000
    - Depends on: mongodb, redis
    
  mongodb:
    - Database for persistence
    - Port: 27017
    - Volume: mongodb_data
    
  redis:
    - Message queue and caching
    - Port: 6379
    - Volume: redis_data
```

## Manual Installation

For development or custom deployments without Docker.

### Prerequisites

- Node.js 20.0.0 or higher
- MongoDB 7.0 or higher
- Redis 7.0 or higher
- Chromium/Chrome browser
- FFmpeg for media processing

### Installation Steps

1. **Install System Dependencies**

**Ubuntu/Debian:**
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Redis
sudo apt-get install -y redis-server

# Install Chromium and FFmpeg
sudo apt-get install -y chromium-browser ffmpeg
```

**macOS:**
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node@20 mongodb-community@7.0 redis chromium ffmpeg
```

2. **Clone Repository**

```bash
git clone https://github.com/DatGuyRobo/whatsapp-web-docker.git
cd whatsapp-web-docker
```

3. **Install Node.js Dependencies**

```bash
npm install
```

4. **Start MongoDB**

```bash
# Ubuntu/Debian
sudo systemctl start mongod
sudo systemctl enable mongod

# macOS
brew services start mongodb-community
```

5. **Start Redis**

```bash
# Ubuntu/Debian
sudo systemctl start redis-server
sudo systemctl enable redis-server

# macOS
brew services start redis
```

6. **Configure Environment**

```bash
cp .env.example .env
nano .env
```

Update these variables for local installation:
```env
MONGODB_URI=mongodb://localhost:27017/whatsapp-api
REDIS_HOST=localhost
REDIS_PORT=6379
SESSION_PATH=./sessions
LOG_DIR=./logs
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium  # or /usr/bin/chromium-browser
```

7. **Start the Application**

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev  # if you have nodemon configured
```

## Development Setup

For contributors and developers.

### Additional Tools

```bash
# Install development dependencies
npm install --save-dev nodemon eslint prettier

# Install git hooks (optional)
npm install --save-dev husky lint-staged
```

### Development Configuration

Create `.env.development`:

```env
NODE_ENV=development
PORT=3000
API_KEY=dev-api-key
LOG_LEVEL=debug
MONGODB_URI=mongodb://localhost:27017/whatsapp-api-dev
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Running in Development Mode

```bash
# With nodemon for auto-reload
nodemon index.js

# With debug logging
LOG_LEVEL=debug node index.js

# With inspector for debugging
node --inspect index.js
```

### Testing

```bash
# Run tests (if configured)
npm test

# Run linter
npm run lint

# Format code
npm run format
```

## Production Deployment

### Docker Production Setup

1. **Use Production Environment File**

```env
NODE_ENV=production
API_KEY=<strong-random-key>
WEBHOOK_URL=https://your-production-webhook.com
MONGODB_URI=mongodb://mongodb:27017/whatsapp-api
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=info
ALWAYS_ONLINE=true
```

2. **Configure Docker for Production**

Update `docker-compose.yml` for production:

```yaml
services:
  whatsapp-api:
    restart: always
    environment:
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

3. **Set Up SSL/TLS**

Use nginx or traefik as reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Enable Monitoring**

```bash
# View logs
docker-compose logs -f --tail=100

# Monitor resources
docker stats

# Set up log rotation
docker-compose logs --no-color | rotatelogs /var/log/whatsapp-api/access-%Y%m%d.log 86400
```

### Cloud Deployment

#### AWS EC2

```bash
# Install Docker
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Deploy application
git clone https://github.com/DatGuyRobo/whatsapp-web-docker.git
cd whatsapp-web-docker
docker-compose up -d
```

#### Google Cloud Run / Azure Container Instances

See cloud-specific documentation for container deployment.

## System Requirements

### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 4GB
- **Disk**: 10GB
- **Network**: Stable internet connection

### Recommended for Production

- **CPU**: 4 cores
- **RAM**: 8GB
- **Disk**: 20GB SSD
- **Network**: High-speed, low-latency connection

### Browser Requirements

- Chromium/Chrome 100+
- Puppeteer compatible browser

## Post-Installation

After installation:

1. **Authenticate WhatsApp** - Visit `/qr` endpoint
2. **Test Health Check** - Verify `/health` endpoint
3. **Configure Webhooks** - Set up event notifications
4. **Review Logs** - Check for any errors
5. **Backup Configuration** - Save your `.env` and session data
6. **Set Up Monitoring** - Configure alerting for production

## Updating

### Docker Update

```bash
cd whatsapp-web-docker
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Manual Update

```bash
cd whatsapp-web-docker
git pull origin main
npm install
# Restart your process manager (pm2, systemd, etc.)
```

## Uninstallation

### Remove Docker Installation

```bash
cd whatsapp-web-docker
docker-compose down -v  # -v removes volumes
cd ..
rm -rf whatsapp-web-docker
```

### Remove Manual Installation

```bash
# Stop services
sudo systemctl stop mongod redis-server

# Remove application
cd whatsapp-web-docker
rm -rf sessions/ logs/ node_modules/
cd ..
rm -rf whatsapp-web-docker
```

---

[← Back to Home](Home.md) | [Next: Configuration Guide →](Configuration.md)
