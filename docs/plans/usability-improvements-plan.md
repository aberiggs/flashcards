# Desktop & Mobile Usability Improvements Plan

> **Branch focus:** Improve usability across desktop and mobile browsers, clean up UI
> leftover artifacts, and refine the beta experience.

---

## Tasks

### 1. OpenAI API Key Guidance

- [ ] **GenerateCardsModal** (`src/components/features/decks/GenerateCardsModal.tsx` ~line 401):
      Add a secondary helper link below the "Add API Key in Settings" button —
      "Don't have a key? Learn how to get one" linking to
      `https://platform.openai.com/api-keys`
- [ ] **Options page** (`src/app/(protected)/options/page.tsx` ~line 82): Add a link in
      the AI Card Generation description text —
      "Get your API key from OpenAI's dashboard" linking to
      `https://platform.openai.com/api-keys`

### 2. Fix Export Dropdown Clipping on Mobile

- [ ] **ExportDeckButton** (`src/components/features/decks/ExportDeckButton.tsx` line 72):
      Change dropdown positioning from `right-0` to `left-0 sm:left-auto sm:right-0`.
      On mobile the deck header buttons are left-aligned (parent uses `flex-col`), so
      the dropdown should open rightward. On `sm+` the buttons are right-aligned, so
      `right-0` keeps the current desktop behavior.

### 3. Usage Limits Info Button + Modal (Decks Page)

- [ ] Add an `Info` icon button (Lucide `Info`) in the stats summary card on the decks
      list page (`src/app/(protected)/decks/page.tsx` ~line 78), next to the Import
      button.
- [ ] Clicking the info button opens a `Modal` (existing component, size `"md"`)
      explaining:
  - Flashcards is currently in beta with usage limits in place
  - Current usage pulled from the `getLimits` query (see task 5) and live deck/card
    counts: e.g., "You have X of 50 decks and Y of 5,000 cards"
  - Contact: "If you run into an issue or would like to request increased limits,
    please reach out at aberiggsiv@gmail.com"

### 4. Raise AI Generation Cap (50 → 100)

- [ ] `convex/ai.ts` line 8: change `MAX_CARDS = 50` → `MAX_CARDS = 100`
- [ ] `convex/ai.ts` line 10: change `AUTO_MAX_CARDS = 50` → `AUTO_MAX_CARDS = 100`
- [ ] `convex/ai.ts` ~line 159: increase `max_tokens` from `4000` → `8000` to
      accommodate larger generations
- [ ] `GenerateCardsModal.tsx`: update the card count selector UI to allow selecting
      up to 100 (currently capped at 50)

### 5. Sync Limit Constants via Convex Query

- [ ] Add a `getLimits` query to `convex/limits.ts` that returns
      `{ maxDecks, maxCardsPerDeck, maxCardsPerUser }` (no auth required — these are
      public constants)
- [ ] Update `src/app/(protected)/decks/page.tsx`: replace hardcoded
      `MAX_DECKS = 50` / `MAX_CARDS = 5_000` (lines 59-60) with values from
      `useQuery(api.limits.getLimits)`
- [ ] The info modal (task 3) also uses these queried values

### 6. Clean Up Options Page

- [ ] **Remove "Theme Preview" section** (`options/page.tsx` lines 121-201): color
      palette and text color swatches — leftover dev/testing artifact
- [ ] **Remove "Component Examples" section** (`options/page.tsx` lines 203-249):
      button and card examples — leftover dev/testing artifact
- [ ] **Clean up "About" section** (`options/page.tsx` lines 251-271): replace
      current content with just:
  - Version: `0.1.0`
  - Contact: `aberiggsiv@gmail.com`
  - Remove "Theme System", "Features", "Storage" lines

### 7. General Mobile Audit

- [ ] Quick pass on other interactive elements (search results dropdown, AI modal
      card count selector, mobile drawer) to verify no similar clipping/overflow
      issues exist
- [ ] Fix any issues found

### 8. Clean Up Landing Page (Logged-Out)

- [ ] **Replace feature cards** (`src/app/page.tsx` lines 95-124) with user-facing
      highlights:
  1. "Create & Organize" — Create decks and cards in seconds. Import existing sets
     or generate cards with AI from any topic or notes.
  2. "Smart Scheduling" — Spaced repetition automatically schedules your reviews so
     you study at the right time to remember long-term.
  3. "Track Your Progress" — See what's due, monitor your study streak, and watch
     your mastery grow with detailed stats.
  4. "AI-Powered Generation" — Paste your notes or enter a topic and let AI create
     flashcards for you. Review and approve each card before adding.
- [ ] **Update subtitle** (line 87): replace "SM-2" with "spaced repetition"

---

## Implementation Order

1. **Task 5** — Sync limits (backend query) — foundation for tasks 3 and 4
2. **Task 4** — Raise AI generation cap — small backend change
3. **Task 2** — Fix export dropdown clipping — quick CSS fix
4. **Task 1** — Add OpenAI API key guidance links
5. **Task 6** — Clean up Options page
6. **Task 8** — Clean up landing page
7. **Task 3** — Info button + modal on decks page (depends on task 5)
8. **Task 7** — General mobile audit

## Verification

- `npm run lint` — no lint errors
- `npx tsc --noEmit` — no type errors
- `npx tsc --noEmit --project convex/tsconfig.json` — Convex types clean
- Manual check on mobile viewport (320px-428px) for dropdown and layout issues
- Manual check that info modal displays correct limit values
