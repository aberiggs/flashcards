/**
 * Per-file setup. The global testcontainer setup runs before this, so
 * process.env.DATABASE_URL already points at the Postgres container.
 */
import { beforeAll, beforeEach } from "vitest";
import { db } from "@/db";
import { resetDb } from "./db-helpers";

// Ensure the shared `@/db` module loaded AFTER globalSetup set DATABASE_URL.
// Vitest runs globalSetup before importing test files, so this is guaranteed;
// this check just surfaces a clear error if someone refactors setup ordering.
beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL not set — globalSetup should have started the testcontainer."
    );
  }
});

// Truncate every app table before each test so suites are isolated without
// tearing down the container. `users` is truncated too — tests that need a
// user re-create one via createTestUser().
beforeEach(async () => {
  await resetDb(db);
});