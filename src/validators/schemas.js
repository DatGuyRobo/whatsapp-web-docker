const Joi = require('joi');

// Phone number regex (basic validation)
const phoneRegex = /^[0-9@.]+$/;

const schemas = {
    // Send message
    sendMessage: Joi.object({
        number: Joi.string().pattern(phoneRegex).required()
            .messages({
                'string.pattern.base': 'Number must contain only digits, @, and .',
                'any.required': 'Number is required',
            }),
        message: Joi.string().min(1).required()
            .messages({
                'string.min': 'Message cannot be empty',
                'any.required': 'Message is required',
            }),
    }),

    // Send media
    sendMedia: Joi.object({
        number: Joi.string().pattern(phoneRegex).required(),
        mediaUrl: Joi.string().uri().when('mediaBase64', {
            is: Joi.exist(),
            then: Joi.optional(),
            otherwise: Joi.required(),
        }),
        mediaBase64: Joi.string().base64().optional(),
        mimetype: Joi.string().when('mediaBase64', {
            is: Joi.exist(),
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
        filename: Joi.string().optional(),
        caption: Joi.string().optional(),
        sendAudioAsVoice: Joi.boolean().optional(),
        sendVideoAsGif: Joi.boolean().optional(),
    }),

    // Bulk messages
    sendBulkMessages: Joi.object({
        messages: Joi.array().items(
            Joi.object({
                number: Joi.string().pattern(phoneRegex).required(),
                message: Joi.string().min(1).required(),
                delay: Joi.number().min(0).max(60000).optional(),
            })
        ).min(1).max(100).required()
            .messages({
                'array.min': 'At least one message is required',
                'array.max': 'Maximum 100 messages per request',
            }),
    }),

    // Create group
    createGroup: Joi.object({
        name: Joi.string().min(1).max(25).required()
            .messages({
                'string.max': 'Group name cannot exceed 25 characters',
            }),
        participants: Joi.array().items(
            Joi.string().pattern(phoneRegex)
        ).min(1).required()
            .messages({
                'array.min': 'At least one participant is required',
            }),
    }),

    // Manage participants
    manageParticipants: Joi.object({
        participants: Joi.array().items(
            Joi.string().pattern(phoneRegex)
        ).min(1).required()
            .messages({
                'array.min': 'At least one participant is required',
            }),
    }),

    // Group settings
    groupSettings: Joi.object({
        messageSend: Joi.string().valid('all', 'admins').optional(),
        settingsChange: Joi.string().valid('all', 'admins').optional(),
    }),

    // Mute chat
    muteChat: Joi.object({
        duration: Joi.number().min(0).optional().allow(null)
            .messages({
                'number.min': 'Duration must be a positive number',
            }),
    }),

    // Send reaction
    sendReaction: Joi.object({
        messageId: Joi.string().required(),
        reaction: Joi.string().max(10).required()
            .messages({
                'string.max': 'Reaction must be a single emoji',
            }),
    }),

    // Create poll
    createPoll: Joi.object({
        number: Joi.string().pattern(phoneRegex).required(),
        question: Joi.string().min(1).max(255).required()
            .messages({
                'string.max': 'Question cannot exceed 255 characters',
            }),
        options: Joi.array().items(
            Joi.string().min(1).max(100)
        ).min(2).max(12).required()
            .messages({
                'array.min': 'Poll must have at least 2 options',
                'array.max': 'Poll cannot have more than 12 options',
                'string.max': 'Option cannot exceed 100 characters',
            }),
        allowMultipleAnswers: Joi.boolean().optional().default(false),
    }),

    // Set typing
    setTyping: Joi.object({
        chatId: Joi.string().pattern(phoneRegex).required(),
        typing: Joi.boolean().required(),
    }),

    // Block/unblock contact
    blockContact: Joi.object({
        contactId: Joi.string().pattern(phoneRegex).required(),
    }),

    // Send status
    sendStatus: Joi.object({
        content: Joi.string().when('mediaUrl', {
            is: Joi.exist(),
            then: Joi.optional(),
            otherwise: Joi.required(),
        }),
        mediaUrl: Joi.string().uri().optional(),
        mediaBase64: Joi.string().base64().optional(),
        mimetype: Joi.string().optional(),
        backgroundColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
        font: Joi.number().min(0).max(5).optional(),
    }),
};

module.exports = schemas;
