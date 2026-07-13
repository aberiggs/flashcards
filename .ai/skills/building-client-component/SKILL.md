---
name: building-client-component
description: Use when creating or editing a React client component in the flashcards app. Covers 'use client' directive, named exports, props interfaces above the component, ReactNode children, Tailwind v4 tokens, and accessibility rules. Do not use for server components or backend work.
---

# Building a client component

All pages in the `(protected)/` route group are `'use client'`. Most components
in `src/components/` are client components too.

## Required conventions

- Line 1 of the file is `'use client';` (single quotes).
- Use **named exports**. Default exports are reserved for Next.js page and layout
  files (`export default function Page()`).
- Define props interfaces directly above the component:

  ```ts
  interface CardProps {
    title: string;
    children: ReactNode;
  }

  export function Card({ title, children }: CardProps) { … }
  ```

- Use `ReactNode` for `children`, not `JSX.Element` or `React.FC`.
- Files and components are `PascalCase`. Variables/functions are `camelCase`.

## Imports

```ts
// 1. React (if needed explicitly)
import { useState, useCallback } from "react";
// 2. Third-party packages
import { useQuery } from "@tanstack/react-query";
// 3. Internal — alias imports (@/)
import { Modal } from "@/components/ui/Modal";
import { useDecks } from "@/lib/hooks";
```

## Styling (Tailwind v4)

- No `tailwind.config.*` — config lives in `src/app/globals.css` via `@theme inline`.
- Use the CSS custom property tokens (`--surface-primary`, `--text-secondary`,
  `--accent-primary`, …) rather than raw hex values.
- Use `style={{ … }}` only when Tailwind can't express the value (CSS variables,
  `color-mix()`, dynamic `calc()`).
- Conditional classes: template literals or a helper — avoid third-party `clsx`
  unless already present.

## Accessibility

- All icon-only buttons must have `aria-label`.
- Decorative Lucide icons: `<Icon className="w-4 h-4" aria-hidden />`.
- Non-`<button>` clickable elements need `role="button"`, `tabIndex={0}`, and an
  `onKeyDown` handler.
- Interactive elements: include
  `focus:outline-none focus:ring-2 focus:ring-[--accent-primary]`.

## Data

- Use TanStack Query hooks from `src/lib/hooks.ts` for server state.
- For a stable snapshot during a study session, copy query results into local
  state at session start to prevent mid-session re-sorting from refetches.
- No global state library. Use React built-ins (`useState`, `useEffect`,
  `useRef`, `useCallback`).

## Error handling

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