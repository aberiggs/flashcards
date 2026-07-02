# Build, Dev & Deployment Guide

## Stack

- **Frontend + API**: Next.js 15 (App Router, standalone output), React 19, Tailwind v4
- **Backend**: Postgres + Drizzle ORM, exposed via Next.js Route Handlers
- **Auth**: Auth.js (NextAuth v5) with Credentials provider (email + password, JWT sessions — no OAuth, no DB session table)
- **Data fetching**: TanStack Query (request/response + refetch — no realtime)

All server code lives under `src/server/` (query functions, auth helpers) and
`src/app/api/` (Route Handlers). The DB schema is `src/db/schema.ts`.

---

## Local development

### Prerequisites

- Node.js 20+
- npm
- Postgres 14+ (local install, Docker, or a cloud instance)

### First-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create the database**

   ```bash
   createdb flashcards
   ```

   (Or use Docker: `docker run -d --name flashcards-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=flashcards -p 5432:5432 postgres:17-alpine`)

3. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in:
   - `DATABASE_URL` — your Postgres connection string
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

### Running the app

```bash
npm run dev
```

Starts Next.js (Turbopack) on http://localhost:3000.

### npm scripts reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build (Next.js) |
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

No Convex codegen step needed anymore — types are inferred from Drizzle directly.

---

## Deployment

### Docker Compose (self-hosted)

The simplest self-hosted deployment: a single `docker compose up` brings up
Postgres + the Next.js app with migrations applied automatically.

1. Copy `.env.example` to `.env` on the host and fill in:
   - `AUTH_SECRET` (required)
   - `NEXTAUTH_URL` — the public URL of your deployment
   - Optionally `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` (defaults: `postgres`/`postgres`/`flashcards`)

2. Start it:

   ```bash
   docker compose up -d
   ```

3. Visit the app. Since no users exist, you'll see a registration form —
   create the first account. Registration closes automatically after that.

The Compose file runs `drizzle-kit migrate` before starting the server, so the
DB schema is always current. Postgres data persists in the `db_data` volume.

### Vercel (frontend hosting + managed Postgres)

For a hosted deployment without Docker:

1. Create a Vercel project linked to this repo.
2. Provision a Postgres instance (Vercel Postgres, Supabase, Neon, etc.) and set `DATABASE_URL` in Vercel env vars.
3. Set `AUTH_SECRET` and `NEXTAUTH_URL` in Vercel env vars.
4. Run migrations once: `DATABASE_URL=… npm run db:migrate` (or wire it into a build step).
5. Push to `main` — Vercel builds and deploys automatically.
6. Visit the app and create the first account via the registration form.
