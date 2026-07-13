# Auth

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