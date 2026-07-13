# Backend (Drizzle + Route Handlers)

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