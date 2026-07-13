---
name: adding-backend-endpoint
description: Use when adding or modifying a backend API endpoint, server query, or mutation in the flashcards app. Covers the Drizzle query layer under src/server/queries/, thin Route Handlers under src/app/api/, authenticated scoping with getAuthUserId/requireAuthUserId, and ownership checks. Do not use for frontend-only work.
---

# Adding a backend endpoint

The flashcards backend is Postgres + Drizzle ORM exposed via Next.js Route
Handlers. The flow for any new read or write is:

## 1. Query layer (`src/server/queries/*.ts`)

Put domain logic here. Each function:

- Calls `getAuthUserId()` (reads may return `null`/`[]` when unauthenticated) or
  `requireAuthUserId()` (writes throw `new Error("Not authenticated")`) from
  `src/server/auth.ts`.
- Scopes every Drizzle query to the authenticated user's `userId`.
- For mutations on owned records (decks, cards), checks ownership and throws
  `new Error("<Entity> not found")` if the record doesn't belong to the caller.
- Uses Drizzle's query builder (`eq`, `and`, `lt`, `sql`, …) — avoid raw SQL unless
  the builder can't express the query.
- Never returns raw secrets.

## 2. Route Handler (`src/app/api/**/route.ts`)

Keep it thin:

- Parse the request (params, body).
- Call the query function.
- Return JSON using the helpers in `src/server/api.ts`.

Do not put domain logic in the Route Handler.

## 3. Client hook (`src/lib/hooks.ts`)

If the endpoint is consumed by the UI, add a TanStack Query hook (`useQuery` for
reads, `useMutation` for writes) in `src/lib/hooks.ts`. For mutations, invalidate
affected query keys in `onSuccess` so the UI refreshes.

## 4. Schema changes

If the endpoint needs a new column or table:

1. Edit `src/db/schema.ts`.
2. `npm run db:generate` to create a migration in `drizzle/`.
3. `npm run db:migrate` to apply it.
4. Commit the new `drizzle/*.sql` file.

Foreign keys use `ON DELETE CASCADE` where children should be removed with their
parent (e.g. cards when a deck is deleted).

## 5. Verify

Run `npm run lint` and `npm run typecheck` before committing. CI runs the same
two checks.