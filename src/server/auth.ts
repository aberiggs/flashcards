import { auth } from "@/auth";

/**
 * Get the authenticated user's id from the server session.
 * Returns null when not signed in. Use this in Server Components, Route
 * Handlers, and Server Actions to scope queries by user.
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user.id;
}

/**
 * Like getAuthUserId but throws for use in mutations/actions that require auth.
 */
export async function requireAuthUserId(): Promise<string> {
  const userId = await getAuthUserId();
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}