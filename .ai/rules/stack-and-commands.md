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
```

> **No test runner exists.** There are no Jest, Vitest, Playwright, or other test
> frameworks in this project. CI runs `npm run lint` and `npx tsc --noEmit` only.

## CI / CD

- **Every push/PR**: `npm ci` → `npm run lint` → `npx tsc --noEmit`
- **Docker Compose** is the canonical self-host deployment (`docker compose up`).
- No codegen step needed — Drizzle types are inferred from `src/db/schema.ts`.