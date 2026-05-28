# 🗄️ Database Setup Guide

This guide will help you set up the database for **WA-AKG**. The project uses **Prisma ORM**, which supports PostgreSQL, MySQL, SQLite, and MongoDB.

## 1. Prerequisites

Ensure you have a database server running.
-   **Docker Stack (Recommended)**: You can use the included Docker Compose configuration to automatically spin up a MySQL database alongside the Next.js gateway application.
-   **Local Development (Bare-metal)**: You can run MySQL or PostgreSQL locally on your machine.
-   **Production**: Use a managed database service (e.g., Supabase, Neon, AWS RDS).

## 2. Docker Compose Stack Setup (Zero Configuration)

The project includes two Docker Compose configurations:

### 2a. MySQL Stack (Bundled Database) — `docker-compose.yml`

Defines a MySQL 8.0 container (`wa-akg-db`) alongside the Next.js gateway container (`wa-akg-app`) — everything runs locally with zero external dependencies.

1. **Start Stack**:
   ```bash
   docker compose up -d
   ```
2. **Automated Setup**:
   On startup, the container automatically:
   - Sets up the MySQL database.
   - Pushes the database schema and creates all tables (`npx prisma db push`).
   - Provisions a default SuperAdmin account with the credentials:
     - **Email**: `admin@example.com`
     - **Password**: `admin123`

3. **Custom Configuration (Optional)**:
   If you wish to change defaults (like database connection details, admin login, timezone, or secrets), you can edit the environment values directly in `web/docker-compose.yml`, or copy `web/.env.example` to `web/.env` and edit it before running docker compose.

### 2b. PostgreSQL Stack (External Database) — `docker-compose-prod.yml`

For production deployments where you already have a PostgreSQL instance (managed RDS, Supabase, Neon, etc.), use the production Compose file. It **does not include a database container** — only the app.

1. **Start Stack**:
   ```bash
   docker compose -f docker-compose-prod.yml up -d
   ```

2. **Prerequisite**: Ensure your PostgreSQL server is running and reachable. Update `DATABASE_URL` in `docker-compose-prod.yml` to point to your instance:
   ```yaml
   - DATABASE_URL=postgresql://user:pass@your-db-host:5432/wa_gateway_db?schema=public
   ```

3. **Automated Setup**: On startup, the container automatically:
   - Pushes the database schema and creates all tables (`npx prisma db push`).
   - Provisions a default SuperAdmin account.

4. **Custom Configuration**: Edit `docker-compose-prod.yml` to set your production values for `AUTH_SECRET`, `BASE_URL`, Swagger credentials, etc.

---

## 3. Configuration (Bare-metal)

Edit your `.env` file and set the `DATABASE_URL`.

### MySQL
```env
DATABASE_URL="mysql://user:pass@db-host:3306/wa_akg"
```

### PostgreSQL
```env
DATABASE_URL="postgresql://user:pass@db-host:5432/wa_akg?schema=public"
```

## 3. Initialization Commands

We have prepared easy-to-use commands in `package.json`.

### Sync Schema
Push the Prisma schema to your database. This creates all necessary tables.

```bash
npm run db:push
```

### Reset Database (Caution!)
If you need to wipe the database and start fresh:

```bash
npx prisma migrate reset
```

## 4. Switching Database Provider
By default, the project might be configured for **MySQL** or **PostgreSQL**. To switch providers (e.g., from MySQL to PostgreSQL):

1.  **Open `prisma/schema.prisma`**:
2.  **Locate the `datasource` block**:
    ```prisma
    datasource db {
      provider = "mysql" // Change this to "postgresql"
      url      = env("DATABASE_URL")
    }
    ```
3.  **Update `.env`**: Change your `DATABASE_URL` format to match the new provider (see [Configuration](#2-configuration)).
4.  **Remove Migrations** (Optional but Recommended): Delete the `prisma/migrations` folder to avoid conflicts.
5.  **Push changes**:
    ```bash
    npm run db:push
    ```

## 5. Creating an Admin User

After setting up the database, you need a **SUPERADMIN** user to access the dashboard settings.
We included a script to help you create one quickly.

### Syntax
```bash
npm run make-admin <email> <password>
```

### Example
```bash
npm run make-admin admin@example.com password123
```

-   If the user **does not exist**, it will be created with `SUPERADMIN` role.
-   If the user **already exists**, it will be promoted to `SUPERADMIN` (password ignored).

## 6. Troubleshooting

-   **Connection Error**: Check if your database server is running and the credentials in `.env` are correct.
-   **Prisma Client Error**: If you change the schema, always run `npm run db:push` or `npx prisma generate` to update the client.
