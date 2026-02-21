# Agent Guidelines for `flashcards`

A Next.js 15 + Convex full-stack flashcard app with SM-2 spaced repetition, AI card
generation, and OAuth authentication (GitHub + Google).

---

## Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router, Turbopack), React 19, Tailwind v4 |
| Backend    | Convex (queries, mutations, actions, auth)              |
| Auth       | `@convex-dev/auth` (GitHub OAuth, Google OAuth)        |
| AI         | OpenAI `gpt-4o-mini` via direct `fetch` in Convex action |
| Charts     | Recharts                                                |
| Icons      | Lucide React                                            |
| Deployment | Vercel (frontend) + Convex Cloud (backend)              |

---

## Commands

```bash
# Start both Next.js (Turbopack) and Convex dev watcher
npm run dev

# Lint (ESLint with next/core-web-vitals + next/typescript)
npm run lint

# Type-check without emitting (run this before committing)
npx tsc --noEmit

# Type-check Convex backend separately
npx tsc --noEmit --project convex/tsconfig.json

# Production build (Convex injects NEXT_PUBLIC_CONVEX_URL)
npx convex deploy --cmd 'npm run build'
```

> **No test runner exists.** There are no Jest, Vitest, Playwright, or other test
> frameworks in this project. CI runs `npm run lint` and `npx tsc --noEmit` only.

---

## CI / CD

- **Every push/PR**: `npm ci` → `npm run lint` → `npx tsc --noEmit`
- **Push to `main`**: Convex backend deploys, then Next.js builds on Vercel
- `convex/_generated/` is **committed** to git (needed for CI type-checking without a
  codegen step). Do not `.gitignore` it.

---

## Project Layout

```
src/
  app/
    (protected)/          # Auth-gated route group — all pages are 'use client'
    ConvexClientProvider.tsx
    globals.css           # Tailwind v4 @theme + CSS custom properties
    layout.tsx            # Root layout
    page.tsx              # Landing / dashboard
  components/
    features/             # Domain-specific components (dashboard/, decks/)
    layout/               # AppHeader, Footer
    theme/                # ThemeProvider, ThemeToggle
    ui/                   # Generic primitives (Card, Modal, PageLoader, …)
  middleware.ts           # convexAuthNextjsMiddleware
  types/
    flashcards.ts         # Shared TypeScript types

convex/
  _generated/             # Auto-generated — DO NOT edit by hand
  schema.ts               # Database schema (source of truth for all tables)
  ai.ts                   # AI card generation action
  auth.ts / auth.config.ts
  cards.ts / decks.ts / sessions.ts / stats.ts / settings.ts
  sm2.ts                  # SM-2 spaced-repetition algorithm (pure logic)
  http.ts                 # HTTP router for auth callbacks
```

---

## TypeScript

- **Strict mode** is enabled in both `tsconfig.json` (root) and `convex/tsconfig.json`.
- Root target: `ES2017`; Convex target: `ESNext` — keep them separate.
- **Path alias**: `@/*` → `./src/*`. Use `@/` for all intra-`src/` imports.
  Convex files use relative imports (e.g., `./schema`, `./_generated/server`).
- Never use `any`; prefer `unknown` + type guards when the shape is truly unknown.
- Avoid type assertions (`as Foo`) unless bridging external API responses that are
  already validated.
- `interface` for object shapes; `type` for unions, intersections, and aliases.
- Do **not** prefix interface names with `I`.

---

## Code Style

### Imports

```ts
// 1. React (if needed explicitly)
import { useState, useCallback } from "react";
// 2. Third-party packages
import { useMutation } from "convex/react";
// 3. Internal — alias imports (@/)
import { Modal } from "@/components/ui/Modal";
// 4. Convex generated (from pages/components into convex)
import { api } from "../../../convex/_generated/api";
```

### Components

- Every client component starts with `'use client';` (single quotes) on line 1.
- Use **named exports** everywhere. Default exports are reserved for Next.js page and
  layout files (`export default function Page() { … }`).
- Define props interfaces directly above the component:

  ```ts
  interface CardProps {
    title: string;
    children: ReactNode;
  }

  export function Card({ title, children }: CardProps) { … }
  ```

- Use `ReactNode` for `children`, not `JSX.Element` or `React.FC`.

### Naming

| Thing                        | Convention                  |
| ---------------------------- | --------------------------- |
| Components / files           | `PascalCase`                |
| Convex function files        | `camelCase` (`cards.ts`)    |
| Variables / functions        | `camelCase`                 |
| Types / interfaces           | `PascalCase` (no `I` prefix) |
| Convex delete operations     | `remove` (not `delete`)     |
| Internal Convex ops          | `internal*` suffix via `internalQuery` / `internalMutation` |
| Constants (module-level)     | `SCREAMING_SNAKE_CASE` + `as const` |

### Convex Backend

- Scope every query/mutation to the authenticated user: call `getAuthUserId(ctx)`.
  - **Queries**: return `null` or `[]` when unauthenticated.
  - **Mutations/actions**: throw `new Error("Not authenticated")` when unauthenticated.
- Ownership checks: throw `new Error("<Entity> not found")` if the record doesn't
  belong to the caller.
- Use `internalMutation` / `internalQuery` for operations that should only be called
  by other Convex functions, never directly by clients.
- Never return raw secrets (e.g., API keys) from queries or mutations.

### Error Handling (Client)

```ts
try {
  await doSomething();
} catch (err) {
  setError(err instanceof Error ? err.message : "An unexpected error occurred");
}
```

- Use `void expression()` to intentionally discard a promise in event handlers
  (e.g., `void signOut()`).
- Never swallow errors silently.

### Styling (Tailwind v4)

- **No `tailwind.config.*`** — configuration lives in `globals.css` via `@theme inline`.
- Use the CSS custom property tokens (`--surface-primary`, `--text-secondary`,
  `--accent-primary`, etc.) rather than raw hex values.
- Use `style={{ … }}` only when Tailwind can't express the value (CSS variables,
  `color-mix()`, dynamic `calc()` expressions).
- Conditional classes: template literals or a helper — avoid third-party `clsx` unless
  already present.

### Accessibility

- All icon-only buttons must have `aria-label`.
- Decorative Lucide icons: `<Icon className="w-4 h-4" aria-hidden />`.
- Non-`<button>` clickable elements need `role="button"`, `tabIndex={0}`, and an
  `onKeyDown` handler.
- Interactive elements: include `focus:outline-none focus:ring-2 focus:ring-[--accent-primary]`.

---

## State Management

- No global state library. Use React built-ins: `useState`, `useEffect`, `useRef`,
  `useCallback`.
- Convex `useQuery` provides real-time reactive data. `useMutation` / `useAction` for
  writes.
- When you need a stable snapshot of live data (e.g., during a study session), copy
  Convex results into local state at session start to prevent mid-session re-sorting.

---

## Auth

- Auth secrets (`AUTH_GITHUB_ID`, etc.) are set as **Convex environment variables**,
  not in `.env.local`. Do not add auth secrets to `.env.local`.
- `NEXT_PUBLIC_CONVEX_URL` is the only frontend env var required locally (in
  `.env.local`).
- The `(protected)/` route group's `layout.tsx` handles the auth gate — all child
  pages can assume the user is authenticated.

---

## Keeping Docs Current

After completing any feature work or making meaningful changes, update `docs/roadmap.md`:

- **Check off completed items**: change `- [ ]` to `- [x]` for anything now implemented,
  and move it (with a short label) under the appropriate `## Implemented ✅` section.
- **Add new ideas**: if you build something that wasn't planned, or discover a natural
  follow-on feature, add it under the relevant `## Future ideas 🚧` subsection with a
  `- [ ]` checkbox and a one-line description.
- **Keep descriptions honest**: the roadmap is user-facing — write entries as
  user-visible capabilities, not implementation details.
- **Don't over-document**: trivial bug fixes and refactors don't need roadmap entries.
  New user-facing features, significant UX changes, and newly planned ideas do.

Also update `docs/build.md` if you change the dev setup, environment variables,
deployment process, or add new tooling.

---

## Do Not

- Edit anything inside `convex/_generated/` — it is auto-generated by the Convex CLI.
- Add a global state library (Zustand, Redux, Jotai) without discussion.
- Add a test framework ad-hoc — if tests are needed, plan the framework choice first.
- Use `console.log` in committed code; use `console.error` only in genuine error paths.
- Add Prettier or change the ESLint config without updating this file.
