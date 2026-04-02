# Features

User-facing capabilities are documented here. New ideas and backlog items are tracked in GitHub Issues.

## Current capabilities

### Decks and cards

- Create, edit, and remove decks and cards.
- View card counts, due counts, and last-studied order on decks.
- Render card content as Markdown (paragraphs, emphasis, lists, inline code).

### Study workflow

- Review mode with flip-to-reveal, progress tracking, and confidence ratings.
- SM-2 scheduling with due-card filtering and stage progression.
- Session and event tracking for streaks, activity, and accuracy metrics.

### Dashboard and insights

- Memory stages pie chart and due-date forecast chart.
- Streak, daily/weekly counts, and overall accuracy.
- 90-day activity heatmap and helpful empty states.

### AI-assisted generation

- Generate cards from topics or pasted notes.
- Auto-select card counts by content depth, or choose 1-100 manually.
- Deduplicate against existing deck cards, then preview/edit before saving.

### Import and export

- Export each deck as CSV or JSON backup (including SM-2 state in JSON).
- Import from CSV/TXT or JSON with preview, header synonym support, and deck rename before save.

### Auth, settings, and quality-of-life

- GitHub and Google sign-in, sign-out, and authenticated route gating.
- Theme options (light, dark, system) and secure OpenAI API key management.
- Global search (Cmd/Ctrl+K), toast notifications, and mobile usability improvements.

## Feature backlog (GitHub Issues)

Track planned features and ideas in GitHub: https://github.com/aberiggs/flashcards/issues

### Study and deck management

- #11 Keyboard shortcuts for study mode
- #16 Card browser with search
- #17 Card memory stage badges and sorting
- #18 Deck tags and filtering
- #21 Per-deck and per-card stats
- #22 Daily study goal
- #29 Multiple study modes

### AI and generation

- #27 Deep AI-assisted explanations
- #28 Card generation templates
- #35 Explore optimal models for each AI task type
- #36 Track AI request usage and cost metrics

### Card content and format

- #23 Multimedia in cards (images, audio, video)
- #24 Extended Markdown rendering
- #25 Custom card schema
- #26 Rich card components

### Sharing and social

- #19 Deck sharing (read-only copy)
- #20 Deck rating and reviews
- #31 Learning paths
- #32 Learning communities

### UX and theming

- #33 Advanced themes and customization
- #38 Improve loading states and UI polish
