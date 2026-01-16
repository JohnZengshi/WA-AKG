# WA-AKG API Documentation

Comprehensive API documentation for the WA-AKG WhatsApp Gateway application.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Session Management](#session-management)
- [Messaging](#messaging)
- [Chat Management](#chat-management)
- [Contacts](#contacts)
- [Groups](#groups)
- [Auto Reply](#auto-reply)
- [Scheduler](#scheduler)
- [Webhooks](#webhooks)
- [Notifications](#notifications)
- [User Management](#user-management)
- [System Settings](#system-settings)
- [Status/Stories](#statusstories)

---

## 🌐 Base URL

```
http://localhost:3000/api
```

For production, replace with your deployed domain.

---

## 🔐 Authentication

All API endpoints (except `/api/auth`) require authentication. The API supports two authentication methods:

### 1. Session-based Authentication
Using NextAuth session cookies (automatic when logged in via browser)

### 2. API Key Authentication
Include the API key in request headers:

```http
X-API-Key: ak_your-api-key-here
```

### API Key Management

#### `GET /api/user/api-key`

Get the current user's API key.

**Authentication:** Required (Session)

**Response:**
```json
{
  "apiKey": "ak_xxxxxxxxxxxxxxxx" | null
}
```

---

#### `POST /api/user/api-key`

Generate a new API key for the authenticated user.

**Authentication:** Required (Session)

**Response:**
```json
{
  "apiKey": "ak_xxxxxxxxxxxxxxxx"
}
```

---

#### `DELETE /api/user/api-key`

Revoke/delete the current user's API key.

**Authentication:** Required (Session)

**Response:**
```json
{
  "success": true
}
```

---

## 📱 Session Management

### `GET /api/sessions`

Fetch all WhatsApp sessions accessible by the authenticated user.

- **SUPERADMIN/OWNER**: Can see all sessions
- **STAFF**: Can only see sessions they own

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "cuid...",
    "sessionId": "session-name",
    "name": "My WhatsApp Session",
    "status": "CONNECTED" | "DISCONNECTED" | "SCANNING",
    "qr": "2@...",
    "userId": "user-id",
    "config": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### `POST /api/sessions`

Create a new WhatsApp session for the authenticated user.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "My Session Name",
  "sessionId": "optional-custom-id"
}
```

**Response:**
```json
{
  "id": "cuid...",
  "sessionId": "session-name",
  "name": "My Session Name",
  "status": "DISCONNECTED",
  "userId": "user-id"
}
```

---

### Bot Configuration

#### `GET /api/sessions/[id]/bot-config`

Get bot configuration for a specific session.

**Authentication:** Required

**Parameters:**
- `id` (path): Session ID

**Response:**
```json
{
  "enabled": true,
  "botMode": "OWNER" | "ALL" | "ALLOWED",
  "botAllowedJids": ["6281234567890@s.whatsapp.net"],
  "autoReplyMode": "ALL" | "PRIVATE" | "GROUP" | "ALLOWED",
  "autoReplyAllowedJids": [],
  "enableSticker": true,
  "enablePing": true,
  "enableUptime": true,
  "botName": "WA-AKG Bot",
  "removeBgApiKey": null,
  "enableVideoSticker": true,
  "maxStickerDuration": 10
}
```

**Bot Modes:**
- `OWNER`: Bot commands only work for session owner
- `ALL`: Bot commands work for everyone
- `ALLOWED`: Bot commands only work for JIDs in `botAllowedJids`

**Auto-Reply Modes:**
- `ALL`: Auto-reply works in all chats
- `PRIVATE`: Auto-reply only in private chats
- `GROUP`: Auto-reply only in groups
- `ALLOWED`: Auto-reply only for JIDs in `autoReplyAllowedJids`

---

#### `POST /api/sessions/[id]/bot-config`

Update bot configuration for a specific session.

**Authentication:** Required

**Parameters:**
- `id` (path): Session ID

**Request Body:**
```json
{
  "enabled": true,
  "botMode": "OWNER",
  "botAllowedJids": ["6281234567890@s.whatsapp.net"],
  "autoReplyMode": "ALL",
  "enableSticker": true,
  "enablePing": true,
  "enableUptime": true,
  "botName": "My Bot",
  "removeBgApiKey": "your-api-key",
  "enableVideoSticker": true,
  "maxStickerDuration": 10
}
```

**Response:** Returns the updated configuration object.

---

### `PATCH /api/sessions/[id]/settings`

Update session configuration settings.

**Authentication:** Required

**Parameters:**
- `id` (path): Session ID

**Request Body:**
```json
{
  "config": {
    "someConfig": "value"
  }
}
```

**Response:** Returns the updated session object.

---

### `DELETE /api/sessions/[id]/settings`

Delete a WhatsApp session. This will:
1. Logout from WhatsApp
2. Delete the session from memory
3. Delete the session from database

**Authentication:** Required

**Parameters:**
- `id` (path): Session ID

**Response:**
```json
{
  "success": true
}
```

---

## 💬 Messaging

### `POST /api/chat/send`

Send a message to a specific JID (phone number or group).

**Authentication:** Required

**Request Body:**
```json
{
  "sessionId": "session-name",
  "jid": "6281234567890@s.whatsapp.net",
  "message": {
    "text": "Hello World"
  }
}
```

**Message Types:**

1. **Text Message:**
```json
{
  "sessionId": "session-name",
  "jid": "6281234567890@s.whatsapp.net",
  "message": {
    "text": "Hello!"
  }
}
```

2. **Image Message:**
```json
{
  "sessionId": "session-name",
  "jid": "6281234567890@s.whatsapp.net",
  "message": {
    "image": {
      "url": "https://example.com/image.jpg"
    },
    "caption": "Check this out!"
  }
}
```

3. **Video Message:**
```json
{
  "sessionId": "session-name",
  "jid": "6281234567890@s.whatsapp.net",
  "message": {
    "video": {
      "url": "https://example.com/video.mp4"
    },
    "caption": "Watch this!"
  }
}
```

4. **Sticker from URL:**
```json
{
  "sessionId": "session-name",
  "jid": "6281234567890@s.whatsapp.net",
  "message": {
    "sticker": {
      "url": "https://example.com/image.jpg",
      "pack": "My Sticker Pack",
      "author": "Author Name"
    }
  }
}
```

**Response:**
```json
{
  "success": true
}
```

---

### `POST /api/messages/broadcast`

Send the same message to multiple recipients with delay.

**Authentication:** Required

**Request Body:**
```json
{
  "sessionId": "session-name",
  "recipients": [
    "6281234567890@s.whatsapp.net",
    "6289876543210@s.whatsapp.net"
  ],
  "message": "Your broadcast message here",
  "delay": 10000
}
```

> **Note:** Messages are sent with a random delay of 10-20 seconds between each recipient to avoid spam detection.

**Response:**
```json
{
  "success": true,
  "message": "Broadcast started in background"
}
```

---

### `POST /api/messages/sticker`

Create and send a sticker from an uploaded image/video file.

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Form Data:**
- `sessionId`: Session ID
- `jid`: Recipient JID
- `file`: Image or video file (for sticker conversion)

**Response:**
```json
{
  "success": true
}
```

---

### `POST /api/messages/spam`

Send multiple messages rapidly to a specific JID (for testing purposes).

**Authentication:** Required

⚠️ **Warning:** Use responsibly. This can result in WhatsApp bans.

**Request Body:**
```json
{
  "sessionId": "session-name",
  "jid": "6281234567890@s.whatsapp.net",
  "message": "Test message",
  "count": 10,
  "delay": 500
}
```

- `count`: Number of messages to send (default: 10)
- `delay`: Delay in milliseconds between messages (default: 500)

**Response:**
```json
{
  "success": true,
  "message": "Bombing 10 messages started"
}
```

---

## 💭 Chat Management

### `GET /api/chat/[sessionId]`

Get a list of all chats (contacts) for a specific session, sorted by last message timestamp.

**Authentication:** Required

**Parameters:**
- `sessionId` (path): Session ID

**Response:**
```json
[
  {
    "jid": "6281234567890@s.whatsapp.net",
    "name": "John Doe",
    "notify": "John",
    "profilePic": "https://...",
    "lastMessage": {
      "content": "Hello!",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "type": "text"
    }
  }
]
```

---

### `GET /api/chat/[sessionId]/[jid]`

Get all messages in a specific chat (individual or group).

**Authentication:** Required

**Parameters:**
- `sessionId` (path): Session ID
- `jid` (path): Contact/Group JID (URL-encoded)

**Example:**
```
GET /api/chat/my-session/6281234567890%40s.whatsapp.net
```

**Response:**
```json
[
  {
    "id": "message-id",
    "sessionId": "db-session-id",
    "remoteJid": "6281234567890@s.whatsapp.net",
    "senderJid": "6281234567890@s.whatsapp.net",
    "content": "Hello!",
    "type": "text",
    "fromMe": false,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "fileUrl": null,
    "sender": {
      "id": "6281234567890@s.whatsapp.net",
      "admin": null,
      "name": "John Doe"
    }
  }
]
```

> **Note:** For group chats, messages include enriched sender information from group participants.

---

## 👥 Contacts

### `GET /api/contacts`

Get paginated list of contacts for a specific session.

**Authentication:** Required

**Query Parameters:**
- `sessionId` (required): Session ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search query (searches in name, notify, verifiedName, jid, remoteJidAlt)

**Example:**
```
GET /api/contacts?sessionId=my-session&page=1&limit=20&search=john
```

**Response:**
```json
{
  "data": [
    {
      "id": "contact-id",
      "sessionId": "db-session-id",
      "jid": "6281234567890@s.whatsapp.net",
      "name": "John Doe",
      "notify": "John",
      "verifiedName": null,
      "profilePic": "https://...",
      "remoteJidAlt": "6281234567890"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 👨‍👩‍👧‍👦 Groups

### `GET /api/groups`

Get all WhatsApp groups for a session.

**Authentication:** Required

**Query Parameters:**
- `sessionId` (optional): Specific session ID. If not provided, returns groups from the first connected session.

**Example:**
```
GET /api/groups?sessionId=my-session
```

**Response:**
```json
[
  {
    "id": "group-db-id",
    "sessionId": "db-session-id",
    "jid": "120363123456789@g.us",
    "subject": "My Group",
    "size": 50,
    "owner": "6281234567890@s.whatsapp.net",
    "desc": "Group description",
    "descId": "...",
    "restrict": false,
    "announce": false,
    "participants": [
      {
        "id": "6281234567890@s.whatsapp.net",
        "admin": "admin" | "superadmin" | null,
        "name": "John Doe"
      }
    ]
  }
]
```

---

### `POST /api/groups/create`

Create a new WhatsApp group.

**Authentication:** Required

**Request Body:**
```json
{
  "sessionId": "session-name",
  "subject": "Group Name",
  "participants": [
    "6281234567890@s.whatsapp.net",
    "6289876543210@s.whatsapp.net"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "group": {
    "id": "120363123456789@g.us",
    "subject": "Group Name",
    "gid": "..."
  }
}
```

---

## 🤖 Auto Reply

### `GET /api/autoreplies`

Get all auto-reply rules for a specific session.

**Authentication:** Required

**Query Parameters:**
- `sessionId` (required): Session ID

**Example:**
```
GET /api/autoreplies?sessionId=my-session
```

**Response:**
```json
[
  {
    "id": "autoreply-id",
    "sessionId": "db-session-id",
    "keyword": "hello",
    "response": "Hi there! How can I help you?",
    "matchType": "EXACT" | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH",
    "isMedia": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### `POST /api/autoreplies`

Create a new auto-reply rule.

**Authentication:** Required

**Request Body:**
```json
{
  "sessionId": "session-name",
  "keyword": "hello",
  "response": "Hi there!",
  "matchType": "EXACT"
}
```

**Match Types:**
- `EXACT`: Message must exactly match the keyword
- `CONTAINS`: Message contains the keyword
- `STARTS_WITH`: Message starts with the keyword
- `ENDS_WITH`: Message ends with the keyword

**Response:** Returns the created auto-reply object.

---

### `DELETE /api/autoreplies/[id]`

Delete an auto-reply rule.

**Authentication:** Required

**Parameters:**
- `id` (path): Auto-reply rule ID

**Response:**
```json
{
  "success": true
}
```

---

## ⏰ Scheduler

### `GET /api/scheduler`

Get all scheduled messages for a specific session.

**Authentication:** Required

**Query Parameters:**
- `sessionId` (required): Session ID

**Example:**
```
GET /api/scheduler?sessionId=my-session
```

**Response:**
```json
[
  {
    "id": "scheduled-msg-id",
    "sessionId": "db-session-id",
    "jid": "6281234567890@s.whatsapp.net",
    "content": "Scheduled message content",
    "mediaUrl": null,
    "sendAt": "2024-01-01T10:00:00.000Z",
    "status": "PENDING" | "SENT" | "FAILED",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### `POST /api/scheduler`

Schedule a message to be sent at a specific time.

**Authentication:** Required

**Request Body:**
```json
{
  "sessionId": "session-name",
  "jid": "6281234567890@s.whatsapp.net",
  "content": "This message will be sent later",
  "mediaUrl": "https://example.com/image.jpg",
  "sendAt": "2024-01-01T10:00:00"
}
```

> **Note:** The `sendAt` field should be in `YYYY-MM-DDTHH:mm` format (local time). It will be converted to UTC based on the system timezone setting.

**Response:** Returns the created scheduled message object.

---

### `DELETE /api/scheduler/[id]`

Delete a scheduled message (cancel scheduling).

**Authentication:** Required

**Parameters:**
- `id` (path): Scheduled message ID

**Response:**
```json
{
  "success": true
}
```

---

## 🔗 Webhooks

### `GET /api/webhooks`

Get all webhooks created by the authenticated user.

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "webhook-id",
    "userId": "user-id",
    "name": "My Webhook",
    "url": "https://example.com/webhook",
    "secret": "webhook-secret",
    "sessionId": "db-session-id",
    "events": ["message.received", "message.sent"],
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### `POST /api/webhooks`

Create a new webhook to receive events.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "My Webhook",
  "url": "https://example.com/webhook",
  "secret": "optional-secret-for-hmac",
  "sessionId": "session-name",
  "events": [
    "message.received",
    "message.sent",
    "qr.update",
    "connection.update"
  ]
}
```

**Available Events:**
- `message.received` - Incoming messages
- `message.sent` - Outgoing messages
- `qr.update` - QR code updates
- `connection.update` - Connection status changes
- `group.join` - Bot added to group
- `group.participants.update` - Group participant changes

**Response:** Returns the created webhook object.

---

### `PATCH /api/webhooks/[id]`

Update an existing webhook.

**Authentication:** Required

**Parameters:**
- `id` (path): Webhook ID

**Request Body:**
```json
{
  "name": "Updated Name",
  "url": "https://new-url.com/webhook",
  "secret": "new-secret",
  "events": ["message.received"],
  "isActive": false
}
```

**Response:** Returns the updated webhook object.

---

### `DELETE /api/webhooks/[id]`

Delete a webhook.

**Authentication:** Required

**Parameters:**
- `id` (path): Webhook ID

**Response:**
```json
{
  "success": true
}
```

---

## 🔔 Notifications

### `GET /api/notifications`

Get all notifications for the authenticated user (last 50).

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "notification-id",
    "userId": "user-id",
    "title": "New Message",
    "message": "You have received a new message",
    "type": "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SYSTEM",
    "href": "/dashboard/chat",
    "read": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### `POST /api/notifications`

Create and send notifications to users. Only SUPERADMIN can use this endpoint.

**Authentication:** Required (SUPERADMIN only)

**Request Body:**

1. **Send to specific user:**
```json
{
  "targetUserId": "user-id",
  "title": "Notification Title",
  "message": "Notification message",
  "type": "INFO",
  "href": "/some-link"
}
```

2. **Broadcast to all users:**
```json
{
  "broadcast": true,
  "title": "System Announcement",
  "message": "System maintenance scheduled",
  "type": "SYSTEM"
}
```

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

> **Note:** Notifications are also sent via Socket.IO for real-time updates.

---

### `PATCH /api/notifications/read`

Mark notifications as read.

**Authentication:** Required

**Request Body:**

1. **Mark specific notifications:**
```json
{
  "ids": ["notification-id-1", "notification-id-2"]
}
```

2. **Mark all as read:**
```json
{}
```

**Response:**
```json
{
  "success": true
}
```

---

### `DELETE /api/notifications/delete?id={notification-id}`

Delete a specific notification.

**Authentication:** Required

**Query Parameters:**
- `id` (required): Notification ID

**Example:**
```
DELETE /api/notifications/delete?id=notification-123
```

**Response:**
```json
{
  "success": true
}
```

---

## 👤 User Management

### `GET /api/users`

Get all users in the system. Only SUPERADMIN can access this endpoint.

**Authentication:** Required (SUPERADMIN only)

**Response:**
```json
[
  {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "OWNER" | "STAFF" | "SUPERADMIN",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "_count": {
      "sessions": 3
    }
  }
]
```

---

### `POST /api/users`

Create a new user. Only SUPERADMIN can access this endpoint.

**Authentication:** Required (SUPERADMIN only)

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123",
  "role": "OWNER"
}
```

**Roles:**
- `SUPERADMIN`: Full system access
- `OWNER`: Can manage own sessions and resources
- `STAFF`: Limited access to assigned sessions

**Response:**
```json
{
  "id": "user-id",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "OWNER",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### `PATCH /api/users/[id]`

Update an existing user. Only SUPERADMIN can access this endpoint.

**Authentication:** Required (SUPERADMIN only)

**Parameters:**
- `id` (path): User ID

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "password": "newpassword123",
  "role": "STAFF"
}
```

> **Note:** All fields are optional. Only include fields you want to update.

**Response:** Returns the updated user object.

---

### `DELETE /api/users/[id]`

Delete a user. Only SUPERADMIN can access this endpoint.

**Authentication:** Required (SUPERADMIN only)

**Parameters:**
- `id` (path): User ID

> **Note:** Users cannot delete themselves.

**Response:**
```json
{
  "success": true
}
```

---

## ⚙️ System Settings

### `GET /api/settings/system`

Get system-wide configuration settings.

**Authentication:** None (public, but returns default values if not authenticated)

**Response:**
```json
{
  "id": "default",
  "appName": "WA-AKG",
  "logoUrl": "https://example.com/logo.png",
  "timezone": "Asia/Jakarta"
}
```

---

### `POST /api/settings/system`

Update system-wide configuration. Only SUPERADMIN or OWNER can access this endpoint.

**Authentication:** Required (SUPERADMIN or OWNER only)

**Request Body:**
```json
{
  "appName": "My WhatsApp Gateway",
  "logoUrl": "https://example.com/new-logo.png",
  "timezone": "Asia/Tokyo"
}
```

**Response:** Returns the updated system configuration object.

---

### `POST /api/system/check-updates`

Check for new releases from GitHub and notify the user.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Notification sent",
  "version": "v1.2.0"
}
```

or

```json
{
  "success": true,
  "message": "Already up to date (notification exists)",
  "version": "v1.2.0"
}
```

> **Note:** This endpoint checks the GitHub repository for new releases and creates a notification if a new version is available.

---

## 📸 Status/Stories

### `POST /api/status/update`

Post a WhatsApp status (story) update.

**Authentication:** Required

**Request Body:**

1. **Text Status:**
```json
{
  "sessionId": "session-name",
  "content": "My status update",
  "type": "TEXT",
  "backgroundColor": 4278190080,
  "font": 0
}
```

2. **Image Status:**
```json
{
  "sessionId": "session-name",
  "content": "Caption for image",
  "type": "IMAGE",
  "mediaUrl": "https://example.com/image.jpg"
}
```

3. **Video Status:**
```json
{
  "sessionId": "session-name",
  "content": "Caption for video",
  "type": "VIDEO",
  "mediaUrl": "https://example.com/video.mp4"
}
```

**Response:**
```json
{
  "success": true
}
```

> **Note:** The status update is saved to the database and broadcast to WhatsApp.

---

## ❌ Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden - Cannot access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

or with detailed validation errors:
```json
{
  "error": {
    "fieldErrors": {
      "sessionId": ["Required"],
      "jid": ["Invalid format"]
    }
  }
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error"
}
```

### 503 Service Unavailable
```json
{
  "error": "Session not ready"
}
```

---

## 🔌 WebSocket Events

The application uses Socket.IO for real-time updates. Connect to the Socket.IO server to receive real-time events:

**Connection:**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-session-token'
  }
});
```

**Available Events:**

- `notification:new` - New notification received
  ```javascript
  socket.on('notification:new', (data) => {
    console.log('New notification:', data);
  });
  ```

- `session:qr` - QR code update
  ```javascript
  socket.on('session:qr', (data) => {
    console.log('QR Code:', data.qr);
  });
  ```

- `session:status` - Session status change
  ```javascript
  socket.on('session:status', (data) => {
    console.log('Status:', data.status);
  });
  ```

- `message:new` - New message received
  ```javascript
  socket.on('message:new', (data) => {
    console.log('New message:', data);
  });
  ```

---

## 💡 Best Practices

1. **Always validate input** before sending to the API
2. **Use webhooks** for real-time message handling instead of polling
3. **Implement retry logic** for failed API calls with exponential backoff
4. **Respect WhatsApp's limits** to avoid bans:
   - Don't send too many messages too quickly
   - Use appropriate delays in broadcast messages (10-20 seconds)
   - Avoid using the spam endpoint in production
5. **Secure your API keys** - Never expose them in client-side code or commit to version control
6. **Use sessions wisely** - Each session represents a WhatsApp connection
7. **Monitor session status** before sending messages
8. **Handle errors gracefully** - Implement proper error handling and logging
9. **URL-encode JIDs** when using them in URL paths
10. **Use appropriate HTTP methods** - GET for reading, POST for creating, PATCH for updating, DELETE for removing

---

## 🎯 Common Use Cases

### 1. Customer Support Automation
```javascript
// Set up auto-reply for common questions
await fetch('/api/autoreplies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey
  },
  body: JSON.stringify({
    sessionId: 'support',
    keyword: 'hours',
    response: 'Our business hours are 9 AM - 5 PM, Monday to Friday.',
    matchType: 'CONTAINS'
  })
});
```

### 2. Marketing Campaign
```javascript
// Broadcast promotional message
await fetch('/api/messages/broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey
  },
  body: JSON.stringify({
    sessionId: 'marketing',
    recipients: customerJids,
    message: 'Special offer: 50% off today only!',
    delay: 15000
  })
});
```

### 3. Appointment Reminders
```javascript
// Schedule appointment reminder
await fetch('/api/scheduler', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey
  },
  body: JSON.stringify({
    sessionId: 'clinic',
    jid: '6281234567890@s.whatsapp.net',
    content: 'Reminder: You have an appointment tomorrow at 2 PM',
    sendAt: '2024-01-15T09:00'
  })
});
```

---

## 📊 Rate Limiting

Currently, there are no strict rate limits enforced at the API level. However:

- WhatsApp has its own spam detection mechanisms
- Excessive messaging can result in temporary or permanent WhatsApp bans
- Recommended delays:
  - **Broadcast messages**: 10-20 seconds between messages
  - **Individual messages**: At least 1 second between messages
  - **API requests**: No specific limit, but use reasonable throttling

---

## 🔒 Security Considerations

1. **API Keys:**
   - Store API keys securely in environment variables
   - Never commit API keys to version control
   - Rotate keys periodically
   - Revoke compromised keys immediately

2. **Webhook Security:**
   - Use HTTPS endpoints for webhooks
   - Implement HMAC signature verification using the webhook secret
   - Validate webhook payloads before processing

3. **Input Validation:**
   - Always validate JID formats before sending
   - Sanitize user input to prevent injection attacks
   - Validate file types for media uploads

4. **Access Control:**
   - Respect role-based permissions
   - Implement proper session management
   - Use HTTPS in production

---

## 📖 Support & Resources

- **GitHub Repository**: [mrifqidaffaaditya/WA-AKG](https://github.com/mrifqidaffaaditya/WA-AKG)
- **Issues & Bug Reports**: [GitHub Issues](https://github.com/mrifqidaffaaditya/WA-AKG/issues)
- **Documentation**: Check `/docs` folder for more guides

---

## 📝 Changelog

**Version 1.0** (Current)
- Complete API reference for all 28 endpoints
- Authentication methods (Session & API Key)
- WebSocket support for real-time events
- Webhook system for event notifications
- Auto-reply and scheduler features
- Multi-user support with role-based access control

---

**API Version:** 1.0  
**Last Updated:** January 2024  
**Total Endpoints:** 28
