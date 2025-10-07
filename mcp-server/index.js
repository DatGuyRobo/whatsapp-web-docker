#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3000';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

if (!WHATSAPP_API_KEY) {
  console.error('Error: WHATSAPP_API_KEY environment variable is required');
  process.exit(1);
}

// Create axios instance with default config
const whatsappAPI = axios.create({
  baseURL: WHATSAPP_API_URL,
  headers: {
    'X-API-Key': WHATSAPP_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// MCP Server
const server = new Server(
  {
    name: 'whatsapp-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: 'send_whatsapp_message',
    description: 'Send a text message to a WhatsApp number or group',
    inputSchema: {
      type: 'object',
      properties: {
        number: {
          type: 'string',
          description: 'Phone number (with country code, no + sign) or group ID',
        },
        message: {
          type: 'string',
          description: 'Message text to send',
        },
      },
      required: ['number', 'message'],
    },
  },
  {
    name: 'send_whatsapp_media',
    description: 'Send media (image, video, audio, document) from URL to a WhatsApp number',
    inputSchema: {
      type: 'object',
      properties: {
        number: {
          type: 'string',
          description: 'Phone number (with country code, no + sign) or group ID',
        },
        mediaUrl: {
          type: 'string',
          description: 'URL of the media file to send',
        },
        caption: {
          type: 'string',
          description: 'Optional caption for the media',
        },
      },
      required: ['number', 'mediaUrl'],
    },
  },
  {
    name: 'send_bulk_whatsapp_messages',
    description: 'Send messages to multiple recipients with automatic queuing',
    inputSchema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          description: 'Array of message objects',
          items: {
            type: 'object',
            properties: {
              number: { type: 'string', description: 'Phone number with country code' },
              message: { type: 'string', description: 'Message text' },
              delay: { type: 'number', description: 'Delay in milliseconds before sending (default: 2000)' },
            },
            required: ['number', 'message'],
          },
        },
      },
      required: ['messages'],
    },
  },
  {
    name: 'get_whatsapp_chats',
    description: 'Get all WhatsApp chats',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_whatsapp_contacts',
    description: 'Get all WhatsApp contacts',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_chat_messages',
    description: 'Get messages from a specific chat',
    inputSchema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'Chat ID (e.g., 1234567890@c.us for individual, 123456789@g.us for group)',
        },
        limit: {
          type: 'number',
          description: 'Number of messages to retrieve (default: 50)',
        },
      },
      required: ['chatId'],
    },
  },
  {
    name: 'create_whatsapp_group',
    description: 'Create a new WhatsApp group',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Group name',
        },
        participants: {
          type: 'array',
          description: 'Array of phone numbers (with country code) to add to the group',
          items: { type: 'string' },
        },
      },
      required: ['name', 'participants'],
    },
  },
  {
    name: 'get_whatsapp_group_info',
    description: 'Get information about a WhatsApp group',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'Group ID (e.g., 123456789@g.us)',
        },
      },
      required: ['groupId'],
    },
  },
  {
    name: 'add_group_participants',
    description: 'Add participants to a WhatsApp group',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'Group ID',
        },
        participants: {
          type: 'array',
          description: 'Array of phone numbers to add',
          items: { type: 'string' },
        },
      },
      required: ['groupId', 'participants'],
    },
  },
  {
    name: 'remove_group_participants',
    description: 'Remove participants from a WhatsApp group',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'Group ID',
        },
        participants: {
          type: 'array',
          description: 'Array of phone numbers to remove',
          items: { type: 'string' },
        },
      },
      required: ['groupId', 'participants'],
    },
  },
  {
    name: 'send_whatsapp_reaction',
    description: 'Send an emoji reaction to a message',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'ID of the message to react to',
        },
        reaction: {
          type: 'string',
          description: 'Emoji to react with (e.g., 👍, ❤️, 😂)',
        },
      },
      required: ['messageId', 'reaction'],
    },
  },
  {
    name: 'create_whatsapp_poll',
    description: 'Create a poll in a WhatsApp chat',
    inputSchema: {
      type: 'object',
      properties: {
        number: {
          type: 'string',
          description: 'Phone number or group ID',
        },
        question: {
          type: 'string',
          description: 'Poll question',
        },
        options: {
          type: 'array',
          description: 'Array of poll options (2-12 options)',
          items: { type: 'string' },
        },
        allowMultipleAnswers: {
          type: 'boolean',
          description: 'Allow multiple answers (default: false)',
        },
      },
      required: ['number', 'question', 'options'],
    },
  },
  {
    name: 'archive_whatsapp_chat',
    description: 'Archive or unarchive a WhatsApp chat',
    inputSchema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'Chat ID',
        },
        archive: {
          type: 'boolean',
          description: 'true to archive, false to unarchive',
        },
      },
      required: ['chatId', 'archive'],
    },
  },
  {
    name: 'pin_whatsapp_chat',
    description: 'Pin or unpin a WhatsApp chat',
    inputSchema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'Chat ID',
        },
        pin: {
          type: 'boolean',
          description: 'true to pin, false to unpin',
        },
      },
      required: ['chatId', 'pin'],
    },
  },
  {
    name: 'mark_whatsapp_chat_read',
    description: 'Mark a WhatsApp chat as read or unread',
    inputSchema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'Chat ID',
        },
        read: {
          type: 'boolean',
          description: 'true to mark as read, false to mark as unread',
        },
      },
      required: ['chatId', 'read'],
    },
  },
  {
    name: 'get_whatsapp_profile_picture',
    description: 'Get profile picture URL for a contact',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Contact ID (e.g., 1234567890@c.us)',
        },
      },
      required: ['contactId'],
    },
  },
  {
    name: 'block_whatsapp_contact',
    description: 'Block a WhatsApp contact',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Contact ID to block',
        },
      },
      required: ['contactId'],
    },
  },
  {
    name: 'unblock_whatsapp_contact',
    description: 'Unblock a WhatsApp contact',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Contact ID to unblock',
        },
      },
      required: ['contactId'],
    },
  },
  {
    name: 'get_whatsapp_info',
    description: 'Get WhatsApp client information and status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'send_whatsapp_message': {
        const response = await whatsappAPI.post('/api/send-message', {
          number: args.number,
          message: args.message,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'send_whatsapp_media': {
        const response = await whatsappAPI.post('/api/send-media', {
          number: args.number,
          mediaUrl: args.mediaUrl,
          caption: args.caption,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'send_bulk_whatsapp_messages': {
        const response = await whatsappAPI.post('/api/send-bulk-messages', {
          messages: args.messages,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'get_whatsapp_chats': {
        const response = await whatsappAPI.get('/api/chats');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'get_whatsapp_contacts': {
        const response = await whatsappAPI.get('/api/contacts');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'get_chat_messages': {
        const { chatId, limit = 50 } = args;
        const response = await whatsappAPI.get(`/api/chat/${chatId}/messages`, {
          params: { limit },
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'create_whatsapp_group': {
        const response = await whatsappAPI.post('/api/group/create', {
          name: args.name,
          participants: args.participants,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'get_whatsapp_group_info': {
        const response = await whatsappAPI.get(`/api/group/${args.groupId}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'add_group_participants': {
        const response = await whatsappAPI.post(
          `/api/group/${args.groupId}/add-participants`,
          { participants: args.participants }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'remove_group_participants': {
        const response = await whatsappAPI.post(
          `/api/group/${args.groupId}/remove-participants`,
          { participants: args.participants }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'send_whatsapp_reaction': {
        const response = await whatsappAPI.post('/api/send-reaction', {
          messageId: args.messageId,
          reaction: args.reaction,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'create_whatsapp_poll': {
        const response = await whatsappAPI.post('/api/create-poll', {
          number: args.number,
          question: args.question,
          options: args.options,
          allowMultipleAnswers: args.allowMultipleAnswers || false,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'archive_whatsapp_chat': {
        const response = await whatsappAPI.post(`/api/chat/${args.chatId}/archive`, {
          archive: args.archive,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'pin_whatsapp_chat': {
        const response = await whatsappAPI.post(`/api/chat/${args.chatId}/pin`, {
          pin: args.pin,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'mark_whatsapp_chat_read': {
        const response = await whatsappAPI.post(`/api/chat/${args.chatId}/mark-read`, {
          read: args.read,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'get_whatsapp_profile_picture': {
        const response = await whatsappAPI.get(`/api/profile-picture/${args.contactId}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'block_whatsapp_contact': {
        const response = await whatsappAPI.post('/api/block-contact', {
          contactId: args.contactId,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'unblock_whatsapp_contact': {
        const response = await whatsappAPI.post('/api/unblock-contact', {
          contactId: args.contactId,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'get_whatsapp_info': {
        const response = await whatsappAPI.get('/api/info');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data || error.message;
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${JSON.stringify(errorMessage, null, 2)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('WhatsApp MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
