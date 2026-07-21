import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/server/auth";
import { dashboardStats, normalizeHorizon } from "@/server/queries/stats";
import { unauthorized } from "@/server/api";

export async function GET(req: Request): Promise<NextResponse> {
  const userId = await requireAuthUserId().catch(() => null);
  if (userId === null) return unauthorized();
  const url = new URL(req.url);
  const timeZone =
    url.searchParams.get("tz") ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const horizon = normalizeHorizon(url.searchParams.get("horizon"));
  const stats = await dashboardStats(userId, timeZone, horizon);
  return NextResponse.json(stats);
}