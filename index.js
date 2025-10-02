const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Configure multer for file uploads (store in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'your-secret-api-key';
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const SESSION_PATH = process.env.SESSION_PATH || './sessions';

let qrCodeData = null;
let isReady = false;
let clientInfo = null;

// Authentication middleware
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
    }
    next();
};

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'whatsapp-client',
        dataPath: SESSION_PATH
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
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
    }
});

// Webhook sender
const sendToWebhook = async (event, data) => {
    if (!WEBHOOK_URL) {
        console.log(`[WEBHOOK] Not configured - skipping event: ${event}`);
        return;
    }

    const payload = {
        event,
        data,
        timestamp: new Date().toISOString()
    };

    console.log(`[WEBHOOK] Sending event: ${event} to ${WEBHOOK_URL}`);
    console.log(`[WEBHOOK] Payload:`, JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        console.log(`[WEBHOOK] Success! Status: ${response.status}`);
    } catch (error) {
        console.error(`[WEBHOOK] Failed to send event: ${event}`);
        console.error(`[WEBHOOK] Error: ${error.message}`);
        if (error.response) {
            console.error(`[WEBHOOK] Response status: ${error.response.status}`);
            console.error(`[WEBHOOK] Response data:`, error.response.data);
        }
        if (error.code) {
            console.error(`[WEBHOOK] Error code: ${error.code}`);
        }
    }
};

// WhatsApp event handlers
client.on('qr', async (qr) => {
    console.log('QR Code received');
    qrCodeData = await qrcode.toDataURL(qr);
    console.log('QR Code generated - access it at /qr endpoint');
    sendToWebhook('qr', { qr });
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    isReady = true;
    clientInfo = client.info;
    qrCodeData = null;
    sendToWebhook('ready', { clientInfo });
});

client.on('authenticated', () => {
    console.log('Authenticated successfully');
    sendToWebhook('authenticated', {});
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failure:', msg);
    sendToWebhook('auth_failure', { message: msg });
});

client.on('disconnected', (reason) => {
    console.log('Client disconnected:', reason);
    isReady = false;
    sendToWebhook('disconnected', { reason });
});

client.on('message', async (message) => {
    console.log('Message received:', message.from);
    sendToWebhook('message', {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        type: message.type,
        timestamp: message.timestamp,
        hasMedia: message.hasMedia,
        isGroup: message.from.includes('@g.us'),
        author: message.author
    });
});

client.on('message_create', async (message) => {
    sendToWebhook('message_create', {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        type: message.type,
        timestamp: message.timestamp
    });
});

client.on('message_ack', (message, ack) => {
    sendToWebhook('message_ack', {
        id: message.id._serialized,
        ack,
        ackName: ['ERROR', 'PENDING', 'SERVER', 'DEVICE', 'READ', 'PLAYED'][ack] || 'UNKNOWN'
    });
});

client.on('group_join', (notification) => {
    sendToWebhook('group_join', {
        id: notification.id._serialized,
        chatId: notification.chatId,
        author: notification.author,
        recipientIds: notification.recipientIds
    });
});

client.on('group_leave', (notification) => {
    sendToWebhook('group_leave', {
        id: notification.id._serialized,
        chatId: notification.chatId,
        author: notification.author,
        recipientIds: notification.recipientIds
    });
});

client.on('call', (call) => {
    sendToWebhook('call', {
        id: call.id,
        from: call.from,
        isVideo: call.isVideo,
        isGroup: call.isGroup
    });
});

// Initialize client
console.log('Initializing WhatsApp client...');
client.initialize();

// API Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', ready: isReady });
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
                // Auto-refresh every 3 seconds to check if authenticated
                setTimeout(() => location.reload(), 3000);
            </script>
        </body>
        </html>
    `);
});

// Get client info
app.get('/info', authenticate, (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }
    res.json({ info: clientInfo, state: client.info });
});

// Check if number is registered on WhatsApp
app.get('/check-number/:number', authenticate, async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
});

// Send message
app.post('/send-message', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }

    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        const result = await client.sendMessage(chatId, message);
        res.json({ success: true, messageId: result.id._serialized });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send media
app.post('/send-media', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { number, mediaUrl, mediaBase64, mimetype, filename, caption, sendAudioAsVoice, sendVideoAsGif } = req.body;

    if (!number || (!mediaUrl && !mediaBase64)) {
        return res.status(400).json({ error: 'Number and media (url or base64) are required' });
    }

    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        let media;

        if (mediaBase64) {
            media = new MessageMedia(mimetype, mediaBase64, filename);
        } else {
            media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
        }

        const options = { caption };

        // Send audio files as voice messages (PTT)
        if (sendAudioAsVoice === true) {
            options.sendAudioAsVoice = true;
        }

        // Send video files as GIF
        if (sendVideoAsGif === true) {
            options.sendVideoAsGif = true;
        }

        const result = await client.sendMessage(chatId, media, options);
        res.json({ success: true, messageId: result.id._serialized });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send file directly (multipart/form-data upload)
app.post('/send-file', authenticate, upload.any(), async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { number, caption, sendAudioAsVoice, sendVideoAsGif } = req.body;

    // Support multiple field names: file, attachment, data, media
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

        // Convert audio to Opus/OGG for WhatsApp voice messages
        const isAudio = mimetype.startsWith('audio/');
        const shouldSendAsVoice = sendAudioAsVoice === 'true' || sendAudioAsVoice === true;

        if (isAudio && shouldSendAsVoice) {
            console.log(`[AUDIO] Converting ${mimetype} to Opus for voice message (HQ stereo)...`);

            fileBuffer = await new Promise((resolve, reject) => {
                const chunks = [];

                ffmpeg()
                    .input(require('stream').Readable.from(uploadedFile.buffer))
                    .inputFormat(mimetype.includes('mpeg') ? 'mp3' : mimetype.split('/')[1])
                    .audioCodec('libopus')
                    .audioBitrate('128k')      // High quality bitrate
                    .audioChannels(2)          // Stereo
                    .audioFrequency(48000)     // 48kHz sample rate
                    .format('ogg')
                    .on('error', (err) => {
                        console.error('[AUDIO] Conversion failed:', err.message);
                        reject(err);
                    })
                    .on('end', () => {
                        console.log('[AUDIO] Conversion completed');
                        resolve(Buffer.concat(chunks));
                    })
                    .pipe()
                    .on('data', (chunk) => chunks.push(chunk));
            });

            mimetype = 'audio/ogg; codecs=opus';
            filename = filename.replace(/\.[^/.]+$/, '.ogg');
            console.log(`[AUDIO] Converted to ${mimetype} (128k stereo @ 48kHz), size: ${fileBuffer.length} bytes`);
        }

        // Convert file buffer to base64
        const base64 = fileBuffer.toString('base64');
        const media = new MessageMedia(mimetype, base64, filename);

        const options = {};
        if (caption) options.caption = caption;
        if (shouldSendAsVoice) {
            options.sendAudioAsVoice = true;
        }
        if (sendVideoAsGif === 'true' || sendVideoAsGif === true) {
            options.sendVideoAsGif = true;
        }

        const result = await client.sendMessage(chatId, media, options);
        res.json({
            success: true,
            messageId: result.id._serialized,
            fileInfo: {
                name: filename,
                size: fileBuffer.length,
                mimetype: mimetype,
                fieldName: uploadedFile.fieldname,
                converted: isAudio && shouldSendAsVoice
            }
        });
    } catch (error) {
        console.error('[SEND-FILE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get contacts
app.get('/contacts', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const contacts = await client.getContacts();
        res.json({ contacts: contacts.map(c => ({ id: c.id._serialized, name: c.name, number: c.number, isMyContact: c.isMyContact })) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get chats
app.get('/chats', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chats = await client.getChats();
        res.json({ chats: chats.map(c => ({ id: c.id._serialized, name: c.name, isGroup: c.isGroup, unreadCount: c.unreadCount, timestamp: c.timestamp })) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get chat by ID
app.get('/chat/:chatId', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        res.json({ chat: { id: chat.id._serialized, name: chat.name, isGroup: chat.isGroup, unreadCount: chat.unreadCount } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get chat messages
app.get('/chat/:chatId/messages', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const limit = parseInt(req.query.limit) || 50;

    try {
        const chat = await client.getChatById(req.params.chatId);
        const messages = await chat.fetchMessages({ limit });
        res.json({ messages: messages.map(m => ({ id: m.id._serialized, body: m.body, from: m.from, timestamp: m.timestamp, type: m.type })) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create group
app.post('/group/create', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { name, participants } = req.body;

    if (!name || !participants || !Array.isArray(participants)) {
        return res.status(400).json({ error: 'Name and participants array are required' });
    }

    try {
        const participantIds = participants.map(p => p.includes('@c.us') ? p : `${p}@c.us`);
        const group = await client.createGroup(name, participantIds);
        res.json({ success: true, groupId: group.gid._serialized });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get group info
app.get('/group/:groupId', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participants = chat.participants.map(p => ({ id: p.id._serialized, isAdmin: p.isAdmin, isSuperAdmin: p.isSuperAdmin }));

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
        res.status(500).json({ error: error.message });
    }
});

// Add participants to group
app.post('/group/:groupId/add-participants', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { participants } = req.body;

    if (!participants || !Array.isArray(participants)) {
        return res.status(400).json({ error: 'Participants array is required' });
    }

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participantIds = participants.map(p => p.includes('@c.us') ? p : `${p}@c.us`);
        await chat.addParticipants(participantIds);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove participants from group
app.post('/group/:groupId/remove-participants', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { participants } = req.body;

    if (!participants || !Array.isArray(participants)) {
        return res.status(400).json({ error: 'Participants array is required' });
    }

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participantIds = participants.map(p => p.includes('@c.us') ? p : `${p}@c.us`);
        await chat.removeParticipants(participantIds);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Leave group
app.post('/group/:groupId/leave', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        await chat.leave();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update group settings
app.post('/group/:groupId/settings', authenticate, async (req, res) => {
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

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Promote/demote participants
app.post('/group/:groupId/promote', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { participants } = req.body;

    if (!participants || !Array.isArray(participants)) {
        return res.status(400).json({ error: 'Participants array is required' });
    }

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participantIds = participants.map(p => p.includes('@c.us') ? p : `${p}@c.us`);
        await chat.promoteParticipants(participantIds);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/group/:groupId/demote', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { participants } = req.body;

    if (!participants || !Array.isArray(participants)) {
        return res.status(400).json({ error: 'Participants array is required' });
    }

    try {
        const chat = await client.getChatById(req.params.groupId);

        if (!chat.isGroup) {
            return res.status(400).json({ error: 'Not a group chat' });
        }

        const participantIds = participants.map(p => p.includes('@c.us') ? p : `${p}@c.us`);
        await chat.demoteParticipants(participantIds);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get profile picture
app.get('/profile-picture/:contactId', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const url = await client.getProfilePicUrl(req.params.contactId);
        res.json({ url: url || null });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get state
app.get('/state', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const state = await client.getState();
        res.json({ state });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Archive/unarchive chat
app.post('/chat/:chatId/archive', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.archive();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/chat/:chatId/unarchive', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.unarchive();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pin/unpin chat
app.post('/chat/:chatId/pin', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.pin();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/chat/:chatId/unpin', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.unpin();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mute/unmute chat
app.post('/chat/:chatId/mute', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    const { duration } = req.body; // duration in seconds, or null for forever

    try {
        const chat = await client.getChatById(req.params.chatId);
        const unmuteDate = duration ? new Date(Date.now() + duration * 1000) : null;
        await chat.mute(unmuteDate);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/chat/:chatId/unmute', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.unmute();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark chat as read/unread
app.post('/chat/:chatId/mark-read', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.sendSeen();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/chat/:chatId/mark-unread', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.markUnread();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete chat
app.delete('/chat/:chatId', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear chat messages
app.post('/chat/:chatId/clear', authenticate, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'Client not ready' });
    }

    try {
        const chat = await client.getChatById(req.params.chatId);
        await chat.clearMessages();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout
app.post('/logout', authenticate, async (req, res) => {
    try {
        await client.logout();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restart client
app.post('/restart', authenticate, async (req, res) => {
    try {
        await client.destroy();
        await client.initialize();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Global error handler for multer and other errors
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.error('[MULTER ERROR]:', error.message);
        return res.status(400).json({
            error: 'File upload error',
            message: error.message,
            code: error.code,
            field: error.field
        });
    }

    if (error) {
        console.error('[SERVER ERROR]:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }

    next();
});

// Start server
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 WhatsApp API server running on port ${PORT}`);
    console.log(`🔐 API Key authentication: ENABLED`);
    console.log(`📡 Webhook URL: ${WEBHOOK_URL || '❌ NOT CONFIGURED'}`);
    console.log(`💾 Session path: ${SESSION_PATH}`);
    console.log('='.repeat(60));

    if (!WEBHOOK_URL) {
        console.log('⚠️  WARNING: Webhook URL is not configured!');
        console.log('   Set WEBHOOK_URL in your .env file to receive events.');
    }
});
