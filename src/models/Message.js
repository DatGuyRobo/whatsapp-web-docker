const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    chatId: {
        type: String,
        required: true,
        index: true,
    },
    from: {
        type: String,
        required: true,
        index: true,
    },
    to: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        default: '',
    },
    type: {
        type: String,
        enum: ['chat', 'image', 'video', 'audio', 'ptt', 'document', 'sticker', 'location', 'vcard', 'multi_vcard', 'revoked', 'poll', 'buttons', 'list', 'unknown'],
        default: 'chat',
    },
    hasMedia: {
        type: Boolean,
        default: false,
    },
    isGroup: {
        type: Boolean,
        default: false,
    },
    author: {
        type: String,
    },
    timestamp: {
        type: Number,
        required: true,
        index: true,
    },
    ack: {
        type: Number,
        default: -1,
    },
    ackName: {
        type: String,
        enum: ['ERROR', 'PENDING', 'SERVER', 'DEVICE', 'READ', 'PLAYED', 'UNKNOWN'],
        default: 'UNKNOWN',
    },
    isForwarded: {
        type: Boolean,
        default: false,
    },
    broadcast: {
        type: Boolean,
        default: false,
    },
    fromMe: {
        type: Boolean,
        default: false,
    },
    hasQuotedMsg: {
        type: Boolean,
        default: false,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
    },
}, {
    timestamps: true,
});

// Index for efficient queries
messageSchema.index({ chatId: 1, timestamp: -1 });
messageSchema.index({ from: 1, timestamp: -1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
