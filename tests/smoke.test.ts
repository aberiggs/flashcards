import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/db";

describe("testcontainer smoke", () => {
  it("connects to the Postgres container", async () => {
    const [row] = await db.execute<{ ok: number }>(sql`select 1 as ok`);
    expect(Number(row?.ok ?? -1)).toBe(1);
  });

  it("has the expected tables", async () => {
    const rows = await db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `);
    const names = rows.map((r) => String(r.table_name));
    expect(names).toEqual(expect.arrayContaining(["users", "decks", "cards", "study_sessions"]));
  });
});
