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

- Node.js 22+
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

The workflow at `.github/workflows/ci.yml` runs on every push/PR:

1. `npm ci`
2. `npm run lint`
3. `npx tsc --noEmit`

On pushes to `main` (only), the `build-and-push` job also builds the Docker
image and publishes it to GitHub Container Registry:

- `ghcr.io/aberiggs/flashcards:latest`
- `ghcr.io/aberiggs/flashcards:sha-<commit>`

GHCR is free for public repos. Pulling the image on the server requires no
authentication (public repo) or a PAT with `read:packages` (private repo).

No codegen step needed — types are inferred from Drizzle directly.

---

## Deployment (Docker Compose)

The canonical self-hosted deployment: a single `docker compose up -d` pulls
the pre-built image from GitHub Container Registry and brings up Postgres +
the Next.js app with migrations applied automatically. No source checkout or
build toolchain needed on the server.

### Prerequisites

- Docker Engine + the Compose plugin
- The `docker-compose.yml` from this repo (just that one file)
- An `.env` next to it (see below)

### Setup

1. Copy `docker-compose.yml` from this repo into a directory on your server
   (e.g. `~/flashcards/`).

2. Generate an auth secret, then create `.env` in the same directory:

   ```bash
   openssl rand -base64 32   # paste the output as AUTH_SECRET below
   cat > .env <<'EOF'
   AUTH_SECRET=paste-the-output-of-openssl-rand-above
   NEXTAUTH_URL=http://flashcards.lan:3000   # public URL of the app
   POSTGRES_USER=flashcards                  # choose a DB username
   POSTGRES_PASSWORD=choose-a-strong-db-password
   POSTGRES_DB=flashcards

   # Optional overrides (defaults shown):
   # WEB_PORT=3000                           # host port for the web app
   # POSTGRES_DATA_PATH=./pgdata             # where DB data lives on the host
   EOF
   ```

   All of `AUTH_SECRET`, `NEXTAUTH_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
   and `POSTGRES_DB` are **required** — Compose will refuse to start if any is
   missing, rather than silently falling back to insecure defaults.

   What each does:

   - **`AUTH_SECRET`** — signs session JWTs. Required. Generate with
     `openssl rand -base64 32`.
   - **`NEXTAUTH_URL`** — the public URL of your deployment (used for auth
     redirects). If you're behind a reverse proxy with HTTPS, set this to
     the public-facing URL (e.g. `https://flashcards.yourdomain`).
   - **`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`** — Postgres
     credentials. No defaults — you must set all three. The `web` service uses
     these to build its `DATABASE_URL`.
   - **`WEB_PORT`** — host port the app is published on. Default `3000`.
     Change it if you want to run on a different port (e.g. `8080`).
    - **`POSTGRES_DATA_PATH`** — where Postgres stores its data on the host.
      Default `./pgdata` (relative to the compose directory). Set to an
      absolute path on a dedicated disk for control over disk placement, e.g.
      `/mnt/raid/flashcards/pgdata`.

3. Start it:

   ```bash
   docker compose up -d
   ```

4. Visit the app at `NEXTAUTH_URL`. Since no users exist yet, you'll see a
   registration form — create the first account. Registration closes
   automatically after that.

### How it works

- The `web` service pulls `ghcr.io/aberiggs/flashcards:latest` (published by
  CI on every push to `main`). On startup it runs `drizzle-kit migrate`
  before starting the server, so the DB schema is always current.
- The `db` service runs `postgres:17-alpine`. Its data is bind-mounted to
  `POSTGRES_DATA_PATH` on the host (default `./pgdata`).
- Postgres is **not** published to the host — only the `web` service can
  reach it over the internal compose network (hostname `db`). If you need to
  connect from the host (e.g. for Drizzle Studio), add a `ports:` block to
  the `db` service temporarily.
- The app listens on `WEB_PORT` (default 3000).

### Operations

```bash
docker compose up -d                                 # start
docker compose down                                   # stop
docker compose down -v                                # stop + wipe database
docker compose logs -f                                # tail logs
docker compose pull && docker compose up -d           # update to newest image
docker compose up -d --force-recreate web             # recreate web after image pull
```

### Updating

When a new commit lands on `main`, CI pushes a new `:latest` image to GHCR.
On your server:

```bash
docker compose pull && docker compose up -d
```

Compose detects the new image and recreates the `web` container. Postgres
data on the host is untouched.

### Behind a reverse proxy

If you're putting it behind nginx/Traefik/Caddy with HTTPS, set
`NEXTAUTH_URL` to the public-facing URL (e.g. `https://flashcards.yourdomain`)
so auth redirects work correctly. You can also set `WEB_PORT` to something
internal (e.g. `127.0.0.1:3000:3000` in `ports:`) and let the proxy handle
the public port.