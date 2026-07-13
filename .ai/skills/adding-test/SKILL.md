# Skill: Adding a Test

Use this when adding a new test to the Vitest suite. Covers pure-logic,
server query, and route handler tests.

## Where the test goes

| What you're testing                     | Directory           |
| --------------------------------------- | ------------------- |
| Pure logic (no DB, no auth)             | `tests/unit/`       |
| Server query layer (`src/server/queries/*`) | `tests/server/` |
| Route handlers (`src/app/api/**/route.ts`)  | `tests/routes/`  |

Name the file `<module>.test.ts` matching the source module.

## Pure-logic test

```ts
import { describe, it, expect } from "vitest";
import { computeThing } from "@/lib/thing";

describe("computeThing", () => {
  it("does the expected thing", () => {
    expect(computeThing(2, 3)).toBe(5);
  });
});
```

No DB, no setup needed. The testcontainer still starts (global setup always
runs) but the test never touches it.

## Server query test

Imports the real `@/db` (pointing at the testcontainer) and the query function.

```ts
import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { createDeck } from "@/server/queries/decks";
import { createTestUser, seedDeck } from "../setup/db-helpers";

describe("createDeck", () => {
  it("creates a deck", async () => {
    const user = await createTestUser(db);
    const id = await createDeck(user.id, "Spanish");
    expect(typeof id).toBe("number");
  });
});
```

- `beforeEach` in `tests/setup/test-env.ts` truncates all tables — each test
  starts clean.
- Use `createTestUser`, `seedDeck`, `seedCard`, `seedSession` from
  `tests/setup/db-helpers.ts` to set up fixtures.
- For ownership/scope tests, create two users with distinct emails.

## Route handler test

Mock `@/server/auth` so `requireAuthUserId` returns a test user id, then call
the exported handler directly with a `Request` and params.

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { createTestUser, seedDeck } from "../setup/db-helpers";
import { mockAuth, setAuthUserId } from "../setup/route-helpers";

mockAuth(); // must be at module scope, before importing the route

import { GET, POST } from "@/app/api/decks/route";

describe("GET /api/decks", () => {
  beforeEach(() => setAuthUserId(null));

  it("returns 401 when not authenticated", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns decks", async () => {
    const user = await createTestUser(db);
    await seedDeck(db, user.id, { name: "Alpha" });
    setAuthUserId(user.id);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).map((d: { name: string }) => d.name)).toEqual(["Alpha"]);
  });
});
```

- `mockAuth()` must be called at module scope (before importing the route
  handler) so `vi.mock` hoists.
- `setAuthUserId(null)` in `beforeEach` to reset to logged-out between tests.
- For dynamic routes, pass `{ params: Promise.resolve({ id: "1" }) }`.

## Running

```bash
npm run test          # all tests
npx vitest run tests/server/decks.test.ts  # one file
npm run test:watch    # watch mode
```

Docker must be running (testcontainers starts a Postgres container).

## CI

The `test` job in `.github/workflows/ci.yml` runs `npm run test:ci` on every
push/PR. GitHub Actions runners have Docker available.