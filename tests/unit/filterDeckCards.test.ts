import { describe, it, expect } from "vitest";
import {
  filterDeckCards,
  isFilterActive,
  type DeckCardInput,
} from "@/lib/filterDeckCards";

const DAY = 24 * 60 * 60 * 1000;

// Fixed reference time for deterministic tests.
const NOW = Date.UTC(2026, 2, 15, 12, 0, 0); // 2026-03-15 12:00 UTC
const TODAY_START = Date.UTC(2026, 2, 15, 0, 0, 0); // 2026-03-15 00:00 UTC

function card(overrides: Partial<DeckCardInput> & { id: number }): DeckCardInput {
  return {
    front: `front-${overrides.id}`,
    back: `back-${overrides.id}`,
    repetitions: 0,
    nextReview: new Date(NOW).toISOString(),
    createdAt: new Date(NOW).toISOString(),
    ...overrides,
  };
}

const defaults = {
  query: "",
  stageFilter: "all" as const,
  dueFilter: "all" as const,
  sortKey: "oldest" as const,
  startOfTodayMs: TODAY_START,
};

describe("filterDeckCards", () => {
  describe("no filters", () => {
    it("returns all cards in id-asc order by default", () => {
      const cards = [
        card({ id: 3 }),
        card({ id: 1 }),
        card({ id: 2 }),
      ];
      const result = filterDeckCards(cards, defaults);
      expect(result.map((c) => c.id)).toEqual([1, 2, 3]);
    });

    it("returns an empty array when given no cards", () => {
      expect(filterDeckCards([], defaults)).toEqual([]);
    });
  });

  describe("text query", () => {
    it("matches front content case-insensitively", () => {
      const cards = [
        card({ id: 1, front: "Hola Mundo", back: "x" }),
        card({ id: 2, front: "Adios", back: "x" }),
      ];
      const result = filterDeckCards(cards, { ...defaults, query: "hola" });
      expect(result.map((c) => c.id)).toEqual([1]);
    });

    it("matches back content", () => {
      const cards = [
        card({ id: 1, front: "x", back: "Hello World" }),
        card({ id: 2, front: "x", back: "Goodbye" }),
      ];
      const result = filterDeckCards(cards, { ...defaults, query: "world" });
      expect(result.map((c) => c.id)).toEqual([1]);
    });

    it("ignores queries shorter than 2 chars", () => {
      const cards = [card({ id: 1, front: "abc", back: "x" })];
      const result = filterDeckCards(cards, { ...defaults, query: "a" });
      expect(result.map((c) => c.id)).toEqual([1]);
    });

    it("trims and lowercases the query", () => {
      const cards = [
        card({ id: 1, front: "Spanish", back: "x" }),
        card({ id: 2, front: "French", back: "x" }),
      ];
      const result = filterDeckCards(cards, { ...defaults, query: "  SPANISH  " });
      expect(result.map((c) => c.id)).toEqual([1]);
    });

    it("excludes cards that match neither front nor back", () => {
      const cards = [
        card({ id: 1, front: "hola", back: "hello" }),
        card({ id: 2, front: "adios", back: "goodbye" }),
      ];
      const result = filterDeckCards(cards, { ...defaults, query: "quantum" });
      expect(result).toEqual([]);
    });
  });

  describe("stage filter", () => {
    it("filters to New (reps=0)", () => {
      const cards = [
        card({ id: 1, repetitions: 0 }),
        card({ id: 2, repetitions: 1 }),
        card({ id: 3, repetitions: 6 }),
      ];
      const result = filterDeckCards(cards, { ...defaults, stageFilter: "New" });
      expect(result.map((c) => c.id)).toEqual([1]);
    });

    it("filters to Learning (reps 1-2)", () => {
      const cards = [
        card({ id: 1, repetitions: 0 }),
        card({ id: 2, repetitions: 1 }),
        card({ id: 3, repetitions: 2 }),
        card({ id: 4, repetitions: 3 }),
      ];
      const result = filterDeckCards(cards, { ...defaults, stageFilter: "Learning" });
      expect(result.map((c) => c.id)).toEqual([2, 3]);
    });

    it("filters to Reviewing (reps 3-5)", () => {
      const cards = [
        card({ id: 1, repetitions: 2 }),
        card({ id: 2, repetitions: 3 }),
        card({ id: 3, repetitions: 5 }),
        card({ id: 4, repetitions: 6 }),
      ];
      const result = filterDeckCards(cards, { ...defaults, stageFilter: "Reviewing" });
      expect(result.map((c) => c.id)).toEqual([2, 3]);
    });

    it("filters to Mastered (reps >= 6)", () => {
      const cards = [
        card({ id: 1, repetitions: 5 }),
        card({ id: 2, repetitions: 6 }),
        card({ id: 3, repetitions: 100 }),
      ];
      const result = filterDeckCards(cards, { ...defaults, stageFilter: "Mastered" });
      expect(result.map((c) => c.id)).toEqual([2, 3]);
    });
  });

  describe("due filter", () => {
    it("overdue = nextReview < startOfToday", () => {
      const cards = [
        card({ id: 1, nextReview: new Date(TODAY_START - DAY).toISOString() }), // yesterday
        card({ id: 2, nextReview: new Date(TODAY_START).toISOString() }), // exactly midnight today
        card({ id: 3, nextReview: new Date(TODAY_START + DAY).toISOString() }), // tomorrow
      ];
      const result = filterDeckCards(cards, { ...defaults, dueFilter: "overdue" });
      expect(result.map((c) => c.id)).toEqual([1]);
    });

    it("today = startOfToday <= nextReview < startOfToday + 1day", () => {
      const cards = [
        card({ id: 1, nextReview: new Date(TODAY_START - 1).toISOString() }), // just before midnight
        card({ id: 2, nextReview: new Date(TODAY_START).toISOString() }), // exactly midnight
        card({ id: 3, nextReview: new Date(TODAY_START + 5 * 60 * 60 * 1000).toISOString() }), // 5am today
        card({ id: 4, nextReview: new Date(TODAY_START + DAY).toISOString() }), // tomorrow
      ];
      const result = filterDeckCards(cards, { ...defaults, dueFilter: "today" });
      expect(result.map((c) => c.id)).toEqual([2, 3]);
    });

    it("upcoming = nextReview >= startOfToday + 1day", () => {
      const cards = [
        card({ id: 1, nextReview: new Date(TODAY_START + DAY - 1).toISOString() }), // 1ms before tomorrow
        card({ id: 2, nextReview: new Date(TODAY_START + DAY).toISOString() }), // exactly tomorrow
        card({ id: 3, nextReview: new Date(TODAY_START + 7 * DAY).toISOString() }), // next week
      ];
      const result = filterDeckCards(cards, { ...defaults, dueFilter: "upcoming" });
      expect(result.map((c) => c.id)).toEqual([2, 3]);
    });
  });

  describe("sort", () => {
    it("oldest = id asc", () => {
      const cards = [card({ id: 5 }), card({ id: 1 }), card({ id: 3 })];
      const result = filterDeckCards(cards, { ...defaults, sortKey: "oldest" });
      expect(result.map((c) => c.id)).toEqual([1, 3, 5]);
    });

    it("newest = id desc", () => {
      const cards = [card({ id: 1 }), card({ id: 5 }), card({ id: 3 })];
      const result = filterDeckCards(cards, { ...defaults, sortKey: "newest" });
      expect(result.map((c) => c.id)).toEqual([5, 3, 1]);
    });

    it("due = nextReview asc", () => {
      const cards = [
        card({ id: 1, nextReview: new Date(TODAY_START + 3 * DAY).toISOString() }),
        card({ id: 2, nextReview: new Date(TODAY_START - DAY).toISOString() }), // overdue
        card({ id: 3, nextReview: new Date(TODAY_START + DAY).toISOString() }),
      ];
      const result = filterDeckCards(cards, { ...defaults, sortKey: "due" });
      expect(result.map((c) => c.id)).toEqual([2, 3, 1]);
    });

    it("stage = repetitions asc, ties broken by id asc", () => {
      const cards = [
        card({ id: 3, repetitions: 0 }),
        card({ id: 1, repetitions: 5 }),
        card({ id: 2, repetitions: 0 }),
        card({ id: 4, repetitions: 5 }),
      ];
      const result = filterDeckCards(cards, { ...defaults, sortKey: "stage" });
      expect(result.map((c) => c.id)).toEqual([2, 3, 1, 4]);
    });
  });

  describe("combined filters", () => {
    it("text + stage + due narrow together", () => {
      const cards = [
        card({ id: 1, front: "hola", back: "hello", repetitions: 0, nextReview: new Date(TODAY_START - DAY).toISOString() }),
        card({ id: 2, front: "hola mundo", back: "x", repetitions: 1, nextReview: new Date(TODAY_START - DAY).toISOString() }),
        card({ id: 3, front: "hola", back: "x", repetitions: 0, nextReview: new Date(TODAY_START + 2 * DAY).toISOString() }),
      ];
      const result = filterDeckCards(cards, {
        ...defaults,
        query: "hola",
        stageFilter: "New",
        dueFilter: "overdue",
      });
      expect(result.map((c) => c.id)).toEqual([1]);
    });
  });

  describe("date input formats", () => {
    it("accepts Date objects", () => {
      const cards = [
        card({
          id: 1,
          nextReview: new Date(TODAY_START - DAY),
          createdAt: new Date(NOW),
        }),
      ];
      const result = filterDeckCards(cards, { ...defaults, dueFilter: "overdue" });
      expect(result.map((c) => c.id)).toEqual([1]);
    });

    it("accepts epoch ms numbers", () => {
      const cards = [
        card({
          id: 1,
          nextReview: TODAY_START - DAY,
          createdAt: NOW,
        }),
      ];
      const result = filterDeckCards(cards, { ...defaults, dueFilter: "overdue" });
      expect(result.map((c) => c.id)).toEqual([1]);
    });
  });
});

describe("isFilterActive", () => {
  it("is false with all defaults", () => {
    expect(isFilterActive({
      query: "",
      stageFilter: "all",
      dueFilter: "all",
      sortKey: "newest",
    })).toBe(false);
  });

  it("is true when query has text", () => {
    expect(isFilterActive({
      query: "hola",
      stageFilter: "all",
      dueFilter: "all",
      sortKey: "oldest",
    })).toBe(true);
  });

  it("is true when stage filter is set", () => {
    expect(isFilterActive({
      query: "",
      stageFilter: "Learning",
      dueFilter: "all",
      sortKey: "oldest",
    })).toBe(true);
  });

  it("is true when due filter is set", () => {
    expect(isFilterActive({
      query: "",
      stageFilter: "all",
      dueFilter: "today",
      sortKey: "oldest",
    })).toBe(true);
  });

  it("sortKey alone does not activate the clear button", () => {
    expect(isFilterActive({
      query: "",
      stageFilter: "all",
      dueFilter: "all",
      sortKey: "due",
    })).toBe(false);
  });

  it("ignores whitespace-only query", () => {
    expect(isFilterActive({
      query: "   ",
      stageFilter: "all",
      dueFilter: "all",
      sortKey: "oldest",
    })).toBe(false);
  });
});