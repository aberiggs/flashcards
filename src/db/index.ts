import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Postgres connection string."
  );
}

// `postgres` client used in the singleton pattern — the connection is reused
// across hot reloads in dev. For serverless/edge we'd need a different strategy,
// but for a self-hosted Node server this is the simplest correct setup.
const globalForDb = globalThis as unknown as {
  queryClient?: ReturnType<typeof postgres>;
};

const queryClient =
  globalForDb.queryClient ?? postgres(databaseUrl, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });