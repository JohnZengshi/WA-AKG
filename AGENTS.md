# WA-AKG — Agent Guide

## Overview

WA-AKG is a WhatsApp Gateway, Dashboard, and Automation System built with Next.js 15, React, TypeScript, and Baileys. It provides REST API + Socket.IO for multi-session WhatsApp management.

## Architecture

```
src/
├── app/api/          # Next.js App Router API routes (109+ endpoints)
│   ├── auth/         # Authentication (NextAuth, register)
│   ├── autoreplies/  # Auto-reply rules
│   ├── chat/         # Send messages, manage chats
│   ├── contacts/     # Contact management
│   ├── groups/       # Group management
│   ├── labels/       # Chat labels
│   ├── media/        # Media upload/download
│   ├── messages/     # Messages (send, react, forward, broadcast, etc.)
│   ├── notifications/
│   ├── profile/      # WhatsApp profile
│   ├── scheduler/    # Scheduled messages
│   ├── sessions/     # WhatsApp session management (connect QR, settings, bot-config)
│   ├── settings/     # System settings
│   ├── status/       # WhatsApp status/story
│   ├── system/       # Monitor, check-updates
│   ├── users/        # User management
│   └── webhooks/     # Webhook registration
├── app/dashboard/    # Dashboard pages (Next.js App Router)
├── app/auth/         # Auth pages (login, register)
├── components/       # React components (shadcn/ui based)
│   ├── chat/         # Chat interface components
│   ├── dashboard/    # Sidebar, navbar, session selector
│   └── ui/           # shadcn/ui primitives
├── lib/              # Shared utilities (auth, prisma, logger, webhook, cron)
├── modules/whatsapp/ # WhatsApp engine (Baileys integration)
│   ├── instance.ts   # Socket connection lifecycle
│   ├── manager.ts    # Multi-session manager
│   ├── chat.service.ts
│   ├── antispam.ts
│   ├── scheduler.ts
│   ├── bot/          # Auto-reply command handler
│   ├── auth/         # Prisma-based auth state
│   └── store/        # In-memory stores (contacts, groups, autoreply)
├── server/           # Custom HTTP server (Socket.IO, WebSocket)
└── types/            # TypeScript type declarations
```

## Key Patterns

### API Routes
- Next.js App Router with route handlers (`route.ts`)
- Consistent parameter patterns: `[sessionId]`, `[jid]`, `[messageId]`
- Auth middleware via `src/lib/api-auth.ts`
- API key auth with optional Bearer token fallback

### WhatsApp Sessions
- Manager pattern: `WhatsAppManager` manages `WhatsAppInstance` per session
- Session state stored in Prisma (MySQL)
- QR auth flow via `/api/sessions/[sessionId]/qr`
- Bot config per session (`bot-config` route)

### Data Layer
- Prisma ORM with MySQL
- Webhook event system via `src/lib/webhook.ts`
- Cron jobs for scheduled messages via `src/lib/cron.ts`

### UI
- shadcn/ui component library (Radix UI primitives)
- Tailwind CSS for styling
- Server actions in `src/app/dashboard/*/actions.ts`

## Development Scripts

| Script | Purpose |
|---|---|
| `npm run dev:env` | Start MySQL container, install deps, push schema, create admin (run once) |
| `npm run dev:app` | Clear .next cache and start dev server (restartable) |
| `npm run dev:stop` | Stop and remove MySQL container |
| `npm run dev` | Direct dev server (no env setup) |
| `npm run build` | Production build |
| `npm start` | Production server start |
| `npm run make-admin <email> <password>` | Create admin user |
| `npm run db:push` | Push Prisma schema |
| `node start.mjs` | Backward-compatible: env + app in one command |

### Dev Script Files
- `scripts/dev-common.mjs` — Shared utilities (log, run, parseEnv)
- `scripts/dev-env.mjs` — Environment setup (MySQL, deps, .env, prisma, admin)
- `scripts/dev-app.mjs` — App startup (clear .next, start dev server)
- `scripts/dev-stop.mjs` — Stop environment (MySQL container)

### Flags (start.mjs)
- `--env-only` — Run environment setup only
- `--app-only` — Run app only
- `--stop` — Stop environment

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI**: shadcn/ui (Radix UI)
- **Database**: MySQL + Prisma ORM
- **WhatsApp Engine**: `@whiskeysockets/baileys`
- **Auth**: NextAuth.js + bcrypt
- **Real-time**: Socket.IO
- **Dev**: Turbopack, tsx

## Port Conventions

| Service | Port | Config |
|---|---|---|
| Dev App | 3001 | `PORT` in `.env` |
| Prod/Manual Dev | 3000 | `PORT` in `.env` |
| Dev MySQL | 3307 | `DATABASE_URL` in `.env` |
| Docker MySQL | 3306 | docker-compose.yml |

## CodeGraph

This project has a CodeGraph index in `.codegraph/`. Use `codegraph_*` tools for structural queries instead of grep.
