# Features

User-facing capabilities.

## Decks and cards

- Create, edit, and remove decks and cards.
- View card counts, due counts, and last-studied order on decks.
- Render card content as Markdown (paragraphs, emphasis, lists, inline code).
- In-deck card browser with text search (front/back), tier filter
  (All / Acorn / Sprout / Sapling / Tree / Grove / Forest), due-status filter
  (Overdue / Due today / Upcoming), and sort (oldest / newest / due first /
  stage). Filtering is client-side against the loaded deck; the card viewer
  modal walks the filtered set when filters are active.
- 6-tier plant-metaphor progression (Acorn → Sprout → Sapling → Tree →
  Grove → Forest), grouped by SM-2 reality: the early tiers change per review
  because intervals jump fast there, while the mature tiers each span
  multiple reps because by then intervals are weeks/months/years. Tier
  labels, colors, and order are defined once in `src/lib/memoryStage.ts`
  (`TIER_META`) and consumed by the card badge, dashboard widget, and stage
  filter so they can never drift apart.
- Add-card flow: a single Save commits the card, clears the form, and keeps
  the modal open with the front textarea auto-focused for fast batch entry.
  A per-session counter in the toast ("Card added · N this session") tracks
  how many you've added; close the modal (X / Esc / backdrop) when done.

## Study workflow

- Review mode with flip-to-reveal, progress tracking, and confidence ratings.
- Keyboard-first study controls (`Space` to reveal, `1-4` to rate confidence) with on-screen hints.
- SM-2 scheduling with due-card filtering and stage progression.
- Due cards are ordered by overdue day-bucket, then SRS level (lower repetitions first), then shuffled within level so recall isn't tied to creation order.
- Session tracking for streaks, activity, and accuracy metrics.

## Dashboard and insights

- Memory stages chart showing the full 6-tier progression (Acorn / Sprout /
  Sapling / Tree / Grove / Forest) as a stacked bar with per-tier counts and
  percentages. Review forecast chart with an adjustable horizon: 24h (hourly
  buckets, anchored at the current hour) or 30d (daily buckets, today + 29
  future days; overdue cards roll into today). Header summary reads "N due
  now · M scheduled in the next <period>" so the current bucket and the
  whole-horizon total stay distinct.
- Interval stats (1 week / 1 month / 1 year): sessions, cards reviewed,
  accuracy, and % change vs the previous interval.
- 90-day activity heatmap and helpful empty states.

## Import and export

- Export each deck as CSV or JSON backup (including SM-2 state in JSON).
- Import from CSV/TXT or JSON with preview, header synonym support, and deck rename before save.

## Auth, settings, and quality-of-life

- Email + password sign-in (no external OAuth). First user self-registers on initial setup; registration closes automatically after.
- Sign-out and authenticated route gating.
- Theme options (light, dark, system).
- Global search (Cmd/Ctrl+K), toast notifications, and mobile usability improvements.
- App-like mobile viewport: pinch-zoom is disabled (maximum-scale=1,
  user-scalable=no) so the experience matches a native app — no accidental
  zoom when tapping inputs, no double-tap zoom dance. System font scaling
  still works for users who need larger text.