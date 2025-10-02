module.exports = {
    // Server Configuration
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // API Authentication
    API_KEY: process.env.API_KEY || 'your-secret-api-key',

    // Webhook Configuration
    WEBHOOK_URL: process.env.WEBHOOK_URL || '',
    WEBHOOK_RETRY_ATTEMPTS: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS) || 3,
    WEBHOOK_RETRY_DELAY: parseInt(process.env.WEBHOOK_RETRY_DELAY) || 5000,

    // Session Storage
    SESSION_PATH: process.env.SESSION_PATH || './sessions',

    // Database Configuration
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-api',
    MONGODB_OPTIONS: {
        // useNewUrlParser and useUnifiedTopology are deprecated in MongoDB driver v4+
        // They are no longer needed and have no effect
    },

    // Redis Configuration (for Bull queue)
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

    // CORS Configuration
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

    // WhatsApp Configuration
    ALWAYS_ONLINE: process.env.ALWAYS_ONLINE === 'true' || false,

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_DIR: process.env.LOG_DIR || './logs',

    // Puppeteer
    PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
};
