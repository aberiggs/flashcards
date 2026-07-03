# Agent Guidelines for `flashcards`

A Next.js 15 + Convex full-stack flashcard app with SM-2 spaced repetition, AI card
generation, and OAuth authentication (GitHub + Google).

---

## Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router, Turbopack, standalone output), React 19, Tailwind v4 |
| Backend    | Postgres + Drizzle ORM, exposed via Next.js Route Handlers under `src/app/api/` |
| Auth       | Auth.js (NextAuth v5) with Credentials provider (email + password, JWT sessions) |
| Charts     | Recharts                                                |
| Icons      | Lucide React                                            |
| Data       | TanStack Query (request/response + refetch — no realtime) |
| Deployment | Docker Compose (Next.js + Postgres) — self-hosted, no cloud dependencies |

---

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

---

## CI / CD

- **Every push/PR**: `npm ci` → `npm run lint` → `npx tsc --noEmit`
- **Docker Compose** is the canonical self-host deployment (`docker compose up`).
- No codegen step needed — Drizzle types are inferred from `src/db/schema.ts`.

---

## Project Layout

```
src/
  app/
    (protected)/          # Auth-gated route group — all pages are 'use client'
    api/                  # Next.js Route Handlers (REST endpoints)
      api/auth/[...nextauth]/route.ts   # Auth.js handler
      api/decks/...       # Deck + card + study + stats endpoints
      api/stats/...       # Dashboard stats endpoints
      api/search/         # Search endpoint
      api/import/         # Bulk import endpoint
    AuthSessionProvider.tsx  # Client-side next-auth SessionProvider
    QueryProvider.tsx        # TanStack Query client provider
    globals.css           # Tailwind v4 @theme + CSS custom properties
    layout.tsx            # Root layout (providers)
    page.tsx              # Landing / dashboard
  auth.ts                 # NextAuth config (providers, adapter, callbacks)
  middleware.ts           # Route protection (auth-gated middleware)
  components/
    features/             # Domain-specific components (dashboard/, decks/)
    layout/               # AppHeader, Footer, SearchBar
    theme/                # ThemeProvider, ThemeToggle
    ui/                   # Generic primitives (Card, Modal, PageLoader, …)
  db/
    schema.ts             # Drizzle schema (source of truth for all tables)
    index.ts              # Postgres connection + Drizzle instance
  lib/
    sm2.ts                # SM-2 spaced-repetition algorithm (pure logic)
    limits.ts             # Resource cap constants
    hooks.ts              # TanStack Query hooks (useDecks, useCards, etc.)
    api.ts                # Typed fetch client for the REST API
    parseDeck.ts          # Import file parsing (CSV/TXT/JSON)
    exportDeck.ts         # Deck export (CSV/JSON)
    memoryStage.ts        # Memory stage classification
  server/
    auth.ts               # getAuthUserId / requireAuthUserId helpers
    api.ts                # Route Handler response helpers
    queries/
      decks.ts            # Deck CRUD + stats aggregation
      cards.ts            # Card CRUD + SM-2 review recording
      sessions.ts         # Study session lifecycle
      stats.ts            # Dashboard / deck / gamification / activity stats
      search.ts           # ILIKE search
      import.ts           # Bulk deck import
  types/
    next-auth.d.ts        # Session.user.id type augmentation

drizzle/                  # Generated migration SQL files (committed)
drizzle.config.ts         # Drizzle Kit configuration
Dockerfile                # Multi-stage Next.js standalone build
docker-compose.yml        # Next.js + Postgres self-host deployment
```

---

## TypeScript

- **Strict mode** is enabled in `tsconfig.json`.
- Root target: `ES2017`.
- **Path alias**: `@/*` → `./src/*`. Use `@/` for all intra-`src/` imports.
- Never use `any`; prefer `unknown` + type guards when the shape is truly unknown.
- Avoid type assertions (`as Foo`) unless bridging external API responses that are
  already validated.
- `interface` for object shapes; `type` for unions, intersections, and aliases.
- Do **not** prefix interface names with `I`.

---

## Code Style

### Imports

```ts
// 1. React (if needed explicitly)
import { useState, useCallback } from "react";
// 2. Third-party packages
import { useQuery } from "@tanstack/react-query";
// 3. Internal — alias imports (@/)
import { Modal } from "@/components/ui/Modal";
import { useDecks } from "@/lib/hooks";
```

### Components

- Every client component starts with `'use client';` (single quotes) on line 1.
- Use **named exports** everywhere. Default exports are reserved for Next.js page and
  layout files (`export default function Page() { … }`).
- Define props interfaces directly above the component:

  ```ts
  interface CardProps {
    title: string;
    children: ReactNode;
  }

  export function Card({ title, children }: CardProps) { … }
  ```

- Use `ReactNode` for `children`, not `JSX.Element` or `React.FC`.

### Naming

| Thing                        | Convention                  |
| ---------------------------- | --------------------------- |
| Components / files           | `PascalCase`                |
| Route handler files          | `route.ts` (Next.js convention) |
| Variables / functions        | `camelCase`                 |
| Types / interfaces           | `PascalCase` (no `I` prefix) |
| Constants (module-level)     | `SCREAMING_SNAKE_CASE` + `as const` |

### Backend (Drizzle + Route Handlers)

- Scope every query/mutation to the authenticated user: call `getAuthUserId()` or
  `requireAuthUserId()` from `src/server/auth.ts`.
  - **Reads**: return `null` or `[]` when unauthenticated.
  - **Writes**: throw `new Error("Not authenticated")` when unauthenticated.
- Ownership checks: throw `new Error("<Entity> not found")` if the record doesn't
  belong to the caller.
- Keep query logic in `src/server/queries/*.ts`. Keep Route Handlers in
  `src/app/api/**/route.ts` thin — they parse the request, call a query function,
  and return JSON.
- Use Drizzle's query builder (`eq`, `and`, `lt`, `sql`, etc.) — avoid raw SQL
  strings unless the builder can't express the query.
- Foreign keys use `ON DELETE CASCADE` where children should be removed with their
  parent (e.g. cards when a deck is deleted).
- Never return raw secrets from API routes.

### Error Handling (Client)

```ts
try {
  await doSomething();
} catch (err) {
  setError(err instanceof Error ? err.message : "An unexpected error occurred");
}
```

- Use `void expression()` to intentionally discard a promise in event handlers
  (e.g., `void signOut()`).
- Never swallow errors silently.

### Styling (Tailwind v4)

- **No `tailwind.config.*`** — configuration lives in `globals.css` via `@theme inline`.
- Use the CSS custom property tokens (`--surface-primary`, `--text-secondary`,
  `--accent-primary`, etc.) rather than raw hex values.
- Use `style={{ … }}` only when Tailwind can't express the value (CSS variables,
  `color-mix()`, dynamic `calc()` expressions).
- Conditional classes: template literals or a helper — avoid third-party `clsx` unless
  already present.

### Accessibility

- All icon-only buttons must have `aria-label`.
- Decorative Lucide icons: `<Icon className="w-4 h-4" aria-hidden />`.
- Non-`<button>` clickable elements need `role="button"`, `tabIndex={0}`, and an
  `onKeyDown` handler.
- Interactive elements: include `focus:outline-none focus:ring-2 focus:ring-[--accent-primary]`.

---

## State Management

- No global state library. Use React built-ins: `useState`, `useEffect`, `useRef`,
  `useCallback`.
- TanStack Query provides caching, refetch, and loading states. `useMutation` /
  `useQuery` hooks in `src/lib/hooks.ts` are the data layer — invalidate affected
  query keys in mutation `onSuccess` callbacks to keep the UI fresh.
- When you need a stable snapshot of data (e.g., during a study session), copy
  query results into local state at session start to prevent mid-session re-sorting
  from refetches.

---

## Auth

- Auth is configured in `src/auth.ts` (NextAuth v5) using the **Credentials**
  provider — email + password validated against the `users` table, with passwords
  hashed via `bcryptjs` (cost 12). No OAuth, no external provider accounts.
- Session strategy is **JWT** (signed with `AUTH_SECRET`) — no DB session table.
  The `users` table is the only auth table.
- First-user setup: when the `users` table is empty, the home page shows a
  registration form. Once the first user is created, registration closes
  automatically (`/api/auth/register` returns 403 when any user exists).
- App tables (`decks`, `cards`, `studySessions`) use `bigint` serial PKs for compact
  URLs; their `userId` foreign key is `text` referencing `users.id`.
- `src/middleware.ts` gates protected routes by checking `req.auth` from the NextAuth
  middleware wrapper.
- The `(protected)/` route group's `layout.tsx` handles the auth gate client-side
  via `useSession()` — all child pages can assume the user is authenticated.
- Required env vars: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`. That's it —
  no OAuth client IDs or secrets.

---

## Keeping Docs Current

After completing any feature work or making meaningful changes, update `docs/features.md`:

- **Keep current capabilities current**: add or revise user-visible functionality in
  the appropriate section.
- **Keep descriptions honest**: write feature notes as user-visible capabilities, not
  implementation details.
- **Don't over-document**: trivial bug fixes and refactors don't need feature doc updates.
  New user-facing features and significant UX changes do.

Also update `docs/build.md` if you change the dev setup, environment variables,
deployment process, or add new tooling.

---

## Do Not

- Add a global state library (Zustand, Redux, Jotai) without discussion.
- Add a test framework ad-hoc — if tests are needed, plan the framework choice first.
- Use `console.log` in committed code; use `console.error` only in genuine error paths.
- Add Prettier or change the ESLint config without updating this file.
