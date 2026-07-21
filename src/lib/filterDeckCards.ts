import { getCardTier, type CardTier } from "@/lib/memoryStage";

// ── Filter option types ─────────────────────────────────────────────────────

export type StageFilter = CardTier | "all";
export type DueFilter = "all" | "overdue" | "today" | "upcoming";
export type CardSortKey = "oldest" | "newest" | "due" | "stage";

export interface FilterDeckCardsOptions {
  query: string;
  stageFilter: StageFilter;
  dueFilter: DueFilter;
  sortKey: CardSortKey;
  /** Start-of-today in ms (midnight in the user's tz). Fixed in tests. */
  startOfTodayMs: number;
}

// ── Input type ───────────────────────────────────────────────────────────────
// Accepts the shape that comes back from the /api/decks/:id endpoint (string
// dates from JSON) plus the raw Drizzle row (Date objects) by normalizing both
// to epoch ms internally. Keeps the function usable from any caller.

export interface DeckCardInput {
  id: number;
  front: string;
  back: string;
  repetitions: number;
  nextReview: string | number | Date;
  createdAt: string | number | Date;
}

export interface DeckCardOutput {
  id: number;
  front: string;
  back: string;
  repetitions: number;
  nextReviewMs: number;
  createdAtMs: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toMs(value: string | number | Date): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Filter and sort a deck's cards in-memory. Pure: no IO, no globals. All
 * time-dependent comparisons are parameterized via `startOfTodayMs` so the
 * function is deterministic under test.
 *
 * Due-status buckets:
 *   - overdue:  nextReview < startOfTodayMs
 *   - today:    startOfTodayMs <= nextReview < startOfTodayMs + 1 day
 *   - upcoming: nextReview >= startOfTodayMs + 1 day
 */
export function filterDeckCards(
  cards: DeckCardInput[],
  opts: FilterDeckCardsOptions
): DeckCardOutput[] {
  const trimmedQuery = opts.query.trim().toLowerCase();
  const tomorrowMs = opts.startOfTodayMs + MS_PER_DAY;

  const out: DeckCardOutput[] = [];

  for (const card of cards) {
    const nextReviewMs = toMs(card.nextReview);
    const createdAtMs = toMs(card.createdAt);

    if (trimmedQuery.length >= 2) {
      const front = card.front.toLowerCase();
      const back = card.back.toLowerCase();
      if (!front.includes(trimmedQuery) && !back.includes(trimmedQuery)) {
        continue;
      }
    }

    if (opts.stageFilter !== "all") {
      if (getCardTier(card.repetitions) !== opts.stageFilter) continue;
    }

    if (opts.dueFilter !== "all") {
      if (opts.dueFilter === "overdue" && nextReviewMs >= opts.startOfTodayMs) continue;
      if (opts.dueFilter === "today" && (nextReviewMs < opts.startOfTodayMs || nextReviewMs >= tomorrowMs)) continue;
      if (opts.dueFilter === "upcoming" && nextReviewMs < tomorrowMs) continue;
    }

    out.push({
      id: card.id,
      front: card.front,
      back: card.back,
      repetitions: card.repetitions,
      nextReviewMs,
      createdAtMs,
    });
  }

  switch (opts.sortKey) {
    case "newest":
      out.sort((a, b) => b.id - a.id);
      break;
    case "due":
      out.sort((a, b) => a.nextReviewMs - b.nextReviewMs);
      break;
    case "stage":
      out.sort((a, b) => a.repetitions - b.repetitions || a.id - b.id);
      break;
    case "oldest":
    default:
      out.sort((a, b) => a.id - b.id);
      break;
  }

  return out;
}

/** True when any filter is set away from its default. */
export function isFilterActive(opts: {
  query: string;
  stageFilter: StageFilter;
  dueFilter: DueFilter;
  sortKey: CardSortKey;
}): boolean {
  return (
    opts.query.trim().length > 0 ||
    opts.stageFilter !== "all" ||
    opts.dueFilter !== "all"
    // sortKey is not a "filter" — changing it alone doesn't activate the
    // clear button. The user may always want their preferred sort.
  );
}