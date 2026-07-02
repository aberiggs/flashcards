# syntax=docker/dockerfile:1

# ── Build stage ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests and install deps (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the source and build
COPY . .
# Build-time env vars — provide dummy values so the build doesn't crash on
# env validation. Real values are supplied at runtime.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build \
    AUTH_SECRET=build-time-placeholder \
    NEXTAUTH_URL=http://localhost:3000
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Don't run next as root
ENV NEXT_SHARP_PATH=/usr/local/lib/node_modules/sharp

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy drizzle migrations so the entrypoint can run them
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Install just drizzle-kit to run migrations at startup
RUN npm install --omit=dev drizzle-kit postgres --no-audit --no-fund

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run migrations then start the server
CMD npx drizzle-kit migrate && node server.js