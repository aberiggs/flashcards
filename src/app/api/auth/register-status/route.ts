import { NextResponse } from "next/server";
import { isRegistrationOpen } from "@/server/queries/auth";

// GET /api/auth/register-status → { open: boolean }
export async function GET(): Promise<NextResponse> {
  const open = await isRegistrationOpen();
  return NextResponse.json({ open });
}