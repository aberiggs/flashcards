# Roadmap

Take a look at what’s built and what’s next.

---

## Implemented ✅

### Frontend — Flashcard essentials

- [x] **Home page** — Landing with sign-in and a link to view decks.
- [x] **Decks list** — View all decks with card counts and last-studied order.
- [x] **Create deck** — Create a new deck (name and optional description).
- [x] **Delete deck** — Delete a deck and all its cards (with confirmation).
- [x] **Add, edit, and remove cards** — Full card CRUD from the deck edit page (front/back).
- [x] **Review mode** — Study session with flip-to-reveal, progress bar, and confidence (easy / medium / hard).
- [x] **View all cards in a deck** — Edit deck page lists every card with front/back.

### Frontend — Auth

- [x] **Sign in** — GitHub OAuth.
- [x] **Sign out** — Sign out in the header when authenticated.
- [x] **Auth state** — Loading and unauthenticated states with appropriate UI.

### Frontend — Other

- [x] **Options** — Settings page with light/dark/system theme toggle.

### Backend — Convex

- [x] **Convex setup** — Project wired to Convex with schema, queries, and mutations.
- [x] **Auth** — Convex Auth with GitHub provider; user-scoped data.
- [x] **Decks & cards** — Create, read, update, and delete for decks and cards.
- [x] **Time tracking** — `lastStudied` on cards, aggregated for decks; updated when a card is studied (confidence not yet used for scheduling).

---

## Future ideas 🚧

### Auth

- [ ] **Google OAuth** — Sign in with Google in addition to (or instead of) GitHub.

### Flashcard & study

- [ ] **Card browser with search** — Browse and search cards outside the SRS study flow (e.g. by deck, text, due status). Better edit UX (inline or side-panel edit) instead of the current modal-on-edit-page flow; good for review and bulk edits.
- [ ] **Search** — Search across decks or within a deck (e.g. by front/back text); powers the card browser and filters.
- [ ] **Keyboard shortcuts (study)** — e.g. space to reveal, 1/2/3 for confidence, arrows to navigate; faster flow for power users.

### Spaced repetition & scheduling

- [ ] **Confidence-driven scheduling** — Use easy / medium / hard to compute next review time (e.g. SM-2 or similar).
- [ ] **Mastery level & “burned”** — Each card has a phase/level (e.g. learning → review → mastered); after enough success, card is “burned” and no longer shown in regular sessions.
- [ ] **Filter by due date** — In study mode, only show cards that are due for review (based on next-review from SRS).
- [ ] **Configurable intervals** — User settings for how aggressively or gently to space reviews (e.g. interval multiplier, max interval, steps for learning).

### AI

- [ ] **Generate from concepts** — Create flashcards from core concepts or topics the user specifies.
- [ ] **Generate from content** — Create flashcards from notes, URLs, or pasted text.
- [ ] **AI-assisted ordering** — Smarter review order or recommendations based on performance.

### Flashcard features

- [ ] **Multimedia in cards** — Images, audio, or video in card content (e.g. image on front/back, pronunciation audio). Requires file storage (e.g. Convex file storage) and schema updates.
- [ ] **Markdown / MDX in cards** — Render card content as Markdown (headings, lists, code blocks, links). Optional: MDX for embedded components or interactive snippets; start with Markdown for simplicity, add MDX later if needed.
- [ ] **Custom card schema** — User-defined fields (e.g. front, back, image, examples) and optional custom HTML/CSS/JS.
- [ ] **Stats** — Per-deck or per-card stats (e.g. accuracy, streak, time spent).
- [ ] **Rich card components** — Highlighted terms linked to explanations; concept web / related-terms view.

### Data & portability

- [ ] **Export / import** — Export decks (e.g. CSV, JSON) for backup or portability; import from file or from other formats (e.g. Anki-style).

### Other

- [ ] **Daily goal or streak** — e.g. “Study N cards today” or streak counter to encourage consistent habit.
- [ ] **Learning communities** — Shared decks or groups.
- [ ] **Learning paths** — Ordered sequences of decks or lessons.
- [ ] **Deck sharing** — Publish or share decks (read-only or copy).
- [ ] **Deck rating** — Rate or review shared decks.
- [ ] **Deck modes** — Multiple study modes (e.g. flashcards, matching, typing).
- [ ] **Loading & polish** — Better loading states and transitions.
- [ ] **Advanced themes** - Allow for customization of the app theme along with a larger variety of default themes.
