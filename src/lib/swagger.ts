import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "WA-AKG API Documentation",
        version: "1.2.0",
        description: `
# WhatsApp AI Gateway - Complete API Reference

A comprehensive WhatsApp automation gateway with **64+ API endpoints** for complete WhatsApp Web functionality.

## Features
- 🔐 Secure authentication with API keys and sessions
- 💬 Complete messaging capabilities (text, media, polls, reactions)
- 👥 Full group management
- 🏷️ Labels and chat organization
- 📊 Analytics and notifications
- 🤖 Auto-reply and scheduling
- 🔄 Webhook integrations

## Base URL
- Development: \`http://localhost:3000/api\`
- Production: \`https://your-domain.com/api\`

## Authentication
All endpoints require authentication via:
1. **API Key** - Header: \`X-API-Key: your-api-key\`
2. **Session Cookie** - Automatic when logged in via browser

Get your API key from Dashboard → Settings → API Key
        `,
        contact: {
          name: "WA-AKG Support",
          url: "https://github.com/mrifqidaffaaditya/WA-AKG",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
          description: "API Server",
        },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
            description: "API key for authentication. Get it from Dashboard → Settings",
          },
          SessionAuth: {
            type: "apiKey",
            in: "cookie",
            name: "next-auth.session-token",
            description: "Session cookie (automatic when logged in)",
          },
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              error: {
                type: "string",
                description: "Error message",
                example: "Unauthorized",
              },
            },
          },
          Success: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                example: true,
              },
              message: {
                type: "string",
                example: "Operation completed successfully",
              },
            },
          },
          Session: {
            type: "object",
            properties: {
              id: { type: "string", example: "cm123456" },
              sessionId: { type: "string", example: "my-session" },
              name: { type: "string", example: "Marketing WhatsApp" },
              status: {
                type: "string",
                enum: ["CONNECTED", "DISCONNECTED", "SCAN_QR"],
                example: "CONNECTED",
              },
              qr: { type: "string", nullable: true },
              userId: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          Message: {
            type: "object",
            properties: {
              id: { type: "string" },
              sessionId: { type: "string" },
              remoteJid: { type: "string", example: "628123456789@s.whatsapp.net" },
              senderJid: { type: "string" },
              fromMe: { type: "boolean" },
              content: { type: "string" },
              type: {
                type: "string",
                enum: ["TEXT", "IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "STICKER", "LOCATION", "CONTACT"],
              },
              timestamp: { type: "string", format: "date-time" },
            },
          },
          Label: {
            type: "object",
            properties: {
              id: { type: "string" },
              sessionId: { type: "string" },
              name: { type: "string", example: "Important" },
              color: { type: "integer", minimum: 0, maximum: 19, example: 0 },
              colorHex: { type: "string", example: "#FF0000" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
      security: [
        {
          ApiKeyAuth: [],
        },
        {
          SessionAuth: [],
        },
      ],
      tags: [
        {
          name: "Authentication",
          description: "API authentication and session management",
        },
        {
          name: "Sessions",
          description: "WhatsApp session management",
        },
        {
          name: "Messaging",
          description: "Send and manage messages",
        },
        {
          name: "Chat",
          description: "Chat management and operations",
        },
        {
          name: "Groups",
          description: "WhatsApp group management",
        },
        {
          name: "Contacts",
          description: "Contact management",
        },
        {
          name: "Labels",
          description: "Labels and tags for organizing chats",
        },
        {
          name: "Profile",
          description: "WhatsApp profile management",
        },
        {
          name: "Auto Reply",
          description: "Automated message responses",
        },
        {
          name: "Scheduler",
          description: "Schedule messages",
        },
        {
          name: "Webhooks",
          description: "Webhook configuration",
        },
        {
          name: "Notifications",
          description: "System notifications",
        },
        {
          name: "Users",
          description: "User management (Admin only)",
        },
        {
          name: "System",
          description: "System settings and updates",
        },
      ],
      paths: {
        // This will be auto-generated by next-swagger-doc
        // But we can add custom path definitions here if needed
      },
    },
  });

  return spec;
};
