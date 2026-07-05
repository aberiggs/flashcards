import { NextResponse } from "next/server";

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

export function handleError(err: unknown): NextResponse {
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  // Ownership/not-found errors from our query layer are 404s; auth errors 401.
  if (message === "Not authenticated") return unauthorized();
  if (message.endsWith("not found")) return notFound(message);
  return badRequest(message);
}

export function parseIdParam(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}