# Flashcards

A no-nonsense, self-hostable study app with SM-2 spaced repetition. Create
decks, study cards on a keyboard-first review flow, and let the scheduler
bring cards back when you're about to forget them.

Designed for homelabbers: runs as a single Docker Compose stack (Next.js +
Postgres) with email/password auth — no OAuth provider accounts, no cloud
dependencies.

## Quick start (Docker on a homelab)

Pre-built images are published to `ghcr.io/aberiggs/flashcards` on every push
to `main`, so on your server you only need Docker — no source checkout, no
build step.

1. Grab the `docker-compose.yml` from this repo and put it in a directory on
   your server (e.g. `~/flashcards/`).
2. Generate an auth secret and create an `.env` next to it:

   ```bash
   openssl rand -base64 32   # paste the output as AUTH_SECRET below
   cat > .env <<'EOF'
   AUTH_SECRET=paste-the-output-of-openssl-rand-above
   NEXTAUTH_URL=http://flashcards.lan:3000   # public URL of the app

   # Optional overrides:
   # WEB_PORT=8080                           # host port (default 3000)
   # POSTGRES_DATA_PATH=/mnt/raid/flashcards/pgdata
   # POSTGRES_USER=postgres
   # POSTGRES_PASSWORD=postgres
   # POSTGRES_DB=flashcards
   EOF
   ```

3. Start it:

   ```bash
   docker compose up -d
   ```

Visit `NEXTAUTH_URL` (default http://localhost:3000). Since no users exist
yet, you'll see a registration form — create the first account and you're in.
Registration closes automatically after that.

Updates: `docker compose pull && docker compose up -d`.

## Quick start (local dev)

```bash
# 1. Start Postgres (requires Docker)
docker compose -f docker-compose.dev.yml up -d

# 2. Configure env
cp .env.example .env.local
# Edit .env.local — set AUTH_SECRET (openssl rand -base64 32)

# 3. Run migrations
npm run db:migrate

# 4. Start the dev server
npm run dev
```

Visit http://localhost:3000 and register the first account.

## What it does

- **Decks & cards** — create, edit, delete. Card content renders as Markdown.
- **Study** — flip-to-reveal with four confidence ratings (Wrong / Close / Hard / Easy).
  Keyboard shortcuts: `Space` reveals, `1–4` rates.
- **Spaced repetition** — SM-2 algorithm schedules each card's next review
  based on your confidence rating.
- **Dashboard** — memory-stage breakdown, review forecast, study streak,
  90-day activity heatmap.
- **Import / export** — CSV, TXT, and JSON. JSON exports preserve SM-2 state.
- **Search** — Cmd/Ctrl+K across all decks and cards.
- **Themes** — light, dark, system.

## Tech stack

Next.js 15 (App Router) · Postgres · Drizzle ORM · Auth.js (NextAuth v5) ·
TanStack Query · Tailwind v4 · Recharts

## Docs

- [Build, dev & deployment](docs/build.md)
- [Features](docs/features.md)
- [Contributing guide (AGENTS.md)](AGENTS.md)