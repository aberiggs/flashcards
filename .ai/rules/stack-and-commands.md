# Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router, Turbopack, standalone output), React 19, Tailwind v4 |
| Backend    | Postgres + Drizzle ORM, exposed via Next.js Route Handlers under `src/app/api/` |
| Auth       | Auth.js (NextAuth v5) with Credentials provider (email + password, JWT sessions) |
| Charts     | Recharts                                                |
| Icons      | Lucide React                                            |
| Data       | TanStack Query (request/response + refetch — no realtime) |
| Deployment | Docker Compose (Next.js + Postgres) — self-hosted, no cloud dependencies |
| Tests      | Vitest + @testcontainers/postgresql (real Postgres per run) |

## Commands

```bash
# Start Next.js dev server (Turbopack)
npm run dev

# Lint (ESLint with next/core-web-vitals + next/typescript)
npm run lint

# Type-check without emitting (run this before committing)
npm run typecheck

# Drizzle migrations
npm run db:generate   # generate a migration from schema changes
npm run db:migrate    # apply pending migrations
npm run db:push       # push schema directly to DB (dev only)
npm run db:studio     # open Drizzle Studio (DB browser)

# Production build (Next.js standalone output)
npm run build

# Tests (Vitest). Spins up a Postgres container via testcontainers — Docker must be running.
npm run test        # run once
npm run test:watch  # watch mode
npm run test:ci     # CI mode (adds github-actions reporter)
```

> **Tests use Vitest** with `@testcontainers/postgresql`. DB-backed suites share
> a single Postgres 16 container started in `tests/setup/global-setup.ts`; each
> test file truncates between cases via `beforeEach` in `tests/setup/test-env.ts`.
> Files run sequentially (`fileParallelism: false`) because they share one DB.

## CI / CD

- **Every push/PR**: `npm ci` → `npm run lint` → `npx tsc --noEmit` (check job), and `npm run test:ci` (test job, requires Docker for testcontainers).
- **Docker Compose** is the canonical self-host deployment (`docker compose up`).
- No codegen step needed — Drizzle types are inferred from `src/db/schema.ts`.