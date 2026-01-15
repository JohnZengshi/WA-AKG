<div align="center">

# 🚀 WA-AKG: The Ultimate WhatsApp Gateway & Dashboard

![WhatsApp Bot](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Baileys](https://img.shields.io/badge/Powered%20By-Baileys-orange?style=for-the-badge)

**A powerful, self-hosted WhatsApp Gateway, Dashboard, and Bot Management System.**  
Built for developers and businesses to manage multi-session WhatsApp accounts, schedule messages, create auto-replies, and integrate with external apps via Webhooks.

[Features](#-features) • [User Guide](docs/USER_GUIDE.md) • [API Documentation](docs/API_DOCUMENTATION.md) • [Database Setup](docs/DATABASE_SETUP.md) • [Update Guide](docs/UPDATE_GUIDE.md) • [Installation](#-installation)


</div>

---

## 🌟 Why WA-AKG?

Turn your WhatsApp into a programmable API. Whether you need a simple **WhatsApp Bot**, a **Marketing Broadcast Tool**, or a robust **WhatsApp Webhook** integration for your CRM, WA-AKG handles it all with a modern, responsive dashboard.

### 🔥 Key Features
- **📱 Multi-Session Management**: Connect unlimited WhatsApp accounts via QR Code scanning.
- **⚡ Real-time Messaging & Chat**: Send texts and media (images with attachments) directly from a responsive dashboard.
- **📅 Smart Scheduler**: Plan messages with precision using your local or global timezone.
- **📢 Broadcast / Blast**: Safe bulk messaging with random delays (10-30s) to minimize ban risks.
- **🤖 Advanced Auto-Reply**: Create smart bots with `EXACT`, `CONTAINS`, or `STARTS_WITH` keyword matching.
- **🔗 Powerful Webhooks**: Real-time event forwarding (`message.received`, `message.sent`) to your external APIs.
- **👥 Group Management**: Fetch groups, manage participants, and send announcements effortlessly.
- **🎨 Sticker Maker**: Convert images to stickers securely; supports removing backgrounds via API.
- **🔒 Role-Based Access**: Granular control with `Owner` (Superadmin) and `User` roles.
- **🌐 RESTful API**: Comprehensive endpoints for programmatic control.

---

## 🛠️ Tech Stack

-   **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
-   **Language**: TypeScript
-   **Database**: PostgreSQL / MySQL (via Prisma ORM)
-   **Core**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
-   **UI Library**: [Shadcn UI](https://ui.shadcn.com/) + Tailwind CSS
-   **Auth**: NextAuth.js v5

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/mrifqidaffaaditya/WA-AKG.git
cd WA-AKG
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Update `.env` with your Database URL and Auth Secret:
   ```env
   # PostgreSQL (Recommended) or MySQL
   DATABASE_URL="postgresql://user:pass@localhost:5432/wa_gateway_db?schema=public"
   AUTH_SECRET="generate-a-strong-secret-here"
   ```

### 4. Setup Database
Sync the Prisma schema with your database (creates tables automatically):

```bash
npm run db:push
```

> **Tip**: For a fresh start or to wipe data, use `npx prisma migrate reset`. See [Database Setup](docs/DATABASE_SETUP.md) for details.
>
> **Switching Database?**
> Need to switch from MySQL to PostgreSQL (or vice versa)? Check out the [Switching Provider Guide](docs/DATABASE_SETUP.md#4-switching-database-provider) in the documentation.

### 5. Create Admin User
```bash
# syntax: npm run make-admin <email> <password>
npm run make-admin admin@example.com password123
```

### 5. Start the Application
```bash
# Development Mode
npm run dev

# Production Build
npm run build
npm start
```
Access the dashboard at: `http://localhost:3000/dashboard`

---

## 📚 API Reference

Interact with your WhatsApp sessions programmatically.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **Sessions** | | |
| `GET` | `/api/sessions` | List all sessions |
| `POST` | `/api/sessions` | Create a new session |
| `DELETE` | `/api/sessions/[id]` | Delete a session |
| `GET` | `/api/sessions/[id]/bot-config` | Get bot configuration |
| `POST` | `/api/sessions/[id]/bot-config` | Update bot configuration |
| **Chat** | | |
| `GET` | `/api/chat/[sessionId]` | List contacts |
| `GET` | `/api/chat/[sessionId]/[jid]` | Get chat history |
| `POST` | `/api/chat/send` | Send text/media |
| **Msg & Groups** | | |
| `POST` | `/api/groups/create` | Create a group |
| `POST` | `/api/messages/broadcast` | Send broadcast message |
| `POST` | `/api/messages/sticker` | Send sticker (FormData) |
| **Tools** | | |
| `GET` | `/api/webhooks` | List webhooks |
| `POST` | `/api/webhooks` | Create webhook |
| `GET` | `/api/autoreplies` | List auto-replies |
| `POST` | `/api/autoreplies` | Create auto-reply |

### Example: Send Message
```bash
curl -X POST http://localhost:3000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_1",
    "jid": "62812345678@s.whatsapp.net",
    "message": {
      "text": "Hello from WA-AKG API!"
    }
  }'
```

### Example: Create Auto-Reply
```bash
curl -X POST http://localhost:3000/api/autoreplies \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_1",
    "keyword": "price",
    "response": "Our price starts at $10",
    "matchType": "CONTAINS"
  }'
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <small>Built with ❤️ by <a href="https://github.com/mrifqidaffaaditya">Aditya</a></small>
</div>
