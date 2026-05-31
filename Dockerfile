FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install build-time system dependencies
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY patches ./patches/
COPY prisma ./prisma/
RUN --mount=type=cache,target=/root/.npm \
    npm config set registry https://registry.npmmirror.com && \
    npm ci --no-audit --no-fund --prefer-offline

# Copy the rest of the application files
COPY . .

# Generate Prisma client and build Next.js application
RUN --mount=type=cache,target=/root/.npm \
    npx prisma generate
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Production image
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Install runtime system dependencies (OpenSSL for Prisma)
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy production files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && (if [ -n \"$ADMIN_EMAIL\" ] && [ -n \"$ADMIN_PASSWORD\" ]; then node scripts/setup-admin.js \"$ADMIN_EMAIL\" \"$ADMIN_PASSWORD\"; fi) && npx tsx src/server/index.ts"]
