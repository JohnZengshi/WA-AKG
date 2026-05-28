<div align="center">

# 🚀 WA-AKG: The Ultimate WhatsApp Gateway & Dashboard

[![WhatsApp Bot](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Version](https://img.shields.io/badge/Version-1.3.0-blue?style=for-the-badge)](https://github.com/mrifqidaffaaditya/WA-AKG/releases)
[![Beta Branch](https://img.shields.io/badge/Branch-Master-green?style=for-the-badge&logo=git)](https://github.com/mrifqidaffaaditya/WA-AKG)

**A professional, multi-session WhatsApp Gateway, Dashboard, and Automation System.**  
Built with **Next.js 15**, **React**, and **Baileys** for high-performance messaging automation and real-time WhatsApp Bot Gateway services.

> [!TIP]
> **Looking for the latest features?** Check out the [beta branch](https://github.com/mrifqidaffaaditya/WA-AKG/tree/beta) or our [pre-releases](https://github.com/mrifqidaffaaditya/WA-AKG/releases) for experimental sources.

[Features](#-key-features) • [User Guide](docs/USER_GUIDE.md) • [API Documentation](docs/API_DOCUMENTATION.md) • [Database Setup](docs/DATABASE_SETUP.md) • [Installation](#-quick-installation)

</div>

---

## 📖 Complete Documentation

WA-AKG comes with extensive documentation designed for both developers and users.

- **[Master Project Documentation](docs/PROJECT_DOCUMENTATION.md)**: Architecture, database, and logic flow.
- **[API Documentation](docs/API_DOCUMENTATION.md)**: Comprehensive OpenAPI / Swagger guide for all **109+ endpoints**.
- **[API Quick Reference](docs/API-QUICK-REFERENCE.md)**: Instantly jumpstart your integration with ready-to-use cURL/JavaScript snippets.
- **[Environment Variables](docs/ENVIRONMENT_VARIABLES.md)**: Configuration and security guide.

---

## 🌟 Why WA-AKG WhatsApp API Gateway?

WA-AKG transforms your WhatsApp into a fully programmable RESTful API. It's designed for scale, reliability, and ease of use, making it the perfect bridge between your business logic and WhatsApp's global reach. Excellent for developing a **WhatsApp Bot**, Automation, or Customer Service Gateway.

### 🏗️ How it Works

```mermaid
graph LR
    User([User / App]) -->|REST API| API[WA-AKG Gateway]
    API -->|Baileys| WhatsApp[[WhatsApp Server]]
    API -->|Real-time| DB[(Prisma / DB)]
    WhatsApp -.->|Webhook| API
    API -.->|Event| Webhook([External CRM / API])
```

### 🔥 Key Features

- **📱 Multi-Session Management**: Connect and manage unlimited WhatsApp accounts simultaneously via simple QR code scans.
- **⚡ Pro WhatsApp Engine**: Powered by `@whiskeysockets/baileys` for high-speed, stable, and secure WebSocket connections.
- **📅 Advanced Scheduler**: Precise message planning with **Media Support** (Images, Video, Docs).
- **📢 Safe Broadcast**: Built-in anti-ban mechanisms with randomized delays (10-30s) and batch processing.
- **🤖 Smart Auto-Reply**: Keywords matching with **Context Support** (Group/Private/All) and **Media Attachments**.
- **🛡️ Granular Access Control**: Full **Whitelist** & **Blacklist** support for both Bot Commands and Auto Replies.
- **🔗 Enterprise Webhooks**: Robust real-time event forwarding for messages, connections, status changes, and group updates.
- **📇 Advanced Contacts**: Rich contact management with LID, verified names, and profile pictures.
- **🎨 Creative Tools**: Built-in Sticker Maker with background removal (`remove.bg` integration).
- **📘 Open API Spec**: Fully documented via `swagger-ui-react` at `/docs`.

<details>
<summary>📂 <b>View Webhook Payload Example</b></summary>

```json
{
  "event": "message.received",
  "sessionId": "xgj7d9",
  "timestamp": "2026-01-17T05:33:08.545Z",
  "data": {
    "key": { "remoteJid": "6287748687946@s.whatsapp.net", "fromMe": false, "id": "3EB0B78..." },
    "from": "6287748687946@s.whatsapp.net",
    "sender": "100429287395370@lid",
    "remoteJidAlt": "100429287395370@lid",
    "type": "TEXT",
    "content": "saya sedang reply",
    "isGroup": false,
    "quoted": {
      "type": "IMAGE",
      "caption": "Ini caption dari reply",
      "fileUrl": "/media/xgj7d9-A54FD0B6F..."
    }
  }
}
```
</details>

---

## 🧩 Integrations: Native n8n Support

WA-AKG natively supports **n8n**! You can build complex, no-code/low-code WhatsApp automation workflows using our official community nodes.

[![n8n nodes](https://img.shields.io/badge/n8n-nodes--wa--akg-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)](https://www.npmjs.com/package/n8n-nodes-wa-akg)

- **Action Node**: Full control over messaging, groups, sessions, contacts, and labels directly from your n8n workflows.
- **Trigger Node**: Instantly catch real-time webhooks (Message Received, Group Joined, etc.) and trigger your workflows automatically.

👉 **[View on npm (n8n-nodes-wa-akg)](https://www.npmjs.com/package/n8n-nodes-wa-akg)**

---

## 🚀 Quick Installation

### 1. Prerequisites
- Node.js 20+
- PostgreSQL or MySQL
- Git
- Docker & Docker Compose (Optional, for Docker deployment)

### 2. Setup (Standard Setup)
```bash
# Clone and install
git clone https://github.com/mrifqidaffaaditya/WA-AKG.git
cd WA-AKG
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL etc.

# Push schema and create admin
npm run db:push
npm run make-admin admin@example.com password123
```

---

## 🚀 Detailed Startup Guide

### 🔹 Development Environment

#### Option A: One-Click Startup (Recommended for Dev)

The project includes cross-platform startup scripts. The process is split into **two phases** so you can restart the dev server without re-running environment setup.

#### Phase 1 — Environment (run once per dev session)

Sets up MySQL container, installs dependencies, configures `.env`, pushes Prisma schema, and creates admin:

```bash
npm run dev:env
```

#### Phase 2 — App (restart as many times as needed)

Clears stale `.next` cache and starts the dev server:

```bash
npm run dev:app
```

#### Stop environment

Stops and removes the MySQL container:

```bash
npm run dev:stop
```

#### One-Click Startup (Backward Compatible)

The original `node start.mjs` runs both phases in sequence:

```bash
node start.mjs
```

**What the env phase does:**
1. Check prerequisites (Node.js, Docker)
2. Start a MySQL 8.0 container (`wa-akg-db-dev`) on port `3307`
3. Auto-start Colima if installed (macOS)
4. Install dependencies (`npm install --legacy-peer-deps`)
5. Auto-configure `.env` with correct `DATABASE_URL`, `PORT` (default `3001`), and `BASE_URL`
6. Push Prisma schema and auto-create default admin if database is empty

**What the app phase does:**
1. Clear stale `.next` cache
2. Start the dev server

```
Access:
  App:     http://localhost:3001
  Swagger: http://localhost:3001/docs
  MySQL:   localhost:3307 / root / rootpassword / wa_akg
```

> [!NOTE]
> The scripts use **port 3307** for MySQL and **port 3001** for the app by default to avoid conflicts with existing services. Press `Ctrl+C` to stop both the app and MySQL container.

#### Option B: Manual Development Startup

```bash
# 1. Clone and install
git clone https://github.com/mrifqidaffaaditya/WA-AKG.git
cd WA-AKG
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set:
#   DATABASE_URL (PostgreSQL or MySQL)
#   AUTH_SECRET (generate with: openssl rand -base64 32)
#   BASE_URL (e.g. http://localhost:3000)

# 3. Start your own MySQL/PostgreSQL, then push schema
npm run db:push

# 4. Create admin user
npm run make-admin admin@example.com password123

# 5. Start development server
npm run dev

# App will be available at http://localhost:3000
```

### 🔹 Production Environment

```bash
# Build Next.js frontend
npm run build

# Start production server
NODE_ENV=production npm start
# or: npm start (the script sets NODE_ENV automatically)

# Default port: 3000
# Override with: PORT=8080 npm start
```

> [!IMPORTANT]
> The production server runs via `npx tsx src/server/index.ts` (not `next start`), because WA-AKG requires a **custom HTTP server** for Socket.IO, WebSocket (Baileys), and WhatsApp session management.

### 🐋 Docker Production Deployment

The project includes a complete Docker Compose setup for production deployment with MySQL:

```bash
# Start all services (app + MySQL 8.0)
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**What happens automatically:**
- Next.js is built inside the Docker image (multi-stage build)
- MySQL 8.0 is pulled and initialized
- Prisma schema is pushed on container start
- Default SuperAdmin is auto-created from environment variables:
  - **Email**: `admin@admin.com`
  - **Password**: `admin123`
- WhatsApp session data is persisted in `./data/app`
- Media uploads are persisted in `./data/uploads`

**Customization** (edit `docker-compose.yml`):

| Variable | Description | Default |
|---|---|---|
| `ADMIN_EMAIL` | Auto-created admin email | `admin@admin.com` |
| `ADMIN_PASSWORD` | Auto-created admin password | `admin123` |
| `AUTH_SECRET` | NextAuth secret (change for production!) | auto-generated |
| `BASE_URL` | Public-facing URL | `http://localhost:3000` |
| `NEXT_PUBLIC_SWAGGER_USERNAME` | Swagger UI login | `admin` |
| `NEXT_PUBLIC_SWAGGER_PASSWORD` | Swagger UI password | `admin123` |
| `TZ` | Timezone | `Asia/Jakarta` |

---

### 🐋 Docker Production Deployment (PostgreSQL / External DB)

If you already have a PostgreSQL instance (managed or self-hosted) and prefer not to bundle a database container, use the production Compose file:

```bash
# Start the app only (assumes PostgreSQL is already running)
docker compose -f docker-compose-prod.yml up -d
```

This variant **does not include a database container** — it connects to an external PostgreSQL instance via `DATABASE_URL`. The app container still:

- Builds Next.js inside the Docker image (multi-stage build)
- Persists WhatsApp session data in `./data/app`
- Persists media uploads in `./data/uploads`
- Auto-creates a SuperAdmin on first startup

**Customization** (edit `docker-compose-prod.yml`):

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=public` |
| `BASE_URL` / `NEXTAUTH_URL` | Public-facing URL | `https://your-domain.com` |
| `AUTH_SECRET` | NextAuth secret | `openssl rand -base64 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Initial SuperAdmin | `admin@admin.com` / `admin123` |
| `TZ` | Timezone | `Asia/Shanghai` |
| `PORT` | App port inside container | `3333` |

---

## 🔧 Common Errors & Troubleshooting

### Startup Failures

| Error | Cause | Fix |
|---|---|---|
| `Port 3306 already in use` | Local MySQL or another service running | Use `npm run dev:env` (uses port 3307), or stop existing MySQL, or change `DATABASE_URL` port |
| `Can't connect to MySQL server` | MySQL not started or wrong credentials | Run `docker compose up -d db` or check `DATABASE_URL` in `.env` |
| `MySQL connection refused` | Container still initializing | Wait 10-15s; run `docker logs wa-akg-db-dev` to check |
| `prisma db push failed` | Wrong DATABASE_URL or MySQL not ready | Verify MySQL is running: `mysql -h 127.0.0.1 -P 3307 -u root -prootpassword -e "SELECT 1"` |
| `Module not found: xxx` | Missing dependencies | Run `npm install --legacy-peer-deps` |

### Docker Issues

| Error | Cause | Fix |
|---|---|---|
| `Cannot connect to the Docker daemon` | Docker Desktop not running | Start Docker Desktop (or `colima start` on macOS) |
| `Unable to lock ... ibdata1` | macOS Spotlight/Cloud syncing locks MySQL data dir | Run `npm run dev:env` — it auto-detects and retries; or manually: `docker rm -f wa-akg-db-dev && rm -rf data/mysql-dev && docker run ...` |
| `Image pull failed` | Docker registry unreachable (China firewall) | Configure mirror: Docker Desktop → Settings → Docker Engine → add `"registry-mirrors": ["https://docker.m.daocloud.io"]` |
| `EPERM: operation not permitted` on `.dll.node` | Windows Defender / antivirus scanning | Run `npm run build` again; the existing engine binary is still valid |
| `docker compose up -d` fails to build | No `web/` directory (README outdated) | Run from **project root**, not `web/`: `docker compose up -d` |

### Runtime Errors

| Error | Cause | Fix |
|---|---|---|
| `AUTH_SECRET is not set` | Missing NextAuth secret in `.env` | Set `AUTH_SECRET` (run `openssl rand -base64 32`) |
| `NEXTAUTH_URL is not set` | Missing callback URL | Set `NEXTAUTH_URL` in `.env` (e.g. `http://localhost:3000`) |
| `Socket.IO connection failed` | Wrong Socket.IO path | Default: `/api/socket/io` — ensure client matches server config |
| `WhatsApp session not connecting` | QR code expired or network issue | Re-scan QR from dashboard; check Baileys logs (`BAILEYS_LOG_LEVEL=debug`) |
| `413 Payload Too Large` | Upload exceeds `MAX_UPLOAD_SIZE_MB` | Increase in `.env` or configure reverse proxy limits |
| `500 internal server error` | Server-side exception | Check terminal logs for stack trace; enable `BAILEYS_LOG_LEVEL=debug` for more detail |
| `Cloudflare 520` errors | Idle connection timeout | Already fixed in code: `keepAliveTimeout = 120s` |

### Database Reset

```bash
# Reset development database (data will be lost)
docker rm -f wa-akg-db-dev
rm -rf data/mysql-dev
npm run dev:env   # recreates everything

# Reset production database
docker compose down -v
docker compose up -d
```

---

## ⚙️ Environment Configuration

### Environment: Development vs Production

| Setting | Development | Production |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `npm run dev:app` / `node start.mjs --app-only` | Hot-reload via `tsx` | ❌ Not used |
| `npm run build && npm start` | ❌ Not needed | ✅ Production server |
| Hot Module Replacement | ✅ Yes (Turbopack) | ❌ No |
| `.next/` cache | Cleared on `npm run dev:app` startup | Built once via `next build` |
| Error stack traces | Full detail in terminal | Minimal |
| Baileys logs | Set `BAILEYS_LOG_LEVEL=debug` | Set `BAILEYS_LOG_LEVEL=error` |
| Swagger UI | Always enabled | Set `NEXT_PUBLIC_SWAGGER_ENABLED=true` |
| Auto admin creation | Via `npm run dev:env` or `npm run make-admin` | Via Docker env vars `ADMIN_EMAIL`/`ADMIN_PASSWORD` |

### Port Overview

| Service | Default Port | Configurable Via |
|---|---|---|
| App (Dev - `npm run dev:app`) | `3001` | `PORT` in `.env` |
| App (Manual Dev/Prod) | `3000` | `PORT` in `.env` |
| MySQL (Dev - `npm run dev:env`) | `3307` | `DATABASE_URL` in `.env` |
| MySQL (Docker Compose) | `3306` | `docker-compose.yml` ports mapping |

### Performance Tuning

- **Upload Size**: Set `MAX_UPLOAD_SIZE_MB` (default: 50 MB)
- **Rate Limiting**: Enabled by default (`ENABLE_RATE_LIMITING=true`, limit: `RATE_LIMIT_PER_MINUTE=60`)
- **Session Timeout**: Configure `SESSION_TIMEOUT_HOURS` (default: 24h)
- **Broadcast Delays**: Built-in 10-30s randomized delays to prevent bans

---

## 📚 API Reference Overview

WA-AKG provides a comprehensive REST API to integrate WhatsApp Messaging directly into your applications. Full details in [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

> [!TIP]
> Use the built-in **Swagger UI** for interactive exploration at `/docs`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/messages/{sessionId}/{jid}/send` | Send text, media, or stickers |
| `POST` | `/api/messages/{sessionId}/broadcast` | Scalable bulk messaging |
| `PATCH` | `/api/sessions/{id}/settings` | Update session configuration |
| `GET` | `/api/groups/{sessionId}` | List all available groups |
| `POST` | `/api/webhooks/{sessionId}` | Register real-time event listeners |
| `POST` | `/api/autoreplies/{sessionId}` | Create context-aware auto-replies |
| `POST` | `/api/auth/register` | Register new users via the web securely |

### Example: Send Text Message
```bash
curl -X POST http://localhost:3000/api/messages/session_01/62812345678@s.whatsapp.net/send \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": { "text": "Hello from WA-AKG!" }
  }'
```

---

## ⚠️ Known Issues / Caveats

> [!WARNING]
> **Status Update Feature (POST `/api/status/update`)**
> 
> The WhatsApp status/story update feature is currently **experiencing known issues** and should be avoided in production:
> - Text statuses with custom background colors may not display correctly
> - Media statuses (images/videos) may fail to upload to WhatsApp servers
> - The feature is under active development
> 
> We recommend waiting for the next release before using this endpoint in critical workflows.

---

## 🛡️ Security
- **API Key Auth**: Secured endpoints using `X-API-Key`.
- **RBAC**: Multi-role support (`SUPERADMIN`, `OWNER`, `STAFF`).
- **Encrypted Storage**: Sensitive credentials are secure with bcrypt and NextAuth.js.

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/mrifqidaffaaditya">Aditya</a>  
  Licensed under <a href="LICENSE">MIT</a>
</div>
