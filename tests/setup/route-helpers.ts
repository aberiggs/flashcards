import { vi } from "vitest";
import type { NextResponse } from "next/server";

/**
 * Mock `@/server/auth` so route handlers treat every request as authenticated
 * as `userId`. Call this at the top of a route-handler test file, then call
 * `setAuthUserId(...)` per test to switch users or pass null to simulate a
 * logged-out request.
 *
 * Routes import `requireAuthUserId` from `@/server/auth`; mocking the module
 * here means the real NextAuth + DB auth path is never invoked in tests.
 */

let currentUserId: string | null = null;

export function setAuthUserId(id: string | null): void {
  currentUserId = id;
}

export function mockAuth(): void {
  vi.mock("@/server/auth", () => ({
    getAuthUserId: vi.fn(async () => currentUserId),
    requireAuthUserId: vi.fn(async () => {
      if (currentUserId === null) throw new Error("Not authenticated");
      return currentUserId;
    }),
  }));
}

/** Read the JSON body of a NextResponse, asserting it's a Response-like object. */
export async function jsonResponse(res: NextResponse): Promise<unknown> {
  return res.json();
}
