import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/server/auth";
import { search } from "@/server/queries/search";
import { badRequest, unauthorized } from "@/server/api";

export async function GET(req: Request): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return badRequest("Query must be at least 2 characters");
  const results = await search(userId, q);
  return NextResponse.json(results);
}