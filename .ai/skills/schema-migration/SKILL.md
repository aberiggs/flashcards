---
name: schema-migration
description: Use when changing the database schema in src/db/schema.ts. Covers the Drizzle generate → migrate → commit workflow, ON DELETE CASCADE conventions, bigint PKs, and the userId text foreign key. Do not use for query-only changes.
---

# Schema migration

The source of truth for all tables is `src/db/schema.ts`. Drizzle types are
inferred from it — no codegen step is needed.

## Workflow

1. Edit `src/db/schema.ts`.
2. Generate a migration from the change:

   ```bash
   npm run db:generate
   ```

   This creates a new `drizzle/*.sql` file.

3. Apply pending migrations:

   ```bash
   npm run db:migrate
   ```

   For dev-only rapid iteration you can skip migration files with
   `npm run db:push`, but prefer the generate/migrate flow for anything you'll
   commit.

4. Commit the new `drizzle/*.sql` file alongside the schema change.

## Conventions

- App tables (`decks`, `cards`, `studySessions`) use `bigint` serial PKs for
  compact URLs.
- Their `userId` foreign key is `text` referencing `users.id`.
- Foreign keys use `ON DELETE CASCADE` where children should be removed with
  their parent (e.g. cards when a deck is deleted).
- The `users` table is the only auth table (JWT sessions, no DB session table).

## Verify

After a schema change, run `npm run lint` and `npm run typecheck` before
committing. CI runs the same two checks.