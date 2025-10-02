const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    contactId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
    },
    pushname: {
        type: String,
    },
    number: {
        type: String,
        index: true,
    },
    isMyContact: {
        type: Boolean,
        default: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isGroup: {
        type: Boolean,
        default: false,
    },
    isBusiness: {
        type: Boolean,
        default: false,
    },
    isEnterprise: {
        type: Boolean,
        default: false,
    },
    labels: [{
        type: String,
    }],
    profilePicUrl: {
        type: String,
    },
    about: {
        type: String,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Index for efficient queries
contactSchema.index({ isMyContact: 1 });
contactSchema.index({ isBlocked: 1 });
contactSchema.index({ labels: 1 });

module.exports = mongoose.model('Contact', contactSchema);
