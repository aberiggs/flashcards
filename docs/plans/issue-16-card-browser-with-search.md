# Issue #16 Plan: Card Browser with Search

Issue: https://github.com/aberiggs/flashcards/issues/16

## Goal

Make it fast to find and open a specific card within a deck. Today the deck
detail page renders every card as a `CardPreview` tile and forces the user to
scroll, open, then edit one at a time. Add a searchable, filterable card list
to the existing `/decks/[id]` page that reuses the current view/edit modal flow.

## Scope (confirmed with user)

- **Surface:** Enhance the existing deck detail page at
  `src/app/(protected)/decks/[id]/page.tsx`. No new `/cards` route.
- **Filters:** Text search (front/back), memory stage (New / Learning /
  Reviewing / Mastered), and due status (Overdue / Due today / Upcoming). No
  tag filter — tags are deferred to a separate issue (no `tags` column exists
  yet; a schema migration is out of scope here).
- **Edit UX:** Reuse the existing `CardViewerModal` + `CardEditForm` for
  view/edit. Do not build new inline or side-panel editors in this PR.
- **Responsive:** Works on mobile (filter row collapses to a compact
  control; list is a single column; tiles stay tappable).

## Non-goals

- Cross-deck browsing (no `/cards` page).
- Tag filter / tag schema (separate issue).
- Bulk multi-select / bulk delete / bulk tag (issue mentions as future
  extension).
- Replacing the existing card grid for users with no filter applied — the
  grid remains the default view; the browser is additive.

## Design

Replace the current static "Cards" section (the tile grid at
`src/app/(protected)/decks/[id]/page.tsx:349-391`) with a richer section that
has three pieces stacked vertically:

1. **Filter bar** — a single row of compact controls:
   - Text search input (debounced, reuses the same ILIKE semantics as the
     global `search` query but applied client-side to the deck's already-
     loaded cards — no new endpoint needed for the in-deck text filter).
   - Memory stage dropdown (All / New / Learning / Reviewing / Mastered).
   - Due status dropdown (All / Overdue / Due today / Upcoming).
   - Clear-filters button (visible only when any filter is active).
2. **Result count + sort** — a one-line summary ("12 of 45 cards") with a
   sort dropdown (Newest first / Oldest first / Due first / Stage asc). Keep
   the existing "Add Card" button on the right.
3. **Card list** — the existing `CardPreview` tile grid, now rendering only
   the filtered subset. Clicking a tile opens `CardViewerModal` exactly as
   it does today; the modal receives the **filtered** card list so
   left/right arrow navigation walks the filtered set, not the full deck.

Filtering and sorting happen client-side against the cards already loaded
by `useDeck(deckId)`. No new backend endpoint, no new hook, no schema change.
Memory stage is derived from `repetitions` via the existing
`getMemoryStage` helper in `src/lib/memoryStage.ts`. Due status is derived
from `nextReview` vs `now()` (and the start-of-today boundary for "Due
today" vs "Overdue").

## Implementation Plan

### 1. Add a `useFilteredDeckCards` memo in the deck detail page

Pure client-side derivation, no separate file. Inside
`src/app/(protected)/decks/[id]/page.tsx`:

- Add state: `query`, `stageFilter` (`MemoryStage | 'all'`),
  `dueFilter` (`'all' | 'overdue' | 'today' | 'upcoming'`), `sortKey`
  (`'newest' | 'oldest' | 'due' | 'stage'`).
- Add a debounced `query` (reuse the `useDebounce` pattern from
  `SearchBar.tsx:31-38` — extract it to `src/lib/useDebounce.ts` so both
  files share it, or inline a second copy; prefer extraction since the
  rule is "don't copy bad patterns").
- Compute `filteredCards` with `useMemo` from `cards`, the debounced
  query, `stageFilter`, `dueFilter`, and `sortKey`.
- Pass `filteredCards` (not the full `cards`) into `CardViewerModal`'s
  `cards` prop and to the grid's `.map`.

### 2. Build a `CardBrowserFilters` component

New file: `src/components/features/decks/CardBrowserFilters.tsx` (client
component, following `.ai/skills/building-client-component/SKILL.md`).

Props interface:
```ts
interface CardBrowserFiltersProps {
  query: string;
  onQueryChange: (v: string) => void;
  stageFilter: MemoryStage | 'all';
  onStageFilterChange: (v: MemoryStage | 'all') => void;
  dueFilter: 'all' | 'overdue' | 'today' | 'upcoming';
  onDueFilterChange: (v: 'all' | 'overdue' | 'today' | 'upcoming') => void;
  sortKey: 'newest' | 'oldest' | 'due' | 'stage';
  onSortKeyChange: (v: 'newest' | 'oldest' | 'due' | 'stage') => void;
  totalCount: number;
  filteredCount: number;
  onClear: () => void;
}
```

Renders the filter bar described in the Design section. Uses Tailwind v4
tokens (`bg-surface-secondary`, `border-border-primary`,
`text-text-tertiary`, `focus:ring-accent-primary`), Lucide icons with
`aria-hidden`, and `aria-label`s on icon-only buttons. Each dropdown is a
native `<select>` styled to match the existing
`bg-surface-secondary border-border-primary` inputs — no custom listbox
needed.

### 3. Extract `useDebounce`

Move the `useDebounce` function from
`src/components/layout/SearchBar.tsx:31-38` into
`src/lib/useDebounce.ts` (named export). Re-export from SearchBar's old
location is not needed — update the one import in `SearchBar.tsx` and the
new import in the deck detail page. Keeps the rule "don't copy bad
patterns."

### 4. Update the deck detail page

In `src/app/(protected)/decks/[id]/page.tsx`:

- Replace the "Section C: Card Browser" block (lines 349-391) with:
  - `<CardBrowserFilters ... />` at the top.
  - The existing `Add Card` button row (moved into the filters' right
    slot or kept as a sibling — whichever is cleaner).
  - The `CardPreview` grid, mapped over `filteredCards` instead of `cards`.
  - An empty state when `filteredCards.length === 0` but
    `cards.length > 0` (i.e. filters excluded everything): a short "No
    cards match these filters" message plus a Clear button.
  - Keep the existing empty state when `cards.length === 0` (no cards in
    deck yet).
- Update the `CardViewerModal` `cards` prop to receive `filteredCards` so
  arrow-key navigation walks the filtered set. Track
  `viewingCardIndex` against `filteredCards`, not the full list.
- When filters change while the viewer is open, close the viewer to avoid
  index drift (an effect that watches `query`/`stageFilter`/`dueFilter`/
  `sortKey` and calls `setViewingCardIndex(null)`).

### 5. Sorting rules

- **Newest first** (default): `createdAt desc` — matches current order
  when no sort is applied? Current order is `cards.id asc` (see
  `getDeckWithCards` in `src/server/queries/decks.ts:73`). Switch the
  default sort to match the existing order (id asc → effectively "Oldest
  first") so the PR doesn't reorder the deck for users who never touch the
  sort dropdown. Default `sortKey = 'oldest'`.
- **Oldest first**: `id asc` (current behavior).
- **Newest first**: `id desc`.
- **Due first**: `nextReview asc` (overdue/due first, then upcoming).
- **Stage asc**: order by `repetitions asc` (New → Mastered).

### 6. No backend changes

No new Route Handler, no new query function, no hook, no schema
migration. The deck cards are already loaded by `useDeck(deckId)` and
include `repetitions`, `nextReview`, `createdAt` — everything the filters
and sorts need.

## Tests

This PR is mostly client-side filtering logic. Per `.ai/rules/do-not.md`
the test stack is Vitest; pure-logic tests belong in `tests/unit/`. The
filter/sort derivation is a pure function — extract it so it's testable.

### 7. Extract `filterDeckCards`

New file: `src/lib/filterDeckCards.ts` exporting:

```ts
export type StageFilter = MemoryStage | 'all';
export type DueFilter = 'all' | 'overdue' | 'today' | 'upcoming';
export type CardSortKey = 'newest' | 'oldest' | 'due' | 'stage';

export function filterDeckCards(cards: DeckCard[], opts: {
  query: string;
  stageFilter: StageFilter;
  dueFilter: DueFilter;
  sortKey: CardSortKey;
  now: number;          // pass Date.now() from caller; deterministic in tests
  startOfTodayMs: number; // computed once per render, passed in for testability
}): DeckCard[];
```

`DeckCard` is a minimal local type (the fields the filter needs:
`id`, `front`, `back`, `repetitions`, `nextReview`, `createdAt`). Don't
import the `Card` type from `src/lib/hooks.ts` (it's the API response
shape with string dates) — define a small input type that both the page's
`Card[]` and the test fixtures can satisfy, or just accept `Card[]` and
coerce `nextReview`/`createdAt` from string to number inside the
function. Pick whichever is less awkward; prefer not introducing a
parallel type.

### 8. Unit tests for `filterDeckCards`

New file: `tests/unit/filterDeckCards.test.ts`. Cover:

- Empty query + `stageFilter='all'` + `dueFilter='all'` returns all cards
  in id-asc order.
- Text query matches front (case-insensitive), matches back, matches
  neither → excluded.
- `stageFilter='learning'` keeps only cards with `repetitions` 1 or 2.
- `dueFilter='overdue'` keeps `nextReview < startOfTodayMs`.
- `dueFilter='today'` keeps `startOfTodayMs <= nextReview < startOfTodayMs
  + 1day`.
- `dueFilter='upcoming'` keeps `nextReview >= startOfTodayMs + 1day`.
- `sortKey='due'` orders by `nextReview asc`.
- `sortKey='stage'` orders by `repetitions asc`.
- `sortKey='newest'` orders by `id desc`.
- Combined: text + stage + due filter narrows correctly.

These are pure-logic tests — no Postgres, no testcontainers, fast.

### 9. No new route-handler or server-query tests

No backend changed.

## Explicit Decisions (for review later)

- **Decision:** Filter and sort client-side against `useDeck`'s already-
  loaded cards.
  - **Why:** The deck's cards are already fully loaded; sending a new
    request per keystroke would be slower and would need a new endpoint.
    Decks are bounded by `MAX_CARDS_PER_DECK` (see `src/lib/limits.ts`),
    so the client-side cost is bounded.
  - **Revisit:** If users routinely hit the per-deck cap and complain
    about jank, move filtering to the server with pagination.

- **Decision:** Default `sortKey = 'oldest'` to preserve current behavior.
  - **Why:** The PR should not reorder a user's cards out of the box.
  - **Revisit:** If a "newest first" default is requested, flip it.

- **Decision:** When filters change while the viewer modal is open,
  close the modal rather than try to keep the current card in view.
  - **Why:** Keeping the index in sync across a shrinking/growing list is
    fiddly and error-prone; closing is predictable.
  - **Revisit:** If users report this as annoying, track the open card by
    id instead of by index and re-resolve after filtering.

- **Decision:** Use native `<select>` for the filter dropdowns.
  - **Why:** The existing `SearchBar` builds a custom listbox only because
    it needs grouped, navigable results. Filters here are short static
    lists; a native select is accessible, keyboard-friendly, and far
    less code.
  - **Revisit:** If design wants custom styling that `<select>` can't
    express, revisit with a shared `Select` primitive.

- **Decision:** Tags deferred.
  - **Why:** No tags schema exists; adding one is a separate,
  schema-migration-sized piece of work the user explicitly opted out of
  for this PR.
  - **Revisit:** Open a follow-up issue for `tags text[]` on `cards` (or a
  `tags` + `card_tags` join) + a tag filter dropdown.

## Validation Checklist

- [ ] Text search filters cards by front and back content (case-insensitive).
- [ ] Memory stage dropdown filters to the selected stage.
- [ ] Due status dropdown filters to overdue / due today / upcoming.
- [ ] Sort dropdown reorders the grid (oldest / newest / due first / stage asc).
- [ ] Result count ("X of Y cards") reflects the active filters.
- [ ] Clear filters button resets all filters to their defaults.
- [ ] Clicking a filtered tile opens `CardViewerModal` walking the
      filtered list, not the full deck.
- [ ] Changing filters while the viewer is open closes the viewer cleanly.
- [ ] Layout works on mobile (single column, controls stack, no horizontal
      overflow).
- [ ] `useDebounce` extracted and shared between `SearchBar` and the new
      filter input.
- [ ] `filterDeckCards` unit tests pass.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes (Docker running for testcontainers).
- [ ] `docs/features.md` updated to mention the in-deck card browser.