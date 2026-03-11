# Flashcards App — Beta Readiness Plan

## Context

The app has a complete core loop: deck/card CRUD, SM-2 spaced repetition, AI card
generation, OAuth auth, dashboard stats, and a polished responsive UI. This plan
addresses the gaps needed for a **public beta**: discoverability (search), data
portability (import/export), abuse prevention (resource caps), user feedback (toasts),
and code quality hardening.

Estimated effort: ~3–4 days.

---

## 1. Global Search

**Problem:** Users have no way to find a specific card or deck without manually browsing.
For anyone with more than a handful of decks, this is a real friction point.

### Backend — `convex/search.ts` (new file)

- `search({ query })` query — accepts a trimmed, lowercased search string (min 2 chars).
  Returns `{ decks: [...], cards: [...] }` where:
  - `decks` match on `name` or `description` (case-insensitive substring)
  - `cards` match on `front` or `back` (case-insensitive substring), returned with
    their parent `deckId` and `deckName` for navigation context
  - Both scoped to the authenticated user
  - Results capped (e.g. 10 decks, 20 cards) to keep the dropdown snappy

At beta scale (50 decks × 500 cards max = 25k cards upper bound), in-memory filtering
is fine. If scale demands it later, Convex full-text search indexes can replace this.

### Frontend — `AppHeader` search bar

- Always-visible search input in the header between nav links and settings icon.
  Collapses to an icon on narrow mobile screens that expands on tap.
- Results appear in a dropdown overlay, grouped into "Decks" and "Cards" sections.
- Deck results: show name and card count. Click navigates to `/decks/[id]`.
- Card results: show truncated front text and parent deck name. Click navigates to
  `/decks/[deckId]` (and optionally opens the card viewer).
- `Cmd/Ctrl+K` keyboard shortcut to focus the search bar from anywhere.
- Debounced input (300ms) to avoid excessive queries while typing.
- Empty state: "No results for '...'" message.
- Close on `Escape`, click outside, or navigation.

### Files involved

| File | Change |
|------|--------|
| `convex/search.ts` | New file — `search` query |
| `convex/schema.ts` | No changes needed (existing indexes suffice) |
| `src/components/layout/AppHeader.tsx` | Add search input + results dropdown |

---

## 2. Import / Export

**Problem:** Users can't get their data in or out. This is a dealbreaker for a public
beta — people won't invest time creating decks if they can't back them up, and Anki/
Quizlet users won't try the app if they can't bring their existing cards.

### Export

Two formats, triggered from the deck detail page (per-deck) and the decks list page
(bulk "Export All"):

**CSV** (interop priority):
- Columns: `front`, `back` — one row per card.
- Filename: `{deck-name}.csv`.
- Standard RFC 4180 CSV with proper quoting/escaping for content containing commas,
  newlines, or quotes.
- "Export All" creates one CSV per deck in a ZIP file (or a single CSV with a `deck`
  column — TBD based on simplicity).

**JSON** (full backup):
- Contains deck metadata (`name`, `description`) and all cards with SM-2 state
  (`front`, `back`, `efactor`, `repetitions`, `nextReview`, `lastStudied`).
- Filename: `{deck-name}.json` or `flashcards-export.json` for bulk.

Export runs **client-side**: data is already available via Convex queries; format in
the browser and trigger a download via `Blob` + `URL.createObjectURL`. No new backend
endpoints needed.

### Import

Accessible from the decks list page via an "Import Deck" button (alongside "Create
Deck").

**CSV import:**
- File picker accepts `.csv` and `.txt`.
- Auto-detect: if first row looks like a header (`front`, `back`, `question`, `answer`,
  or similar), skip it; otherwise treat as data.
- Columns: first = front, second = back. Extra columns ignored.
- Deck name defaults to filename (without extension), editable before confirming.
- Preview: show card count and first few cards before inserting.

**JSON import:**
- Accepts the app's own JSON export format.
- Restores deck with full SM-2 state if present; defaults to new-card state if not.

**Backend — `convex/import.ts` (new file):**
- `importDeck({ name, description?, cards: {front, back, efactor?, repetitions?,
  nextReview?}[] })` mutation — creates a deck and bulk-inserts cards. Subject to
  resource caps (see section 3).

**Validation & feedback:**
- Max file size check client-side (e.g. 5MB).
- Show import summary: "Imported 142 cards into 'Biology 101'".
- Error handling: malformed CSV/JSON shows a clear error message, doesn't silently
  fail or partially import.

### Files involved

| File | Change |
|------|--------|
| `convex/import.ts` | New file — `importDeck` mutation |
| `src/app/(protected)/decks/page.tsx` | Add "Import Deck" button + import modal |
| `src/app/(protected)/decks/[id]/page.tsx` | Add "Export" button to deck header |
| `src/components/features/decks/ImportDeckModal.tsx` | New — file picker, preview, confirm flow |
| `src/components/features/decks/ExportDeckButton.tsx` | New — export format selector + download trigger |

---

## 3. Resource Caps

**Problem:** A public beta is exposed to abuse — automated account creation, bulk card
spam, or runaway AI generation could bloat the database. Need guardrails that don't
penalize legitimate power users.

### Caps

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Decks per user | 50 | Even heavy students rarely have 50+ active subjects |
| Cards per deck | 500 | Large enough for comprehensive courses; prevents single-deck spam |
| Total cards per user | 5,000 | Safety net across all decks |
| AI generations per hour | 10 | User pays via their own API key, but this limits Convex compute abuse |

These are generous for organic use. A student adding 20 cards/day would take 250 days
to hit the total card cap.

### Implementation

**Backend enforcement** — all limits checked server-side in mutations:

- `decks.create`: count user's existing decks; throw if >= 50.
- `cards.create`, `import.importDeck`, `ai.bulkInsertCards`: count cards in the target
  deck; throw if adding would exceed 500. Count total user cards; throw if would
  exceed 5,000.
- `ai.generateCards`: count recent AI generations (last hour) for the user; throw if
  >= 10. This requires tracking generation timestamps — either a lightweight
  `aiGenerations` table or checking `_creationTime` on recently AI-created cards.

**Error messages** — clear and actionable:
- "You've reached the limit of 50 decks. Delete an existing deck to create a new one."
- "This deck has reached the limit of 500 cards. Split your content across multiple
  decks for better organization."
- "You've reached the limit of 5,000 total cards. Remove unused cards to make room."
- "AI generation limit reached (10 per hour). Please try again later."

**Frontend** — display current usage near limits (e.g. "47/50 decks" in the decks
list stats bar). This is optional for the first pass but good UX.

### Files involved

| File | Change |
|------|--------|
| `convex/decks.ts` | Add deck count check in `create` |
| `convex/cards.ts` | Add card count checks in `create` |
| `convex/ai.ts` | Add rate limit check in `generateCards`; add card count check in `bulkInsertCards` |
| `convex/import.ts` | Add card count checks in `importDeck` |
| `convex/schema.ts` | Possibly add `aiGenerations` table (or use existing data) |
| `src/app/(protected)/decks/page.tsx` | Show usage near limits (optional) |

---

## 4. Toast Notifications

**Problem:** Mutation feedback is inconsistent — some actions show inline errors, some
show nothing on success. For a public-facing app, users need clear confirmation that
their actions worked (or didn't).

### Implementation — lightweight custom system

No third-party library. A simple context + component:

- `ToastProvider` context wrapping the app (in root layout or `ConvexClientProvider`).
- `useToast()` hook returning `{ toast(message, type?) }` where type is `success`,
  `error`, or `info`.
- `ToastContainer` component rendering a stack of toasts in the bottom-right corner.
  Each toast auto-dismisses after 4 seconds. Dismiss on click. Simple slide-in
  animation via CSS transitions.
- Styled with existing CSS custom properties (`--surface-primary`, `--accent-primary`,
  `--status-danger`, etc.).

### Usage

Add toast calls to key mutation flows:

- Deck created / deleted -> success toast
- Card saved / deleted -> success toast
- Import complete -> success toast with count ("Imported 25 cards")
- AI generation complete -> success toast
- Export complete -> success toast
- API key saved / removed -> success toast
- Mutation errors -> error toast (replace inline `setError` patterns where appropriate)
- Resource cap hit -> error toast with actionable message

### Files involved

| File | Change |
|------|--------|
| `src/components/ui/Toast.tsx` | New — `ToastProvider`, `useToast`, `ToastContainer` |
| `src/app/layout.tsx` | Wrap app in `ToastProvider` |
| Various pages/components | Add `useToast()` calls alongside mutations |

---

## 5. Code Quality & Robustness

Issues identified during codebase review, grouped by priority.

### Error handling & data integrity (high)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 1 | `handleSaveName`, `handleSaveDescription` have no try/catch — mutation failures are unhandled | Wrap in try/catch, show error toast | `decks/[id]/page.tsx` |
| 2 | `handleDeleteDeckConfirm`, `handleDeleteCardConfirm` have no try/catch | Same — wrap + error toast | `decks/[id]/page.tsx` |
| 3 | Delete buttons have no loading/disabled state — double-click possible | Add `isDeleting` state, disable button during mutation | `decks/[id]/page.tsx` |
| 4 | `decks.remove` doesn't cascade-delete `studySessions` and `studyEvents` | Delete sessions and events referencing the deck | `convex/decks.ts` |
| 5 | `sessions.recordEvent` doesn't verify session ownership | Add ownership check — verify session's `userId` matches caller | `convex/sessions.ts` |

### Type safety & code hygiene (medium)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 6 | `any` type in `ai.ts` line 82 (`(card: any)`) | Type as return type of `getByDeckInternal` | `convex/ai.ts` |
| 7 | `DeckStats` type in `flashcards.ts` is unused | Remove the type (or the entire file if empty) | `src/types/flashcards.ts` |
| 8 | `getMemoryStage` is duplicated in `convex/stats.ts` and `decks/[id]/page.tsx` | Extract to a shared utility (e.g. `src/lib/memoryStage.ts` used by the frontend, keep the Convex copy for backend) | Both files |
| 9 | `ConvexClientProvider` has `verbose: true` unconditionally | Make conditional: `process.env.NODE_ENV === 'development'` | `ConvexClientProvider.tsx` |

### Convention consistency (low)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 10 | `ConvexClientProvider.tsx` uses `"use client"` (double quotes) | Change to `'use client'` (single quotes) | `ConvexClientProvider.tsx` |
| 11 | `DeckCard.tsx` missing `'use client'` directive | Add directive | `DeckCard.tsx` |

---

## 6. Roadmap Updates

Alongside implementation, update `docs/roadmap.md`:

### Move to Implemented
- Global search
- Import / export (CSV + JSON)
- Resource caps
- Toast notifications

### Remove from Future Ideas
- ~~Beta gate~~ — replaced by resource caps
- ~~Configurable intervals~~ — SM-2 is well-established; exposing params would confuse
  more than help. If scheduling changes are needed later, switching algorithms (e.g.
  FSRS) is a better path.
- ~~Cram mode~~ — the existing card viewer already supports free browsing outside SRS

### Add to Future Ideas
- **Card level badges & sorting** — Show memory stage badges (New, Learning, Reviewing,
  Mastered) on card tiles in the deck view. Add sort options for the card list: by
  level ascending/descending, next review date, date added, alphabetical.

---

## Implementation Order

| Phase | Work | Effort |
|-------|------|--------|
| A | Toast notification system (needed by everything else) | 2–3 hrs |
| B | Code quality fixes (#1–11 from section 5) | 3–4 hrs |
| C | Resource caps (backend enforcement + error messages) | 3–4 hrs |
| D | Global search (backend query + header search bar) | 4–5 hrs |
| E | Export (CSV + JSON, per-deck + bulk) | 3–4 hrs |
| F | Import (CSV + JSON, modal with preview) | 4–5 hrs |
| G | Roadmap updates | 30 min |

Phases A–C are foundational (toasts feed into everything; code quality fixes prevent
bugs; caps must exist before import). Phases D–F are independent features that can be
done in any order. Phase G is done last to reflect final state.

---

## Verification

- **Search:** Create 5+ decks with varied names. Type partial name in search bar —
  verify matching decks appear. Create cards with distinctive text — verify card search
  finds them with correct parent deck. Test `Cmd+K` shortcut. Test on mobile (icon
  expand).
- **Export:** Export a deck as CSV, open in a spreadsheet — verify front/back columns.
  Export as JSON — verify it contains SM-2 state. Export all decks — verify ZIP or
  combined file contains all decks.
- **Import:** Export a deck as CSV, delete it, import the CSV — verify card count
  matches. Try importing an Anki-exported CSV. Try importing malformed CSV — verify
  clear error. Test JSON round-trip (export -> delete -> import -> verify SM-2 state
  preserved).
- **Resource caps:** Create decks until hitting the limit — verify clear error message.
  Try importing a 600-card CSV into a deck — verify it's rejected with explanation.
  Hit AI generation limit — verify rate limit message.
- **Toasts:** Perform each mutation type (create/delete deck, save/delete card, import,
  export, AI generate) — verify toast appears with appropriate message. Trigger an
  error — verify error toast. Verify toasts auto-dismiss and are dismissible by click.
- **Code quality:** Run `npx tsc --noEmit` and `npm run lint` — zero errors. Delete a
  deck — verify no orphaned sessions/events remain. Double-click delete — verify
  button is disabled during mutation.
