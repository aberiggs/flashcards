import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/server/queries/auth";

// POST /api/auth/register
// Only succeeds when zero users exist (first-user setup).
// Once the first user is created, registration closes automatically.
export async function POST(req: Request): Promise<NextResponse> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  if (count > 0) {
    return NextResponse.json(
      { error: "Registration is closed. An account already exists." },
      { status: 403 }
    );
  }

  const body = (await req.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, name: body.name?.trim() || null })
    .returning({ id: users.id });

  return NextResponse.json({ id: user.id }, { status: 201 });
}