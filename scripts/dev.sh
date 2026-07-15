#!/usr/bin/env bash
# Bundled dev script: starts Postgres (if not running), runs pending
# migrations, then launches the Next.js dev server with HMR.
#
# Ctrl+C stops the dev server but leaves Postgres running so the next
# `npm run dev` is fast. Run `npm run dev:down` to stop Postgres when done.
#
# Requires Docker and a configured .env.local (see .env.example).

set -e

COMPOSE_FILE="docker-compose.dev.yml"
PG_CONTAINER="flashcards-db-1"

# ── 1. Start Postgres if it isn't already running ─────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  echo "▶ Starting Postgres via docker-compose.dev.yml…"
  docker compose -f "$COMPOSE_FILE" up -d --wait db
  echo "  Postgres ready."
else
  echo "✓ Postgres already running."
fi

# ── 2. Run pending migrations ─────────────────────────────────────────────────
echo "▶ Applying pending migrations…"
npm run --silent db:migrate

# ── 3. Start the Next.js dev server (HMR) ──────────────────────────────────────
echo "▶ Starting Next.js dev server…"
echo "  http://localhost:3000  (Ctrl+C to stop the server; Postgres keeps running)"
echo
exec npm run dev:next