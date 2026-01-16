import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "WA-AKG API Documentation",
        version: "1.0.0",
        description: "WhatsApp AI Gateway - Complete API Reference with 58+ endpoints for WhatsApp automation",
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
          url: "http://localhost:3000/api",
          description: "Development Server",
        },
        {
          url: "{protocol}://{host}/api",
          description: "Custom Server",
          variables: {
            protocol: {
              default: "https",
              enum: ["http", "https"],
            },
            host: {
              default: "your-domain.com",
              description: "Your deployment domain",
            },
          },
        },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
            description: "API key for authentication. Get it from Dashboard → Settings → API Key",
          },
          SessionAuth: {
            type: "apiKey",
            in: "cookie",
            name: "next-auth.session-token",
            description: "Session cookie (automatic when logged in via browser)",
          },
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              error: {
                type: "string",
                description: "Error message",
              },
            },
          },
          Success: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
              },
              message: {
                type: "string",
              },
            },
          },
          Session: {
            type: "object",
            properties: {
              id: { type: "string" },
              sessionId: { type: "string" },
              name: { type: "string" },
              status: {
                type: "string",
                enum: ["CONNECTED", "DISCONNECTED", "SCANNING"],
              },
              qr: { type: "string", nullable: true },
              userId: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
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
          description: "API key and session management",
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
          name: "Profile",
          description: "WhatsApp profile management",
        },
        {
          name: "System",
          description: "System settings and updates",
        },
      ],
    },
  });

  return spec;
};
