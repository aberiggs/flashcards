import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/**
 * Testcontainer Postgres started once per test run and shared across suites.
 * The connection string is exposed to tests via process.env.DATABASE_URL so
 * `@/db` (which reads DATABASE_URL at module load) connects to the container.
 *
 * Each test suite is responsible for truncating tables between cases — the
 * container itself lives for the whole run.
 */

let container: StartedPostgreSqlContainer | undefined;

async function applyMigrations(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql);
  // Drizzle writes migration metadata into a `drizzle` schema; the migrator
  // creates it if missing. `drizzle/` holds the generated SQL + journal.
  await migrate(db, { migrationsFolder: "./drizzle" });
  await sql.end();
}

export async function setup() {
  // `started()` resolves once Postgres is accepting connections.
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("flashcards_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const databaseUrl = container.getConnectionUri();
  // Expose to `@/db` and our test helpers. Override any local .env.local value.
  process.env.DATABASE_URL = databaseUrl;

  // Apply the committed Drizzle migrations so the schema is real.
  await applyMigrations(databaseUrl);

  console.log(`[testcontainers] Postgres ready at ${databaseUrl}`);
}

export async function teardown() {
  await container?.stop();
}