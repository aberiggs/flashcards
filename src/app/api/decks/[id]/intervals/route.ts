import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/server/auth";
import { deckIntervalStats } from "@/server/queries/stats";
import { badRequest, notFound, parseIdParam, unauthorized } from "@/server/api";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const deckId = parseIdParam((await params).id);
  if (deckId === null) return badRequest("Invalid deck id");
  const timeZone =
    new URL(req.url).searchParams.get("tz") ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const stats = await deckIntervalStats(userId, deckId, timeZone);
  if (!stats) return notFound("Deck not found");
  return NextResponse.json(stats);
}