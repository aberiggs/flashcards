# Roadmap

Take a look at what’s built and what’s next.

---

## Implemented ✅

### Pages & decks

- [x] **Home page** — Landing with sign-in and a link to view decks.
- [x] **Decks list** — View all decks with card counts and last-studied order.
- [x] **Create deck** — Create a new deck (name and optional description).
- [x] **Delete deck** — Delete a deck and all its cards (with confirmation).
- [x] **Add, edit, and remove cards** — Full card CRUD from the deck edit page (front/back).
- [x] **View all cards in a deck** — Edit deck page lists every card with front/back.

### Study

- [x] **Review mode** — Study session with flip-to-reveal, progress bar, and confidence (wrong / close / hard / easy) feeding SM-2.
- [x] **SM-2 spaced repetition** — Confidence drives `efactor`, `repetitions`, and `nextReview`; cards are scheduled for future review.
- [x] **Due-card filtering** — Study mode shows only cards due for review; decks list displays due count per deck.

### Auth

- [x] **Sign in** — GitHub OAuth and Google OAuth (both available on the sign-in page).
- [x] **Sign out** — Sign out in the header when authenticated.
- [x] **Auth state** — Loading and unauthenticated states with appropriate UI.

### Settings

- [x] **Options** — Settings page with light/dark/system theme toggle.
- [x] **OpenAI API key management** — Save and remove a personal OpenAI API key from the settings page; stored securely server-side and never returned in full.

### Dashboard & stats

- [x] **Dashboard home** — Authenticated home page shows welcome message and stats widgets.
- [x] **Memory stages** — Pie chart of cards by stage (new, learning, reviewing, mastered) based on SM-2 repetitions.
- [x] **Review forecast** — Bar chart of cards due today, tomorrow, in 3 days, and in 7 days (timezone-aware).
- [x] **Decks page summary** — Stats bar with deck count, total cards, and due count (“all caught up” when none due).
- [x] **Streak & activity stats** — Streak counter, today/week card counts, and overall accuracy rate shown on the dashboard.
- [x] **Activity heatmap** — 90-day GitHub-style heatmap of daily cards studied, with intensity levels and month labels.

### AI generation

- [x] **Generate from topic** — Generate flashcards from a concept or topic the user describes (e.g. "Spanish food vocabulary").
- [x] **Generate from notes** — Generate flashcards from pasted study material or notes.
- [x] **Auto card count** — AI analyzes content depth and decides how many cards to generate (1–50); chosen count is shown transparently in the preview step.
- [x] **Free-form card count** — Users can specify any number of cards from 1 to 50; entering more than 50 shows a friendly suggestion to split into multiple generations.
- [x] **Deduplication** — Existing cards in the deck are passed to the AI so it avoids generating duplicates or near-duplicates.
- [x] **Preview and edit before saving** — Generated cards are shown in an editable preview; users can modify or delete individual cards before adding them to the deck.

### Backend (Convex)

- [x] **Convex setup** — Project wired to Convex with schema, queries, and mutations.
- [x] **Auth** — Convex Auth with GitHub and Google providers; user-scoped data.
- [x] **Decks & cards** — Create, read, update, and delete for decks and cards.
- [x] **Time tracking** — `lastStudied` on cards, aggregated for decks; updated when a card is studied.
- [x] **Stats API** — `dashboardStats` query for memory stages and review forecast (timezone-aware).
- [x] **Session tracking** — `studySessions` and `studyEvents` tables record every study session and card result; used for streak and activity data.
- [x] **Gamification API** — `gamificationStats` and `activityHistory` queries power the streak widget and activity heatmap.

### Landing & polish

- [x] **Landing page** — Unauthenticated page with tagline, feature highlights, and sign-in CTA.
- [x] **Chart theming** — Chart colors adapt to light/dark theme via CSS variables.
- [x] **Empty states** — Dashboard widgets show helpful messages when there is no data.
- [x] **Markdown in cards** — Card front and back content renders as Markdown (paragraphs, bold, italic, lists, inline code).
- [x] **Toast notifications** — Global toast system for mutation feedback (success/error/info/warning); auto-dismisses after 4 s, dismissible on click. Wired to all key actions: create/delete deck, add/edit/delete card, save API key, AI generation.

### Code quality

- [x] **Error handling** — try/catch on all mutations with error toasts; delete buttons disabled during in-flight requests to prevent double-submit.
- [x] **Cascade delete** — Deleting a deck now also removes all associated study sessions and events.
- [x] **Session ownership** — `recordEvent` verifies the session belongs to the caller before inserting.
- [x] **Type hygiene** — Removed `any` from AI card mapping; removed unused `DeckStats` type; extracted shared `getMemoryStage` utility to `src/lib/memoryStage.ts`.

### Resource caps

- [x] **Deck cap** — 50 decks per user enforced in `decks.create`; clear error message on breach.
- [x] **Per-deck card cap** — 500 cards per deck enforced in `cards.create` and `ai.bulkInsertCards`; clear error message on breach.
- [x] **Total card cap** — 5,000 cards per user enforced in `cards.create` and `ai.bulkInsertCards`.
- [x] **AI generation rate limit** — 10 AI generations per hour per user; tracked in a dedicated `aiGenerations` table; clear error message on breach.
- [x] **Usage display** — Decks list stats bar shows current usage against caps (e.g. "3/50 decks", "142/5,000 cards"); highlights in warning color when above 80%.

---

## Future ideas 🚧

### Auth

### Flashcard & study

- [ ] **Card browser with search** — Browse and search cards outside the SRS study flow (e.g. by deck, text, due status). Better edit UX (inline or side-panel edit) instead of the current modal-on-edit-page flow; good for review and bulk edits.
- [ ] **Search** — Search across decks or within a deck (e.g. by front/back text); powers the card browser and filters.
- [ ] **Keyboard shortcuts (study)** — e.g. space to reveal, 1/2/3 for confidence, arrows to navigate; faster flow for power users.
- [ ] **Deck tags and filtering** — Add tags to decks for easier organization and filtering.
### Spaced repetition & scheduling

### AI

- [ ] **AI-assisted explanations** — AI-assisted explanations of concepts and terms. It may also suggest additional resources or lessons.
- [ ] **Card generation templates** — Have prompt templates that can be used to help in generating cards that are consistent with a certain theme.

### Flashcard & study

- [ ] **Card level badges & sorting** — Show memory stage badges (New, Learning, Reviewing, Mastered) on card tiles in the deck view. Add sort options: by stage, next review date, date added, or alphabetical.

### Flashcard features

- [ ] **Multimedia in cards** — Images, audio, or video in card content (e.g. image on front/back, pronunciation audio). Requires file storage (e.g. Convex file storage) and schema updates.
- [ ] **Extended Markdown in cards** — Headings, tables, syntax-highlighted code blocks, and links (basic Markdown already renders; this extends it further). Optional MDX for interactive snippets.
- [ ] **Custom card schema** — User-defined fields (e.g. front, back, image, examples) and optional custom HTML/CSS/JS.
- [ ] **Per-deck / per-card stats** — Accuracy, streak, and time spent per deck or per card (beyond current aggregate dashboard).
- [ ] **Rich card components** — Highlighted terms linked to explanations; concept web / related-terms view.

### Data & portability

- [ ] **Export / import** — Export decks (e.g. CSV, JSON) for backup or portability; import from file or from other formats (e.g. Anki-style).

### Other

- [ ] **Daily goal** — Set a target number of cards to study each day; progress indicator shown on the dashboard.
- [ ] **Learning communities** — Shared decks or groups.
- [ ] **Learning paths** — Ordered sequences of decks or lessons.
- [ ] **Deck sharing** — Publish or share decks (read-only or copy).
- [ ] **Deck rating** — Rate or review shared decks.
- [ ] **Deck modes** — Multiple study modes (e.g. flashcards, matching, typing).
- [ ] **Loading & polish** — Better loading states and transitions.
- [ ] **Advanced themes** — Allow for customization of the app theme along with a larger variety of default themes.
