# Flashcards App — Next Stage Plan

## Context

The app is a Next.js 15 + Convex flashcard tool with SM-2 spaced repetition, deck/card CRUD, GitHub OAuth, and basic dashboard charts (memory stages, review forecast). To reach early beta, it needs richer study tracking and gamification to make studying feel rewarding, an AI card generation feature as a differentiator, Google auth for broader access, and a path to production deployment.

---

## 1. Study Session History & Gamification Stats (Top Priority)

**Problem:** No study history is persisted — can't show streaks, accuracy, or activity over time.

### Schema changes — `convex/schema.ts`

Add three new tables:

```
studySessions: userId, deckId, startedAt, completedAt?, cardsStudied, cardsCorrect, cardsIncorrect
  indexes: by_user [userId], by_user_started [userId, startedAt]

studyEvents: userId, sessionId, cardId, deckId, quality, timestamp
  indexes: by_session [sessionId], by_user_timestamp [userId, timestamp]

userSettings: userId, openAiApiKey?
  indexes: by_user [userId]
```

(`userSettings` is shared with the AI feature in section 2)

### New backend file — `convex/sessions.ts`

- `startSession({ deckId })` — creates a session doc when study begins
- `completeSession({ sessionId, cardsStudied, cardsCorrect, cardsIncorrect })` — marks session done
- `recordEvent({ sessionId, cardId, deckId, quality })` — logs each card review

### Study page integration — `src/app/(protected)/decks/[id]/study/page.tsx`

- Call `startSession` when `sessionCards` is frozen (existing useEffect)
- Call `recordEvent` alongside existing `recordReview` in `handleConfidence`
- Track correct/incorrect counts in React state (quality >= 3 = correct)
- Call `completeSession` when session ends
- Show accuracy summary on session complete screen ("8/10 correct")

### New stats queries — `convex/stats.ts`

- `gamificationStats({ timeZone })` — returns: streak (consecutive days with completed sessions), todayCards, weekCards, accuracyRate (%)
- `activityHistory({ timeZone })` — returns 90 days of per-day card counts for heatmap

Reuses existing `getStartOfTodayInTimezone` helper and `MS_PER_DAY` constant.

### New dashboard widgets — `src/components/features/dashboard/`

- **`StreakWidget.tsx`** — large streak number + flame icon, sub-stats for today's cards / week's cards / accuracy rate
- **`ActivityHeatmapWidget.tsx`** — 90-day grid (like GitHub contributions), pure CSS grid with intensity-based coloring using existing `--chart-*` CSS variables

### Dashboard layout update — `src/app/page.tsx`

- Add `gamificationStats` and `activityHistory` queries
- Layout: StreakWidget spans full width at top, then ActivityHeatmap full width, then existing MemoryStages + ReviewForecast in 2-col grid below

---

## 2. AI Card Generation

**Problem:** Creating cards manually is tedious — this is the #1 UX pain point the app aims to solve.

### API key management — `convex/settings.ts` (new file)

- `get()` query — returns `{ hasApiKey, apiKeyHint: "sk-...XXXX" }` (never exposes full key to client)
- `getInternal({ userId })` internalQuery — returns raw key (server-side only)
- `saveApiKey({ apiKey })` mutation — upserts into `userSettings`
- `removeApiKey()` mutation

### AI action — `convex/ai.ts` (new file)

- `generateCards({ deckId, prompt, count? })` — Convex **action** (can make HTTP calls)
  - Fetches user's API key via `getInternal`
  - Calls OpenAI `gpt-4o-mini` with a system prompt to generate `[{front, back}]` JSON
  - Returns parsed card array to the client for preview (does NOT auto-insert)
- `insertGeneratedCards({ deckId, cards })` — action that calls `bulkInsertCards` internal mutation
- `bulkInsertCards` — internalMutation to batch-insert confirmed cards

### Options page — `src/app/(protected)/options/page.tsx`

- Add "AI Card Generation" section with API key input (password field), save/remove buttons, hint display

### Generate Cards modal — `src/components/features/decks/GenerateCardsModal.tsx` (new file)

- Phase flow: Input (topic or paste notes + count selector) → Generating (loading) → Preview (editable card list, can remove individual cards) → Insert → Done
- If no API key set, show banner linking to `/options`

### Deck detail page — `src/app/(protected)/decks/[id]/page.tsx`

- Add "Generate with AI" button (Sparkles icon from lucide-react) next to existing card management UI
- Opens `GenerateCardsModal`

---

## 3. Google OAuth

### `convex/auth.ts`

Add `import Google from "@auth/core/providers/google"` and include in providers array. One-line change.

### `src/app/page.tsx`

Add "Sign in with Google" button with Google logo SVG below the GitHub button, with an "or" divider between them.

### Environment variables (Convex dashboard)

Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Create Google OAuth credentials in Google Cloud Console with redirect URI: `https://<convex-site>.convex.site/api/auth/callback/google`

---

## 4. Markdown Support for Cards

### Install dependency

`npm install react-markdown`

### Shared component — `src/components/ui/MarkdownContent.tsx` (new file)

Thin wrapper around `react-markdown` with themed component overrides (p, strong, em, ul, ol, code) using existing CSS custom property colors. No `rehypeRaw` — only standard markdown syntax for security.

### Integration points

- `src/components/features/decks/CardViewerModal.tsx` — render front/back through `<MarkdownContent>`
- `src/app/(protected)/decks/[id]/study/page.tsx` — same
- `src/components/features/decks/CardPreview.tsx` — keep as plain text (line-clamp doesn't work with rendered HTML)

### Formatting hints

Add a small static hint row (`**bold** *italic* - list`) above card textareas in the add/edit card forms on the deck detail page.

---

## 5. Production Deployment

### `.env.example` (new file)

Document all required env vars with comments explaining which go in `.env.local` vs Convex dashboard.

### GitHub Actions — `.github/workflows/deploy.yml` (new file)

- **check** job (on push + PR): `npm ci`, `npm run lint`, `npx tsc --noEmit`
- **deploy** job (on push to main): `npx convex deploy --cmd 'npm run build'` using `CONVEX_DEPLOY_KEY` secret

### Vercel setup (manual steps)

- Create Vercel project from GitHub repo
- Set `NEXT_PUBLIC_CONVEX_URL` to production Convex deployment URL
- Update OAuth redirect URIs in GitHub and Google to production Convex site URL

### `docs/build.md`

Add "Production Deployment" section documenting the setup.

---

## Implementation Order

| Phase | Work | Files |
|-------|------|-------|
| A | Schema (all 3 new tables) | `convex/schema.ts` |
| B | Session tracking backend | `convex/sessions.ts` (new) |
| B | Gamification stats queries | `convex/stats.ts` |
| B | Settings + AI backend | `convex/settings.ts` (new), `convex/ai.ts` (new) |
| B | Google auth (1-line backend) | `convex/auth.ts` |
| C | Study page session integration | `src/app/(protected)/decks/[id]/study/page.tsx` |
| C | Dashboard widgets + layout | `src/components/features/dashboard/StreakWidget.tsx` (new), `ActivityHeatmapWidget.tsx` (new), `src/app/page.tsx` |
| C | Options page (API key) | `src/app/(protected)/options/page.tsx` |
| C | Generate cards modal + deck page | `GenerateCardsModal.tsx` (new), `src/app/(protected)/decks/[id]/page.tsx` |
| C | Google sign-in button | `src/app/page.tsx` |
| C | Markdown rendering | `MarkdownContent.tsx` (new), CardViewerModal, study page |
| D | Deployment config | `.env.example`, `.github/workflows/deploy.yml`, `docs/build.md` |

---

## Verification

- **Session tracking:** Study a deck, finish session, return to dashboard — streak and activity heatmap should reflect the session. Study again next day to verify streak increments.
- **AI generation:** Set API key in options, go to a deck, click Generate, enter a topic, verify cards appear in preview, confirm insertion, verify cards show in the deck.
- **Google auth:** Sign out, sign in with Google, verify decks are scoped to the new account.
- **Markdown:** Create a card with `**bold**` and `*italic*`, verify it renders correctly in the viewer and study mode.
- **Deployment:** Push to main, verify GitHub Action runs lint + type-check + `convex deploy`, verify Vercel deploys the frontend, verify the app works at the production URL.
