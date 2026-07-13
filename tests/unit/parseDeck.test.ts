import { describe, it, expect } from "vitest";
import {
  parseCsvRaw,
  parseCsv,
  parseJson,
  parseDeckFile,
} from "@/lib/parseDeck";

describe("parseCsvRaw", () => {
  it("parses a simple two-column CSV", () => {
    const rows = parseCsvRaw("front,back\nhello,world\nfoo,bar");
    expect(rows).toEqual([
      ["front", "back"],
      ["hello", "world"],
      ["foo", "bar"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const rows = parseCsvRaw('"hello, world","bar"');
    expect(rows).toEqual([["hello, world", "bar"]]);
  });

  it("handles doubled double-quotes as escaped quotes", () => {
    const rows = parseCsvRaw('"she said ""hi""","bar"');
    expect(rows).toEqual([['she said "hi"', "bar"]]);
  });

  it("handles quoted newlines inside a field", () => {
    const rows = parseCsvRaw('"line1\nline2","bar"');
    expect(rows).toEqual([["line1\nline2", "bar"]]);
  });

  it("handles CRLF line endings", () => {
    const rows = parseCsvRaw("a,b\r\nc,d\r\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("skips empty rows", () => {
    const rows = parseCsvRaw("a,b\n\n\nc,d");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles lone carriage returns", () => {
    const rows = parseCsvRaw("a,b\r\rc,d");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsvRaw("")).toEqual([]);
  });
});

describe("parseCsv", () => {
  it("parses a CSV with no header using columns 0 and 1", () => {
    const result = parseCsv("hello,world\nfoo,bar", "deck.csv");
    expect(result.cards).toEqual([
      { front: "hello", back: "world" },
      { front: "foo", back: "bar" },
    ]);
    expect(result.suggestedName).toBe("deck");
  });

  it("detects front/back header synonyms", () => {
    const result = parseCsv("question,answer\nq1,a1", "deck.csv");
    expect(result.cards).toEqual([{ front: "q1", back: "a1" }]);
  });

  it("detects term/definition synonyms", () => {
    const result = parseCsv("term,definition\nfoo,a definition", "d.csv");
    expect(result.cards).toEqual([{ front: "foo", back: "a definition" }]);
  });

  it("detects word/meaning synonyms", () => {
    const result = parseCsv("word,meaning\nbonjour,hello", "d.csv");
    expect(result.cards).toEqual([{ front: "bonjour", back: "hello" }]);
  });

  it("detects q/a synonyms", () => {
    const result = parseCsv("q,a\nq1,a1", "deck.csv");
    expect(result.cards).toEqual([{ front: "q1", back: "a1" }]);
  });

  it("uses front+next-column when only front header present", () => {
    const result = parseCsv("front,extra\nhello,world", "d.csv");
    expect(result.cards).toEqual([{ front: "hello", back: "world" }]);
  });

  it("skips rows with empty front or back", () => {
    const result = parseCsv("front,back\nhello,world\n,back\nfront,\n,,", "d.csv");
    expect(result.cards).toEqual([{ front: "hello", back: "world" }]);
  });

  it("throws on empty file", () => {
    expect(() => parseCsv("", "d.csv")).toThrow(/empty/i);
  });

  it("throws when no valid cards found", () => {
    expect(() => parseCsv("front,back\n,\n,", "d.csv")).toThrow(/no valid cards/i);
  });

  it("derives suggestedName from filename, replacing separators", () => {
    const result = parseCsv("a,b", "my-cool_deck.csv");
    expect(result.suggestedName).toBe("my cool deck");
  });

  it("falls back to 'Imported Deck' when filename has no name", () => {
    const result = parseCsv("a,b", ".csv");
    expect(result.suggestedName).toBe("Imported Deck");
  });
});

describe("parseJson", () => {
  it("parses a deck object with cards array", () => {
    const json = JSON.stringify({
      name: "Spanish",
      description: "vocab",
      cards: [
        { front: "hola", back: "hello" },
        { front: "adios", back: "goodbye" },
      ],
    });
    const result = parseJson(json, "deck.json");
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toEqual({ front: "hola", back: "hello" });
    expect(result.suggestedName).toBe("Spanish");
    expect(result.description).toBe("vocab");
  });

  it("accepts an array of decks and uses the first", () => {
    const json = JSON.stringify([
      { name: "First", cards: [{ front: "a", back: "b" }] },
      { name: "Second", cards: [{ front: "x", back: "y" }] },
    ]);
    const result = parseJson(json, "deck.json");
    expect(result.suggestedName).toBe("First");
    expect(result.cards).toEqual([{ front: "a", back: "b" }]);
  });

  it("preserves SM-2 state fields when present", () => {
    const json = JSON.stringify({
      name: "S",
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
    });
    const result = parseJson(json, "deck.json");
    expect(result.cards[0]).toEqual({
      front: "a",
      back: "b",
      efactor: 2.3,
      repetitions: 5,
      nextReview: 1700000000000,
      lastStudied: 1690000000000,
    });
  });

  it("uses filename for suggestedName when JSON has no name", () => {
    const json = JSON.stringify({ cards: [{ front: "a", back: "b" }] });
    const result = parseJson(json, "my-deck.json");
    expect(result.suggestedName).toBe("my deck");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJson("{not valid", "d.json")).toThrow(/invalid json/i);
  });

  it("throws when top-level is not an object/array", () => {
    expect(() => parseJson("42", "d.json")).toThrow(/unexpected json format/i);
  });

  it("throws when cards array is missing", () => {
    expect(() => parseJson(JSON.stringify({ name: "x" }), "d.json")).toThrow(
      /missing a "cards" array/i
    );
  });

  it("throws when a card is not an object", () => {
    const json = JSON.stringify({ cards: ["not an object"] });
    expect(() => parseJson(json, "d.json")).toThrow(/not an object/i);
  });

  it("throws when a card is missing front or back", () => {
    const json = JSON.stringify({ cards: [{ front: "a" }] });
    expect(() => parseJson(json, "d.json")).toThrow(/missing a non-empty/i);
  });

  it("throws when the deck has no cards", () => {
    const json = JSON.stringify({ name: "x", cards: [] });
    expect(() => parseJson(json, "d.json")).toThrow(/no cards/i);
  });
});

describe("parseDeckFile", () => {
  it("dispatches to parseJson for .json files", async () => {
    const file = new File(
      [JSON.stringify({ name: "x", cards: [{ front: "a", back: "b" }] })],
      "deck.json",
      { type: "application/json" }
    );
    const result = await parseDeckFile(file);
    expect(result.cards).toEqual([{ front: "a", back: "b" }]);
  });

  it("dispatches to parseCsv for .csv files", async () => {
    const file = new File(["a,b\nc,d"], "deck.csv", {
      type: "text/csv",
    });
    const result = await parseDeckFile(file);
    expect(result.cards).toEqual([
      { front: "a", back: "b" },
      { front: "c", back: "d" },
    ]);
  });

  it("dispatches to parseCsv for .txt files", async () => {
    const file = new File(["a,b\nc,d"], "deck.txt", { type: "text/plain" });
    const result = await parseDeckFile(file);
    expect(result.cards).toHaveLength(2);
  });

  it("rejects unsupported file types", async () => {
    const file = new File(["data"], "deck.xlsx", {
      type: "application/vnd.ms-excel",
    });
    await expect(parseDeckFile(file)).rejects.toThrow(/unsupported file type/i);
  });

  it("rejects files over 5MB", async () => {
    const big = "x".repeat(5 * 1024 * 1024 + 1);
    const file = new File([big], "big.csv", { type: "text/csv" });
    await expect(parseDeckFile(file)).rejects.toThrow(/too large/i);
  });
});
