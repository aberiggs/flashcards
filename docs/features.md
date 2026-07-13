# Features

User-facing capabilities.

## Decks and cards

- Create, edit, and remove decks and cards.
- View card counts, due counts, and last-studied order on decks.
- Render card content as Markdown (paragraphs, emphasis, lists, inline code).

## Study workflow

- Review mode with flip-to-reveal, progress tracking, and confidence ratings.
- Keyboard-first study controls (`Space` to reveal, `1-4` to rate confidence) with on-screen hints.
- SM-2 scheduling with due-card filtering and stage progression.
- Due cards are ordered by overdue day-bucket, then SRS level (lower repetitions first), then shuffled within level so recall isn't tied to creation order.
- Session tracking for streaks, activity, and accuracy metrics.

## Dashboard and insights

- Memory stages pie chart and due-date forecast chart.
- Streak, daily/weekly counts, and overall accuracy.
- 90-day activity heatmap and helpful empty states.

## Import and export

- Export each deck as CSV or JSON backup (including SM-2 state in JSON).
- Import from CSV/TXT or JSON with preview, header synonym support, and deck rename before save.

## Auth, settings, and quality-of-life

- Email + password sign-in (no external OAuth). First user self-registers on initial setup; registration closes automatically after.
- Sign-out and authenticated route gating.
- Theme options (light, dark, system).
- Global search (Cmd/Ctrl+K), toast notifications, and mobile usability improvements.