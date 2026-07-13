# Project Layout

```
src/
  app/
    (protected)/          # Auth-gated route group — all pages are 'use client'
    api/                  # Next.js Route Handlers (REST endpoints)
      api/auth/[...nextauth]/route.ts   # Auth.js handler
      api/decks/...       # Deck + card + study + stats endpoints
      api/stats/...       # Dashboard stats endpoints
      api/search/         # Search endpoint
      api/import/         # Bulk import endpoint
    AuthSessionProvider.tsx  # Client-side next-auth SessionProvider
    QueryProvider.tsx        # TanStack Query client provider
    globals.css           # Tailwind v4 @theme + CSS custom properties
    layout.tsx            # Root layout (providers)
    page.tsx              # Landing / dashboard
  auth.ts                 # NextAuth config (providers, adapter, callbacks)
  middleware.ts           # Route protection (auth-gated middleware)
  components/
    features/             # Domain-specific components (dashboard/, decks/)
    layout/               # AppHeader, Footer, SearchBar
    theme/                # ThemeProvider, ThemeToggle
    ui/                   # Generic primitives (Card, Modal, PageLoader, …)
  db/
    schema.ts             # Drizzle schema (source of truth for all tables)
    index.ts              # Postgres connection + Drizzle instance
  lib/
    sm2.ts                # SM-2 spaced-repetition algorithm (pure logic)
    limits.ts             # Resource cap constants
    hooks.ts              # TanStack Query hooks (useDecks, useCards, etc.)
    api.ts                # Typed fetch client for the REST API
    parseDeck.ts          # Import file parsing (CSV/TXT/JSON)
    exportDeck.ts         # Deck export (CSV/JSON)
    memoryStage.ts        # Memory stage classification
  server/
    auth.ts               # getAuthUserId / requireAuthUserId helpers
    api.ts                # Route Handler response helpers
    queries/
      decks.ts            # Deck CRUD + stats aggregation
      cards.ts            # Card CRUD + SM-2 review recording
      sessions.ts         # Study session lifecycle
      stats.ts            # Dashboard / deck / gamification / activity stats
      search.ts           # ILIKE search
      import.ts           # Bulk deck import
  types/
    next-auth.d.ts        # Session.user.id type augmentation

drizzle/                  # Generated migration SQL files (committed)
drizzle.config.ts         # Drizzle Kit configuration
Dockerfile                # Multi-stage Next.js standalone build
docker-compose.yml        # Next.js + Postgres self-host deployment
```