import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/db/schema";

/** Shared Drizzle DB type used by test helpers — mirrors `@/db`'s `db`. */
export type Db = PostgresJsDatabase<typeof schema>;