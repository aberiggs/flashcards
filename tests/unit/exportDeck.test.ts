import { describe, it, expect } from "vitest";
import {
  buildDeckCsv,
  buildDeckJson,
  type ExportCard,
  type ExportDeck,
} from "@/lib/exportDeck";

describe("buildDeckCsv", () => {
  it("builds a CSV with a front,back header row", () => {
    const cards: ExportCard[] = [
      { front: "hola", back: "hello" },
      { front: "adios", back: "goodbye" },
    ];
    const csv = buildDeckCsv(cards);
    expect(csv).toBe("front,back\r\nhola,hello\r\nadios,goodbye");
  });

  it("quotes fields containing commas", () => {
    const csv = buildDeckCsv([{ front: "a,b", back: "c" }]);
    expect(csv).toBe('front,back\r\n"a,b",c');
  });

  it("quotes fields containing newlines", () => {
    const csv = buildDeckCsv([{ front: "line1\nline2", back: "x" }]);
    expect(csv).toBe('front,back\r\n"line1\nline2",x');
  });

  it("escapes double-quotes by doubling them", () => {
    const csv = buildDeckCsv([{ front: 'she said "hi"', back: "x" }]);
    expect(csv).toBe('front,back\r\n"she said ""hi""",x');
  });

  it("does not quote simple fields", () => {
    const csv = buildDeckCsv([{ front: "simple", back: "values" }]);
    expect(csv).toBe("front,back\r\nsimple,values");
  });

  it("handles empty card list with just a header", () => {
    const csv = buildDeckCsv([]);
    expect(csv).toBe("front,back");
  });

  it("round-trips through parseCsvRaw", async () => {
    const { parseCsvRaw } = await import("@/lib/parseDeck");
    const cards: ExportCard[] = [
      { front: "hola, friend", back: "hello" },
      { front: "q", back: 'a "quoted" answer' },
    ];
    const csv = buildDeckCsv(cards);
    const rows = parseCsvRaw(csv);
    // rows[0] is the header
    expect(rows.slice(1)).toEqual([
      ["hola, friend", "hello"],
      ["q", 'a "quoted" answer'],
    ]);
  });
});

describe("buildDeckJson", () => {
  it("serializes a deck with name and cards", () => {
    const deck: ExportDeck = {
      name: "Spanish",
      cards: [{ front: "hola", back: "hello" }],
    };
    const json = buildDeckJson(deck);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual({
      name: "Spanish",
      cards: [{ front: "hola", back: "hello" }],
    });
  });

  it("includes description when present", () => {
    const deck: ExportDeck = {
      name: "Spanish",
      description: "vocab list",
      cards: [{ front: "a", back: "b" }],
    };
    const parsed = JSON.parse(buildDeckJson(deck));
    expect(parsed.description).toBe("vocab list");
  });

  it("strips non-contract fields (id, userId, deckId, createdAt)", () => {
    const deck = {
      name: "x",
      cards: [{ front: "a", back: "b", id: 99, deckId: 1 }],
    } as unknown as ExportDeck;
    const parsed = JSON.parse(buildDeckJson(deck));
    expect(parsed.cards[0]).toEqual({ front: "a", back: "b" });
  });

  it("preserves SM-2 state fields when present", () => {
    const deck: ExportDeck = {
      name: "x",
      cards: [
        {
          front: "a",
          back: "b",
          efactor: 2.3,
          repetitions: 5,
          nextReview: 1700000000000,
          lastStudied: 1690000000000,
        },
      ],
    };
    const parsed = JSON.parse(buildDeckJson(deck));
    expect(parsed.cards[0]).toEqual({
      front: "a",
      back: "b",
      efactor: 2.3,
      repetitions: 5,
      nextReview: 1700000000000,
      lastStudied: 1690000000000,
    });
  });

  it("omits optional SM-2 fields when not present", () => {
    const deck: ExportDeck = {
      name: "x",
      cards: [{ front: "a", back: "b" }],
    };
    const parsed = JSON.parse(buildDeckJson(deck));
    expect(parsed.cards[0]).toEqual({ front: "a", back: "b" });
  });
});
