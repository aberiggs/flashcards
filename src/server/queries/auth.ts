import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Verify a plaintext password against a bcrypt hash. Node-only (uses bcrypt). */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Hash a password with bcrypt (cost 12). Node-only. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** True when no users exist yet — registration is open for the first user. */
export async function isRegistrationOpen(): Promise<boolean> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  return count === 0;
}