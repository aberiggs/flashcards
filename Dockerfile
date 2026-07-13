# ── Build stage ─────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

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
FROM node:24-alpine AS runner

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

# Copy drizzle migrations + config + schema so the entrypoint can run migrations
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/db/schema.ts ./src/db/schema.ts

# Install drizzle-kit (to run migrations at startup), postgres (driver), and
# dotenv (used by drizzle.config.ts) into /app/migrate — a separate node_modules
# tree. The standalone build's /app/node_modules is a curated minimal tree;
# running `npm install` there would prune it, so install elsewhere and point
# NODE_PATH at it for drizzle.config.ts's require() resolution.
RUN mkdir -p /app/migrate
WORKDIR /app/migrate
RUN npm init -y >/dev/null && \
    npm install drizzle-kit drizzle-orm postgres dotenv --no-audit --no-fund

# Entrypoint script: run migrations, then exec the server
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

WORKDIR /app
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["./migrate/docker-entrypoint.sh"]