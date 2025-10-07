#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3000';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const MCP_SERVER_PORT = process.env.MCP_SERVER_PORT || 3001;

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

// Store active transports by session ID
const transports = {};

// Create MCP server with tools
const getServer = () => {
  const server = new McpServer({
    name: 'whatsapp-mcp-server',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  // Register all WhatsApp tools
  server.registerTool('send_whatsapp_message', {
    description: 'Send a text message to a WhatsApp number or group',
    inputSchema: {
      number: z.string().describe('Phone number (with country code, no + sign) or group ID'),
      message: z.string().describe('Message text to send'),
    },
  }, async ({ number, message }) => {
    const response = await whatsappAPI.post('/api/send-message', { number, message });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('send_whatsapp_media', {
    description: 'Send media (image, video, audio, document) from URL to a WhatsApp number',
    inputSchema: {
      number: z.string().describe('Phone number (with country code, no + sign) or group ID'),
      mediaUrl: z.string().describe('URL of the media file to send'),
      caption: z.string().optional().describe('Optional caption for the media'),
    },
  }, async ({ number, mediaUrl, caption }) => {
    const response = await whatsappAPI.post('/api/send-media', { number, mediaUrl, caption });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('send_bulk_whatsapp_messages', {
    description: 'Send messages to multiple recipients with automatic queuing',
    inputSchema: {
      messages: z.array(z.object({
        number: z.string().describe('Phone number with country code'),
        message: z.string().describe('Message text'),
        delay: z.number().optional().describe('Delay in milliseconds before sending (default: 2000)'),
      })).describe('Array of message objects'),
    },
  }, async ({ messages }) => {
    const response = await whatsappAPI.post('/api/send-bulk-messages', { messages });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('get_whatsapp_chats', {
    description: 'Get all WhatsApp chats',
    inputSchema: {},
  }, async () => {
    const response = await whatsappAPI.get('/api/chats');
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('get_whatsapp_contacts', {
    description: 'Get all WhatsApp contacts',
    inputSchema: {},
  }, async () => {
    const response = await whatsappAPI.get('/api/contacts');
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('get_chat_messages', {
    description: 'Get messages from a specific chat',
    inputSchema: {
      chatId: z.string().describe('Chat ID (e.g., 1234567890@c.us for individual, 123456789@g.us for group)'),
      limit: z.number().optional().describe('Number of messages to retrieve (default: 50)'),
    },
  }, async ({ chatId, limit = 50 }) => {
    const response = await whatsappAPI.get(`/api/chat/${chatId}/messages`, { params: { limit } });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('create_whatsapp_group', {
    description: 'Create a new WhatsApp group',
    inputSchema: {
      name: z.string().describe('Group name'),
      participants: z.array(z.string()).describe('Array of phone numbers (with country code) to add to the group'),
    },
  }, async ({ name, participants }) => {
    const response = await whatsappAPI.post('/api/group/create', { name, participants });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('get_whatsapp_group_info', {
    description: 'Get information about a WhatsApp group',
    inputSchema: {
      groupId: z.string().describe('Group ID (e.g., 123456789@g.us)'),
    },
  }, async ({ groupId }) => {
    const response = await whatsappAPI.get(`/api/group/${groupId}`);
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('add_group_participants', {
    description: 'Add participants to a WhatsApp group',
    inputSchema: {
      groupId: z.string().describe('Group ID'),
      participants: z.array(z.string()).describe('Array of phone numbers to add'),
    },
  }, async ({ groupId, participants }) => {
    const response = await whatsappAPI.post(`/api/group/${groupId}/add-participants`, { participants });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('remove_group_participants', {
    description: 'Remove participants from a WhatsApp group',
    inputSchema: {
      groupId: z.string().describe('Group ID'),
      participants: z.array(z.string()).describe('Array of phone numbers to remove'),
    },
  }, async ({ groupId, participants }) => {
    const response = await whatsappAPI.post(`/api/group/${groupId}/remove-participants`, { participants });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('send_whatsapp_reaction', {
    description: 'Send an emoji reaction to a message',
    inputSchema: {
      messageId: z.string().describe('ID of the message to react to'),
      reaction: z.string().describe('Emoji to react with (e.g., 👍, ❤️, 😂)'),
    },
  }, async ({ messageId, reaction }) => {
    const response = await whatsappAPI.post('/api/send-reaction', { messageId, reaction });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('create_whatsapp_poll', {
    description: 'Create a poll in a WhatsApp chat',
    inputSchema: {
      number: z.string().describe('Phone number or group ID'),
      question: z.string().describe('Poll question'),
      options: z.array(z.string()).describe('Array of poll options (2-12 options)'),
      allowMultipleAnswers: z.boolean().optional().describe('Allow multiple answers (default: false)'),
    },
  }, async ({ number, question, options, allowMultipleAnswers = false }) => {
    const response = await whatsappAPI.post('/api/create-poll', { number, question, options, allowMultipleAnswers });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('archive_whatsapp_chat', {
    description: 'Archive or unarchive a WhatsApp chat',
    inputSchema: {
      chatId: z.string().describe('Chat ID'),
      archive: z.boolean().describe('true to archive, false to unarchive'),
    },
  }, async ({ chatId, archive }) => {
    const response = await whatsappAPI.post(`/api/chat/${chatId}/archive`, { archive });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('pin_whatsapp_chat', {
    description: 'Pin or unpin a WhatsApp chat',
    inputSchema: {
      chatId: z.string().describe('Chat ID'),
      pin: z.boolean().describe('true to pin, false to unpin'),
    },
  }, async ({ chatId, pin }) => {
    const response = await whatsappAPI.post(`/api/chat/${chatId}/pin`, { pin });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('mark_whatsapp_chat_read', {
    description: 'Mark a WhatsApp chat as read or unread',
    inputSchema: {
      chatId: z.string().describe('Chat ID'),
      read: z.boolean().describe('true to mark as read, false to mark as unread'),
    },
  }, async ({ chatId, read }) => {
    const response = await whatsappAPI.post(`/api/chat/${chatId}/mark-read`, { read });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('get_whatsapp_profile_picture', {
    description: 'Get profile picture URL for a contact',
    inputSchema: {
      contactId: z.string().describe('Contact ID (e.g., 1234567890@c.us)'),
    },
  }, async ({ contactId }) => {
    const response = await whatsappAPI.get(`/api/profile-picture/${contactId}`);
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('block_whatsapp_contact', {
    description: 'Block a WhatsApp contact',
    inputSchema: {
      contactId: z.string().describe('Contact ID to block'),
    },
  }, async ({ contactId }) => {
    const response = await whatsappAPI.post('/api/block-contact', { contactId });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('unblock_whatsapp_contact', {
    description: 'Unblock a WhatsApp contact',
    inputSchema: {
      contactId: z.string().describe('Contact ID to unblock'),
    },
  }, async ({ contactId }) => {
    const response = await whatsappAPI.post('/api/unblock-contact', { contactId });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  server.registerTool('get_whatsapp_info', {
    description: 'Get WhatsApp client information and status',
    inputSchema: {},
  }, async () => {
    const response = await whatsappAPI.get('/api/info');
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  });

  return server;
};

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// POST handler for MCP requests
const mcpPostHandler = async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'];
    const body = req.body;

    console.log('POST /mcp request:', {
      sessionId,
      method: body?.method,
      hasBody: !!body,
      headers: {
        'content-type': req.headers['content-type'],
        'accept': req.headers['accept'],
      }
    });

    // Check if this is an initialization request
    if (!sessionId && isInitializeRequest(body)) {
      console.log('New initialization request');

      // Create new transport for this session
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID when session is initialized
          transports[sessionId] = transport;
          console.log(`Session initialized: ${sessionId}`);

          // Set up onclose handler
          transport.onclose = () => {
            console.log(`Transport closed for session ${sessionId}`);
            delete transports[sessionId];
          };
        },
      });

      // Connect transport to server
      const server = getServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
      return;
    }

    // Existing session
    if (sessionId && transports[sessionId]) {
      const transport = transports[sessionId];
      await transport.handleRequest(req, res, body);
      return;
    }

    // Invalid request
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error: ' + error.message,
        },
        id: null,
      });
    }
  }
};

// GET handler for SSE streams
const mcpGetHandler = async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  console.log(`SSE stream for session ${sessionId}`);
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Setup routes
app.post('/mcp', mcpPostHandler);
app.get('/mcp', mcpGetHandler);

// Test page
app.get('/test', (req, res) => {
  res.sendFile(new URL('./test-mcp-connection.html', import.meta.url).pathname);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'whatsapp-mcp-server' });
});

// Info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp MCP Server',
    version: '1.0.0',
    transport: 'Streamable HTTP',
    endpoint: '/mcp',
    sessions: Object.keys(transports).length,
    documentation: {
      health: '/health',
      mcp: '/mcp (GET/POST)',
    },
  });
});

// Start server
app.listen(MCP_SERVER_PORT, () => {
  console.log(`WhatsApp MCP Server running on http://localhost:${MCP_SERVER_PORT}`);
  console.log(`Streamable HTTP endpoint: http://localhost:${MCP_SERVER_PORT}/mcp`);
  console.log(`\nFor n8n MCP integration, use: http://localhost:${MCP_SERVER_PORT}/mcp`);
});
