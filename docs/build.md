# Build, Dev & Deployment Guide

## Stack

- **Frontend + API**: Next.js 15 (App Router, standalone output), React 19, Tailwind v4
- **Backend**: Postgres + Drizzle ORM, exposed via Next.js Route Handlers
- **Auth**: Auth.js (NextAuth v5) with Credentials provider (email + password, JWT sessions — no OAuth, no DB session table)
- **Data fetching**: TanStack Query (request/response + refetch — no realtime)
- **Deployment**: Docker Compose (Next.js + Postgres)

All server code lives under `src/server/` (query functions, auth helpers) and
`src/app/api/` (Route Handlers). The DB schema is `src/db/schema.ts`.

---

## Local development

### Prerequisites

- Node.js 20+
- npm
- Docker (for Postgres)

### First-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start Postgres**

   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

   This runs a Postgres 17 container on port 5432 with a `flashcards` database.
   Stop it with `docker compose -f docker-compose.dev.yml down`. Wipe the data
   with `down -v`.

3. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in:
   - `DATABASE_URL` — `postgres://postgres:postgres@localhost:5432/flashcards`
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL=http://localhost:3000`

   That's it — no OAuth provider setup needed.

4. **Run migrations**

   ```bash
   npm run db:migrate
   ```

5. **Start the app and create your account**

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000. Since no users exist yet, you'll see a
   registration form. Create the first account — registration closes
   automatically after that.

### npm scripts reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (Turbopack) |
| `npm run build` | Production build (Next.js standalone output) |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly to DB (dev only — skips migration files) |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |

### Schema changes

1. Edit `src/db/schema.ts`
2. Run `npm run db:generate` to create a new migration in `drizzle/`
3. Run `npm run db:migrate` to apply it
4. Commit the new `drizzle/*.sql` file

---

## CI pipeline (GitHub Actions)

The workflow at `.github/workflows/deploy.yml` runs on every push/PR:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck` (or `npx tsc --noEmit`)

No codegen step needed — types are inferred from Drizzle directly.

---

## Deployment (Docker Compose)

The canonical self-hosted deployment: a single `docker compose up` brings up
Postgres + the Next.js app with migrations applied automatically.

### Setup

1. Copy `.env.example` to `.env` on the host and fill in:
   - `AUTH_SECRET` (required — `openssl rand -base64 32`)
   - `NEXTAUTH_URL` — the public URL of your deployment (e.g. `http://flashcards.lan:3000`)
   - Optionally `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` (defaults: `postgres`/`postgres`/`flashcards`)

2. Start it:

   ```bash
   docker compose up -d
   ```

3. Visit the app. Since no users exist, you'll see a registration form —
   create the first account. Registration closes automatically after that.

### How it works

- The `web` service builds from the `Dockerfile` (multi-stage Next.js
  standalone build).
- On startup, it runs `drizzle-kit migrate` before starting the server, so
  the DB schema is always current.
- Postgres data persists in the `db_data` Docker volume.
- The app listens on port 3000.

### Operations

```bash
docker compose up -d      # start
docker compose down       # stop
docker compose down -v    # stop + wipe database
docker compose logs -f    # tail logs
docker compose pull && docker compose up -d   # update to a new image
```

### Behind a reverse proxy

If you're putting it behind nginx/Traefik/Caddy with HTTPS, set
`NEXTAUTH_URL` to the public-facing URL (e.g. `https://flashcards.yourdomain`)
so auth redirects work correctly.