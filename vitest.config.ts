import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Pure-logic tests are fast; DB-backed suites share a Postgres container
    // started in globalSetup. Each suite truncates between cases for isolation.
    globalSetup: ["./tests/setup/global-setup.ts"],
    setupFiles: ["./tests/setup/test-env.ts"],
    // Route handlers + query tests touch the real Postgres container; giving
    // the container ~60s to pull/boot on the first run avoids CI flakiness.
    hookTimeout: 60_000,
    testTimeout: 30_000,
    include: ["tests/**/*.test.ts"],
    // All suites share a single Postgres container, so files must run
    // sequentially to avoid one file's beforeEach truncation wiping out
    // another file's in-flight test data.
    fileParallelism: false,
    // Single forked worker — keeps the shared `@/db` connection pool consistent
    // and avoids per-worker container churn.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});