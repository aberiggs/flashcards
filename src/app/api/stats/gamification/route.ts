import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/server/auth";
import { gamificationStats } from "@/server/queries/stats";
import { unauthorized } from "@/server/api";

export async function GET(req: Request): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const timeZone =
    new URL(req.url).searchParams.get("tz") ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const stats = await gamificationStats(userId, timeZone);
  return NextResponse.json(stats);
}