const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
    event: {
        type: String,
        required: true,
        index: true,
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    webhookUrl: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'retrying'],
        default: 'pending',
        index: true,
    },
    statusCode: {
        type: Number,
    },
    responseData: {
        type: mongoose.Schema.Types.Mixed,
    },
    errorMessage: {
        type: String,
    },
    retryCount: {
        type: Number,
        default: 0,
    },
    lastRetryAt: {
        type: Date,
    },
    completedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Index for efficient queries
webhookLogSchema.index({ createdAt: -1 });
webhookLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
