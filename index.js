const express = require('express');
const { Client, LocalAuth, MessageMedia, Poll } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const Queue = require('bull');

// Load configuration
const config = require('./config');
const logger = require('./src/utils/logger');
const { connectDB, getConnectionStatus } = require('./src/models/database');
const Message = require('./src/models/Message');
const Contact = require('./src/models/Contact');
const WebhookLog = require('./src/models/WebhookLog');
const schemas = require('./src/validators/schemas');
const validate = require('./src/validators/validate');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));

// Compression middleware
app.use(compression());

// Body parser with size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: { error: 'Too many requests', message: 'Please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Initialize Bull Queue for message processing
let messageQueue;
try {
    messageQueue = new Queue('message-queue', {
        redis: {
            host: config.REDIS_HOST,
            port: config.REDIS_PORT,
            password: config.REDIS_PASSWORD || undefined,
        },
    });
    logger.info('Message queue initialized successfully');
} catch (error) {
    logger.warn('Failed to initialize message queue:', error.message);
    logger.warn('Bulk messaging features will be limited');
}

// WhatsApp client state
let qrCodeData = null;
let isReady = false;
let clientInfo = null;

// Connect to database
connectDB().catch(err => logger.error('Database connection failed:', err));

// Authentication middleware
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey || apiKey !== config.API_KEY) {
        logger.warn(`Unauthorized access attempt from ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
    }
    next();
};

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'whatsapp-client',
        dataPath: config.SESSION_PATH
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        executablePath: config.PUPPETEER_EXECUTABLE_PATH
    }
});

// Enhanced webhook sender with retry logic and database logging
const sendToWebhook = async (event, data, retryCount = 0) => {
    if (!config.WEBHOOK_URL) {
        logger.debug(`Webhook not configured - skipping event: ${event}`);
        return;
    }

    const payload = {
        event,
        data,
        timestamp: new Date().toISOString()
    };

    logger.info(`[WEBHOOK] Sending event: ${event}`);

    // Create webhook log in database
    let webhookLog;
    if (getConnectionStatus()) {
        try {
            webhookLog = await WebhookLog.create({
                event,
                payload: data,
                webhookUrl: config.WEBHOOK_URL,
                status: 'pending',
                retryCount,
            });
        } catch (error) {
            logger.error('[WEBHOOK] Failed to create webhook log:', error);
        }
    }

    try {
        const response = await axios.post(config.WEBHOOK_URL, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        logger.info(`[WEBHOOK] Success! Event: ${event}, Status: ${response.status}`);

        // Update webhook log
        if (webhookLog) {
            webhookLog.status = 'success';
            webhookLog.statusCode = response.status;
            webhookLog.responseData = response.data;
            webhookLog.completedAt = new Date();
            await webhookLog.save();
        }
    } catch (error) {
        logger.error(`[WEBHOOK] Failed to send event: ${event}`, {
            error: error.message,
            code: error.code,
            status: error.response?.status,
        });

        // Update webhook log
        if (webhookLog) {
            webhookLog.status = retryCount < config.WEBHOOK_RETRY_ATTEMPTS ? 'retrying' : 'failed';
            webhookLog.statusCode = error.response?.status;
            webhookLog.errorMessage = error.message;
            webhookLog.lastRetryAt = new Date();
            if (webhookLog.status === 'failed') {
                webhookLog.completedAt = new Date();
            }
            await webhookLog.save();
        }

        // Retry logic
        if (retryCount < config.WEBHOOK_RETRY_ATTEMPTS) {
            const delay = config.WEBHOOK_RETRY_DELAY * Math.pow(2, retryCount);
            logger.info(`[WEBHOOK] Retrying in ${delay}ms (attempt ${retryCount + 1}/${config.WEBHOOK_RETRY_ATTEMPTS})`);
            setTimeout(() => sendToWebhook(event, data, retryCount + 1), delay);
        }
    }
};

// Save message to database
const saveMessage = async (message) => {
    if (!getConnectionStatus()) return;

    try {
        await Message.findOneAndUpdate(
            { messageId: message.id._serialized },
            {
                messageId: message.id._serialized,
                chatId: message.from,
                from: message.from,
                to: message.to,
                body: message.body,
                type: message.type,
                hasMedia: message.hasMedia,
                isGroup: message.from.includes('@g.us'),
                author: message.author,
                timestamp: message.timestamp,
                fromMe: message.fromMe,
                isForwarded: message.isForwarded,
                broadcast: message.broadcast,
                hasQuotedMsg: message.hasQuotedMsg,
            },
            { upsert: true, new: true }
        );
        logger.debug(`Message saved to database: ${message.id._serialized}`);
    } catch (error) {
        logger.error('Failed to save message to database:', error);
    }
};

// Save/update contact in database
const saveContact = async (contact) => {
    if (!getConnectionStatus()) return;

    try {
        await Contact.findOneAndUpdate(
            { contactId: contact.id._serialized },
            {
                contactId: contact.id._serialized,
                name: contact.name,
                pushname: contact.pushname,
                number: contact.number,
                isMyContact: contact.isMyContact,
                isBlocked: contact.isBlocked,
                isGroup: contact.isGroup,
                isBusiness: contact.isBusiness,
                isEnterprise: contact.isEnterprise,
                lastUpdated: new Date(),
            },
            { upsert: true, new: true }
        );
        logger.debug(`Contact saved to database: ${contact.id._serialized}`);
    } catch (error) {
        logger.error('Failed to save contact to database:', error);
    }
};

// WhatsApp event handlers
client.on('qr', async (qr) => {
    logger.info('QR Code received');
    qrCodeData = await qrcode.toDataURL(qr);
    sendToWebhook('qr', { qr });
});

client.on('ready', async () => {
    logger.info('WhatsApp client is ready!');
    isReady = true;
    clientInfo = client.info;
    qrCodeData = null;

    // Set always online if configured
    if (config.ALWAYS_ONLINE) {
        try {
            await client.sendPresenceAvailable();
            logger.info('Presence set to: Always Online');
        } catch (error) {
            logger.error('Failed to set presence:', error);
        }
    }

    sendToWebhook('ready', { clientInfo });
});

client.on('authenticated', () => {
    logger.info('Authenticated successfully');
    sendToWebhook('authenticated', {});
});

client.on('auth_failure', (msg) => {
    logger.error('Authentication failure:', msg);
    sendToWebhook('auth_failure', { message: msg });
});

client.on('disconnected', (reason) => {
    logger.warn('Client disconnected:', reason);
    isReady = false;
    sendToWebhook('disconnected', { reason });
});

client.on('message', async (message) => {
    logger.info(`Message received from: ${message.from}`);

    // Save to database
    await saveMessage(message);

    sendToWebhook('message', {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        type: message.type,
        timestamp: message.timestamp,
        hasMedia: message.hasMedia,
        isGroup: message.from.includes('@g.us'),
        author: message.author,
        fromMe: message.fromMe,
    });

    // Maintain online presence
    if (config.ALWAYS_ONLINE) {
        try {
            await client.sendPresenceAvailable();
        } catch (error) {
            logger.debug('Failed to update presence:', error);
        }
    }
});

client.on('message_create', async (message) => {
    await saveMessage(message);

    sendToWebhook('message_create', {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        type: message.type,
        timestamp: message.timestamp,
    });
});

client.on('message_ack', async (message, ack) => {
    const ackName = ['ERROR', 'PENDING', 'SERVER', 'DEVICE', 'READ', 'PLAYED'][ack] || 'UNKNOWN';

    // Update message ack in database
    if (getConnectionStatus()) {
        try {
            await Message.findOneAndUpdate(
                { messageId: message.id._serialized },
                { ack, ackName }
            );
        } catch (error) {
            logger.error('Failed to update message ack:', error);
        }
    }

    sendToWebhook('message_ack', {
        id: message.id._serialized,
        ack,
        ackName,
    });
});

client.on('message_reaction', async (reaction) => {
    logger.info('Reaction received:', reaction);
    sendToWebhook('message_reaction', {
        id: reaction.id._serialized,
        msgId: reaction.msgId._serialized,
        reaction: reaction.reaction,
        senderId: reaction.senderId,
        timestamp: reaction.timestamp,
    });
});

client.on('group_join', (notification) => {
    logger.info('Group join event');
    sendToWebhook('group_join', {
        id: notification.id._serialized,
        chatId: notification.chatId,
        author: notification.author,
        recipientIds: notification.recipientIds,
    });
});

client.on('group_leave', (notification) => {
    logger.info('Group leave event');
    sendToWebhook('group_leave', {
        id: notification.id._serialized,
        chatId: notification.chatId,
        author: notification.author,
        recipientIds: notification.recipientIds,
    });
});

client.on('call', (call) => {
    logger.info('Incoming call');
    sendToWebhook('call', {
        id: call.id,
        from: call.from,
        isVideo: call.isVideo,
        isGroup: call.isGroup,
    });
});

client.on('contact_changed', async (contact) => {
    logger.debug('Contact changed:', contact.id._serialized);
    await saveContact(contact);
});

// Process message queue
if (messageQueue) {
    messageQueue.process(async (job) => {
        const { number, message, delay } = job.data;

        if (delay) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        try {
            const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
            const result = await client.sendMessage(chatId, message);
            logger.info(`Queued message sent to ${number}`);
            return { success: true, messageId: result.id._serialized };
        } catch (error) {
            logger.error(`Failed to send queued message to ${number}:`, error);
            throw error;
        }
    });
}

// Initialize client
logger.info('Initializing WhatsApp client...');
client.initialize();

// API Routes

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        ready: isReady,
        database: getConnectionStatus(),
        timestamp: new Date().toISOString(),
    });
});

// Get QR code
app.get('/qr', (req, res) => {
    if (isReady) {
        return res.send('<html><body><h1>Already authenticated</h1><p>WhatsApp is connected and ready.</p></body></html>');
    }

    if (!qrCodeData) {
        return res.send('<html><body><h1>QR Code Loading...</h1><p>Please wait while the QR code is being generated...</p><script>setTimeout(() => location.reload(), 2000);</script></body></html>');
    }

    res.send(`
        <html>
        <head>
            <title>WhatsApp QR Code</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                }
                h1 {
                    color: #25D366;
                    margin-bottom: 20px;
                }
                img {
                    border: 10px solid #25D366;
                    border-radius: 10px;
                    padding: 10px;
                    background: white;
                }
                p {
                    color: #666;
                    margin-top: 20px;
                }
                .instructions {
                    margin-top: 20px;
                    text-align: left;
                    color: #444;
                }
                .instructions ol {
                    padding-left: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📱 WhatsApp Web QR Code</h1>
                <img src="${qrCodeData}" alt="QR Code" />
                <div class="instructions">
                    <p><strong>Scan this QR code with WhatsApp:</strong></p>
                    <ol>
                        <li>Open WhatsApp on your phone</li>
                        <li>Tap Menu or Settings</li>
                        <li>Tap Linked Devices</li>
                        <li>Tap Link a Device</li>
                        <li>Point your phone at this screen</li>
                    </ol>
                </div>
                <p><small>This page will update automatically once connected.</small></p>
            </div>
            <script>
                setTimeout(() => location.reload(), 3000);
            </script>
        </body>
        </html>
    `);
});

// Get client info
app.get('/api/info', authenticate, (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }
    res.json({ info: clientInfo, state: client.info });
});

// Check if number is registered on WhatsApp
app.get('/api/check-number/:number', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const number = req.params.number.replace(/[^0-9]/g, '');
        const numberId = number.includes('@c.us') ? number : `${number}@c.us`;

        const isRegistered = await client.isRegisteredUser(numberId);

        res.json({
            number,
            formatted: numberId,
            isRegistered,
            message: isRegistered ? 'Number is on WhatsApp' : 'Number is NOT registered on WhatsApp'
        });
    } catch (error) {
        logger.error('Error checking number:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send message
app.post('/api/send-message', authenticate, validate(schemas.sendMessage), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { number, message } = req.body;

    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        const result = await client.sendMessage(chatId, message);
        logger.info(`Message sent to ${number}`);
        res.json({ success: true, messageId: result.id._serialized });
    } catch (error) {
        logger.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send bulk messages (NEW FEATURE)
app.post('/api/send-bulk-messages', authenticate, validate(schemas.sendBulkMessages), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { messages } = req.body;

    if (!messageQueue) {
        return res.status(503).json({ error: 'Message queue not available' });
    }

    try {
        const jobs = [];
        for (const msg of messages) {
            const job = await messageQueue.add(msg, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            });
            jobs.push({ number: msg.number, jobId: job.id });
        }

        logger.info(`${messages.length} messages queued for delivery`);
        res.json({
            success: true,
            message: `${messages.length} messages queued`,
            jobs,
        });
    } catch (error) {
        logger.error('Error queuing bulk messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send media
app.post('/api/send-media', authenticate, validate(schemas.sendMedia), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { number, mediaUrl, mediaBase64, mimetype, filename, caption, sendAudioAsVoice, sendVideoAsGif } = req.body;

    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        let media;

        if (mediaBase64) {
            media = new MessageMedia(mimetype, mediaBase64, filename);
        } else {
            media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
        }

        const options = { caption };

        if (sendAudioAsVoice === true) {
            options.sendAudioAsVoice = true;
        }

        if (sendVideoAsGif === true) {
            options.sendVideoAsGif = true;
        }

        const result = await client.sendMessage(chatId, media, options);
        logger.info(`Media sent to ${number}`);
        res.json({ success: true, messageId: result.id._serialized });
    } catch (error) {
        logger.error('Error sending media:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send file directly (multipart/form-data upload)
app.post('/api/send-file', authenticate, upload.any(), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { number, caption, sendAudioAsVoice, sendVideoAsGif } = req.body;
    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;

    if (!number || !uploadedFile) {
        return res.status(400).json({
            error: 'Number and file are required',
            received: {
                number: !!number,
                file: !!uploadedFile,
                fieldName: uploadedFile ? uploadedFile.fieldname : 'none',
                bodyFields: Object.keys(req.body)
            }
        });
    }

    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

        let fileBuffer = uploadedFile.buffer;
        let mimetype = uploadedFile.mimetype;
        let filename = uploadedFile.originalname;

        const isAudio = mimetype.startsWith('audio/');
        const shouldSendAsVoice = sendAudioAsVoice === 'true' || sendAudioAsVoice === true;

        if (isAudio && shouldSendAsVoice) {
            logger.info(`Converting ${mimetype} to Opus for voice message...`);

            fileBuffer = await new Promise((resolve, reject) => {
                const chunks = [];

                ffmpeg()
                    .input(require('stream').Readable.from(uploadedFile.buffer))
                    .inputFormat(mimetype.includes('mpeg') ? 'mp3' : mimetype.split('/')[1])
                    .audioCodec('libopus')
                    .audioBitrate('128k')
                    .audioChannels(2)
                    .audioFrequency(48000)
                    .format('ogg')
                    .on('error', (err) => {
                        logger.error('Audio conversion failed:', err.message);
                        reject(err);
                    })
                    .on('end', () => {
                        logger.info('Audio conversion completed');
                        resolve(Buffer.concat(chunks));
                    })
                    .pipe()
                    .on('data', (chunk) => chunks.push(chunk));
            });

            mimetype = 'audio/ogg; codecs=opus';
            filename = filename.replace(/\.[^/.]+$/, '.ogg');
        }

        const base64 = fileBuffer.toString('base64');
        const media = new MessageMedia(mimetype, base64, filename);

        const options = {};
        if (caption) options.caption = caption;
        if (shouldSendAsVoice) options.sendAudioAsVoice = true;
        if (sendVideoAsGif === 'true' || sendVideoAsGif === true) options.sendVideoAsGif = true;

        const result = await client.sendMessage(chatId, media, options);
        logger.info(`File sent to ${number}`);
        res.json({
            success: true,
            messageId: result.id._serialized,
            fileInfo: {
                name: filename,
                size: fileBuffer.length,
                mimetype: mimetype,
                converted: isAudio && shouldSendAsVoice
            }
        });
    } catch (error) {
        logger.error('Error sending file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send reaction (NEW FEATURE)
app.post('/api/send-reaction', authenticate, validate(schemas.sendReaction), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { messageId, reaction } = req.body;

    try {
        const message = await client.getMessageById(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        await message.react(reaction);
        logger.info(`Reaction sent: ${reaction} to message ${messageId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error sending reaction:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create poll (NEW FEATURE)
app.post('/api/create-poll', authenticate, validate(schemas.createPoll), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { number, question, options, allowMultipleAnswers } = req.body;

    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

        const poll = new Poll(question, options, {
            allowMultipleAnswers: allowMultipleAnswers || false,
        });

        const result = await client.sendMessage(chatId, poll);
        logger.info(`Poll sent to ${number}`);
        res.json({ success: true, messageId: result.id._serialized });
    } catch (error) {
        logger.error('Error creating poll:', error);
        res.status(500).json({ error: error.message });
    }
});

// Set typing indicator (NEW FEATURE)
app.post('/api/set-typing', authenticate, validate(schemas.setTyping), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { chatId, typing } = req.body;

    try {
        const chat = await client.getChatById(chatId);

        if (typing) {
            await chat.sendStateTyping();
        } else {
            await chat.clearState();
        }

        logger.info(`Typing state set to ${typing} for ${chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error setting typing state:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send status/story (NEW FEATURE)
app.post('/api/send-status', authenticate, validate(schemas.sendStatus), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { content, mediaUrl, mediaBase64, mimetype, backgroundColor, font } = req.body;

    try {
        let media;

        if (mediaUrl || mediaBase64) {
            if (mediaBase64) {
                media = new MessageMedia(mimetype, mediaBase64);
            } else {
                media = await MessageMedia.fromUrl(mediaUrl);
            }
            await client.sendMessage('status@broadcast', media, { caption: content });
        } else {
            await client.sendMessage('status@broadcast', content, {
                backgroundColor: backgroundColor || '#25D366',
                font: font || 0,
            });
        }

        logger.info('Status/story posted');
        res.json({ success: true });
    } catch (error) {
        logger.error('Error sending status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Block contact (NEW FEATURE)
app.post('/api/block-contact', authenticate, validate(schemas.blockContact), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { contactId } = req.body;

    try {
        await client.blockContact(contactId);

        // Update in database
        if (getConnectionStatus()) {
            await Contact.findOneAndUpdate(
                { contactId },
                { isBlocked: true }
            );
        }

        logger.info(`Contact blocked: ${contactId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error blocking contact:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unblock contact (NEW FEATURE)
app.post('/api/unblock-contact', authenticate, validate(schemas.blockContact), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { contactId } = req.body;

    try {
        await client.unblockContact(contactId);

        // Update in database
        if (getConnectionStatus()) {
            await Contact.findOneAndUpdate(
                { contactId },
                { isBlocked: false }
            );
        }

        logger.info(`Contact unblocked: ${contactId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error unblocking contact:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get contacts
app.get('/api/contacts', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const contacts = await client.getContacts();

        // Save contacts to database
        if (getConnectionStatus()) {
            const savePromises = contacts.map(c => saveContact(c));
            await Promise.allSettled(savePromises);
        }

        res.json({
            contacts: contacts.map(c => ({
                id: c.id._serialized,
                name: c.name,
                number: c.number,
                isMyContact: c.isMyContact,
                isBlocked: c.isBlocked,
            }))
        });
    } catch (error) {
        logger.error('Error getting contacts:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get chats
app.get('/api/chats', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chats = await client.getChats();
        res.json({
            chats: chats.map(c => ({
                id: c.id._serialized,
                name: c.name,
                isGroup: c.isGroup,
                unreadCount: c.unreadCount,
                timestamp: c.timestamp,
                archived: c.archived,
                pinned: c.pinned,
            }))
        });
    } catch (error) {
        logger.error('Error getting chats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get chat by ID
app.get('/api/chat/:chatId', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        res.json({
            chat: {
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                archived: chat.archived,
                pinned: chat.pinned,
            }
        });
    } catch (error) {
        logger.error('Error getting chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get chat messages
app.get('/api/chat/:chatId/messages', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const limit = parseInt(req.query.limit) || 50;

    try {
        const chat = await client.getChatById(req.params.chatId);
        const messages = await chat.fetchMessages({ limit });

        // Save messages to database
        if (getConnectionStatus()) {
            const savePromises = messages.map(m => saveMessage(m));
            await Promise.allSettled(savePromises);
        }

        res.json({
            messages: messages.map(m => ({
                id: m.id._serialized,
                body: m.body,
                from: m.from,
                timestamp: m.timestamp,
                type: m.type,
                hasMedia: m.hasMedia,
                fromMe: m.fromMe,
            }))
        });
    } catch (error) {
        logger.error('Error getting chat messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create group
app.post('/api/group/create', authenticate, validate(schemas.createGroup), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { name, participants } = req.body;

    try {
        const participantIds = participants.map(p => p.includes('@c.us') ? p : `${p}@c.us`);
        const group = await client.createGroup(name, participantIds);
        logger.info(`Group created: ${name}`);
        res.json({ success: true, groupId: group.gid._serialized });
    } catch (error) {
        logger.error('Error creating group:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get group info
app.get('/api/group/:groupId', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participants = chat.participants.map(p => ({
            id: p.id._serialized,
            isAdmin: p.isAdmin,
            isSuperAdmin: p.isSuperAdmin
        }));

        res.json({
            group: {
                id: chat.id._serialized,
                name: chat.name,
                description: chat.description,
                participants,
                participantCount: participants.length,
                owner: chat.owner?._serialized
            }
        });
    } catch (error) {
        logger.error('Error getting group info:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add participants to group
app.post('/api/group/:groupId/add-participants', authenticate, validate(schemas.manageParticipants), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { participants } = req.body;

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participantIds = participants.map(p => p.includes('@c.us') ? p : `${p}@c.us`);
        await chat.addParticipants(participantIds);

        logger.info(`Participants added to group ${req.params.groupId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error adding participants:', error);
        res.status(500).json({ error: error.message });
    }
});

// Remove participants from group
app.post('/api/group/:groupId/remove-participants', authenticate, validate(schemas.manageParticipants), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { participants } = req.body;

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participantIds = participants.map(p => p.includes('@c.us') ? p : `${p}@c.us`);
        await chat.removeParticipants(participantIds);

        logger.info(`Participants removed from group ${req.params.groupId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error removing participants:', error);
        res.status(500).json({ error: error.message });
    }
});

// Leave group
app.post('/api/group/:groupId/leave', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        await chat.leave();
        logger.info(`Left group ${req.params.groupId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error leaving group:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update group settings
app.post('/api/group/:groupId/settings', authenticate, validate(schemas.groupSettings), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { messageSend, settingsChange } = req.body;

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        if (messageSend !== undefined) {
            await chat.setMessagesAdminsOnly(messageSend === 'admins');
        }

        if (settingsChange !== undefined) {
            await chat.setInfoAdminsOnly(settingsChange === 'admins');
        }

        logger.info(`Group settings updated for ${req.params.groupId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error updating group settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Promote participants
app.post('/api/group/:groupId/promote', authenticate, validate(schemas.manageParticipants), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { participants } = req.body;

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participantIds = participants.map(p => p.includes('@c.us') ? p : `${p}@c.us`);
        await chat.promoteParticipants(participantIds);

        logger.info(`Participants promoted in group ${req.params.groupId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error promoting participants:', error);
        res.status(500).json({ error: error.message });
    }
});

// Demote participants
app.post('/api/group/:groupId/demote', authenticate, validate(schemas.manageParticipants), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { participants } = req.body;

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participantIds = participants.map(p => p.includes('@c.us') ? p : `${p}@c.us`);
        await chat.demoteParticipants(participantIds);

        logger.info(`Participants demoted in group ${req.params.groupId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error demoting participants:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get profile picture
app.get('/api/profile-picture/:contactId', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const url = await client.getProfilePicUrl(req.params.contactId);
        res.json({ url: url || null });
    } catch (error) {
        logger.error('Error getting profile picture:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get state
app.get('/api/state', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const state = await client.getState();
        res.json({ state });
    } catch (error) {
        logger.error('Error getting state:', error);
        res.status(500).json({ error: error.message });
    }
});

// Archive chat
app.post('/api/chat/:chatId/archive', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.archive();
        logger.info(`Chat archived: ${req.params.chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error archiving chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unarchive chat
app.post('/api/chat/:chatId/unarchive', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.unarchive();
        logger.info(`Chat unarchived: ${req.params.chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error unarchiving chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Pin chat
app.post('/api/chat/:chatId/pin', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.pin();
        logger.info(`Chat pinned: ${req.params.chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error pinning chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unpin chat
app.post('/api/chat/:chatId/unpin', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.unpin();
        logger.info(`Chat unpinned: ${req.params.chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error unpinning chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mute chat
app.post('/api/chat/:chatId/mute', authenticate, validate(schemas.muteChat), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { duration } = req.body;

    try {
        const chat = await client.getChatById(req.params.chatId);
        const unmuteDate = duration ? new Date(Date.now() + duration * 1000) : null;
        await chat.mute(unmuteDate);
        logger.info(`Chat muted: ${req.params.chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error muting chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Unmute chat
app.post('/api/chat/:chatId/unmute', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.unmute();
        logger.info(`Chat unmuted: ${req.params.chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error unmuting chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark chat as read
app.post('/api/chat/:chatId/mark-read', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.sendSeen();
        logger.info(`Chat marked as read: ${req.params.chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error marking chat as read:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark chat as unread
app.post('/api/chat/:chatId/mark-unread', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.markUnread();
        logger.info(`Chat marked as unread: ${req.params.chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error marking chat as unread:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete chat
app.delete('/api/chat/:chatId', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.delete();
        logger.info(`Chat deleted: ${req.params.chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Clear chat messages
app.post('/api/chat/:chatId/clear', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.clearMessages();
        logger.info(`Chat messages cleared: ${req.params.chatId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error clearing chat messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Logout
app.post('/api/logout', authenticate, async (req, res) => {
    try {
        await client.logout();
        logger.info('Client logged out');
        res.json({ success: true });
    } catch (error) {
        logger.error('Error logging out:', error);
        res.status(500).json({ error: error.message });
    }
});

// Restart client
app.post('/api/restart', authenticate, async (req, res) => {
    try {
        await client.destroy();
        await client.initialize();
        logger.info('Client restarted');
        res.json({ success: true });
    } catch (error) {
        logger.error('Error restarting client:', error);
        res.status(500).json({ error: error.message });
    }
});

// Global error handler
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        logger.error('Multer error:', error.message);
        return res.status(400).json({
            error: 'File upload error',
            message: error.message,
            code: error.code,
            field: error.field
        });
    }

    if (error) {
        logger.error('Server error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }

    next();
});

// Start server
app.listen(config.PORT, () => {
    logger.info('='.repeat(60));
    logger.info(`🚀 WhatsApp API v2.0 server running on port ${config.PORT}`);
    logger.info(`🔐 API Key authentication: ENABLED`);
    logger.info(`📡 Webhook URL: ${config.WEBHOOK_URL || '❌ NOT CONFIGURED'}`);
    logger.info(`💾 Session path: ${config.SESSION_PATH}`);
    logger.info(`🗄️  Database: ${getConnectionStatus() ? '✅ Connected' : '❌ Not connected'}`);
    logger.info(`📮 Message Queue: ${messageQueue ? '✅ Ready' : '❌ Not available'}`);
    logger.info(`🌐 Always Online: ${config.ALWAYS_ONLINE ? '✅ Enabled' : '❌ Disabled'}`);
    logger.info(`📝 Log Level: ${config.LOG_LEVEL}`);
    logger.info('='.repeat(60));

    if (!config.WEBHOOK_URL) {
        logger.warn('⚠️  WARNING: Webhook URL is not configured!');
        logger.warn('   Set WEBHOOK_URL in your .env file to receive events.');
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    await client.destroy();
    if (messageQueue) await messageQueue.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    await client.destroy();
    if (messageQueue) await messageQueue.close();
    process.exit(0);
});
