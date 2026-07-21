---
name: frontend
description: "MUST USE for frontend/web UI/UX/visual work in this repo: building, styling, or redesigning React components, dashboards, pages, or widgets. Enforces design taste, accessibility, and polish conventions grounded in the existing Tailwind v4 token system in src/app/globals.css. Triggers: frontend, UI, UX, design, redesign, styling, layout, component, widget, React, dashboard, animation, motion, accessibility, WCAG, looks generic, make it pretty, visual QA, polish."
---

# Frontend

This repo is NOT greenfield. The design system already exists as Tailwind v4
`@theme inline` tokens in `src/app/globals.css` and a set of widget conventions
under `src/components/features/dashboard/`. Treat those as the project's
`DESIGN.md`. Every frontend task starts by reading them and matching the
closest existing sibling.

## The bar

The bar is not clean-and-correct — it is work a senior designer at Linear,
Stripe, or Supabase would ship. Correct-but-flat is a failure, not a finish.
Protect the surface as hard as you protect the build: design is a first-class
deliverable, not a one-shot decision you lock and walk away from.

## Before any UI work

1. Read `src/app/globals.css` to learn the tokens (surfaces, text, accents,
   `--chart-*`). Do not invent new colors or pull in a styling dependency.
2. Read the closest sibling widget(s) in `src/components/features/dashboard/`
   for structure, spacing, empty states, and a11y patterns.
3. If a new token, primitive, state, motion rule, or accessibility constraint
   is genuinely needed, add it to `src/app/globals.css` (token) or a shared
   `src/components/ui/` primitive first — before writing the feature
   component. Name it in this file's "Design tokens" section below if you do.
4. Then implement, matching the sibling conventions exactly.

## Shared primitives (reuse, don't reinvent)

`src/components/ui/` carries the generic primitives. Read the file before
reimplementing.

- **`Card`** (`Card.tsx`) — generic container. `variant: 'default' | 'dashed'
  | 'hover'`, optional `onClick` turns it into a keyboard-accessible
  `role="button"` div (Enter + Space handler, `tabIndex=0`). Uses `p-6`.
  Prefer this for one-off cards in deck detail pages, lists, etc.
- **`CardShell`** (`CardShell.tsx`) — full-screen overlay shell (backdrop +
  centered frame + header/body/footer slots) for the card viewer and
  generate-review UIs. Use for full-screen study overlays, not modals.
- **`Modal`** (`Modal.tsx`) — standard centered modal. Escape to close,
  focus save/restore, `role="dialog"` + `aria-modal`, 44×44 close button with
  focus ring, body-scroll lock, `size: 'md' | 'lg' | 'xl'`. **Copy its a11y
  pattern verbatim if you build any new dialog.**
- **`Toast` / `useToast`** (`Toast.tsx`) — `useToast()` returns `{ toast }`;
  call `toast({ title, description?, variant? })`. Wrap a tree in
  `<ToastProvider>` (already in root layout).
- **`PageLoader`** (`PageLoader.tsx`) — full-screen or inline spinner.
  `fullScreen` prop.
- **`MarkdownContent`** (`MarkdownContent.tsx`) — renders markdown for card
  fronts/backs.

Providers (already wired in `src/app/layout.tsx`): `ThemeProvider`,
`ToastProvider`, `QueryProvider`, `AuthSessionProvider`. Don't re-add.

Icons: `lucide-react` only. `aria-hidden` on decorative icons. No emojis as
icons. No new icon library. Conditional classes via template literals — no
`clsx` (not installed).

## Widget conventions (this repo)

Dashboard widgets in `src/components/features/dashboard/` **hardcode their own
shell** rather than using `<Card>` — they use `p-5`, `<Card>` uses `p-6`, and
the widgets predate the primitive. This is an accepted inconsistency. **New
dashboard widgets match the existing widgets** (hardcoded shell, `p-5`) for
visual consistency, not `<Card>`. Use `<Card>` for one-off cards elsewhere.

All dashboard widgets follow:

- `'use client'` directive, named export, props interface above the component.
- Outer container: `rounded-xl border border-border-primary bg-surface-primary
  p-5 shadow-sm`.
- Title: `<h3 className="text-sm font-semibold text-text-primary mb-4">…</h3>`.
- Empty state: centered `min-h-44` flex with `text-text-tertiary text-sm` and
  a helpful message. (`min-h-[180px]` appears in older widgets — `min-h-44` is
  the same intent on the Tailwind scale; prefer the scale for new widgets.)
- Charts use `recharts` (already a dependency) with `ResponsiveContainer`
  inside a fixed-height div (e.g. `h-48 w-full` for short charts,
  `h-64 sm:h-72` when more room helps). ResponsiveContainer handles the
  width; the outer height is the only value you set.
- Chart colors come from CSS variables (`var(--chart-bar)`, `var(--chart-new)`,
  …) passed via `fill` or `style`. Tooltip styling reuses surface/border
  tokens.

## Design tokens (source of truth)

Lives in `src/app/globals.css` under `@theme inline` and `@layer base`:

- **Surfaces**: `--surface-primary`, `--surface-secondary`,
  `--surface-tertiary`
- **Text**: `--text-primary`, `--text-secondary`, `--text-tertiary`,
  `--text-inverse`
- **Accent**: `--accent-primary`, `--accent-primary-hover`,
  `--accent-success`, `--accent-warning`, `--accent-error`
- **Chart**: `--chart-new`, `--chart-learning`, `--chart-reviewing`,
  `--chart-mastered`, `--chart-bar`, `--chart-streak`, `--chart-activity`
- **Card tier badges**: `--tier-seed`, `--tier-sprout`, `--tier-seedling`,
  `--tier-sapling`, `--tier-bud`, `--tier-bloom`, `--tier-fruit` — one hue
  per tier in the 7-step plant progression (Seed → Fruit). Deliberately
  distinct from the 4 `--chart-*` stage colors so adjacent tiers stay
  distinguishable at a glance. See `src/components/ui/TierBadge.tsx`.
- **Borders**: `--border-primary`, `--border-secondary`

All have light + dark variants defined in `:root` and the `.dark` / system
media query. Use `color-mix(in srgb, <token> N%, transparent)` for tinted
backgrounds (see `StreakWidget.tsx` and `ActivityHeatmapWidget.tsx` for
precedent). Use `style={{ … }}` only when Tailwind can't express the value
(CSS variables, `color-mix()`, dynamic `calc()`).

## Shared axioms (apply always)

- **No design system = no UI work.** Every color, font size, and spacing value
  traces back to a token in `globals.css` or a named Tailwind scale. No raw
  hex in components. No arbitrary pixel values when a scale class exists.
- **Prefer the Tailwind scale over magic numbers.** `h-48` not `h-[200px]`,
  `min-h-44` not `min-h-[180px]`, `size-3` not `w-[13px] h-[13px]`,
  `rounded-sm` not `rounded-[2px]`, `max-w-md` not `max-w-[28rem]`. Use the
  arbitrary-value syntax `[...]` only when (a) the value is a CSS variable,
  `color-mix()`, or `calc()` that Tailwind can't express, or (b) it's a
  viewport-relative clamp that's intentionally not on the scale (`max-h-[90vh]`,
  `h-[80vh]`, `max-h-[min(480px,70vh)]`). Older widgets have arbitrary
  values that have scale equivalents — don't copy them; use the scale.
- **Don't copy bad patterns — even from this repo.** The frontend is not
  perfectly harmonious. Existing widgets carry hardcoded pixel values that
  have scale equivalents, inconsistent container systems (three card shells),
  and a11y shortcuts that wouldn't pass a fresh audit. **Reusing an
  established pattern is good; reusing a broken one is not.** When you spot a
  problem in neighboring code, name it, do better in the code you're writing,
  and (if the fix is small and safe) leave the neighbor better than you found
  it. "It was already like this" / "I kept it consistent" are not
  justifications. The goal is continuous improvement, not stasis. If the bad
  pattern is load-bearing or the fix is risky, leave a `// TODO:` naming the
  issue and move on. Don't rewrite the world unprompted — ask the user before
  a wider refactor. (This mirrors the repo-wide rule in
  `.ai/rules/code-style.md`.)
- **Don't reinvent the wheel.** Reuse the established patterns already in this
  repo (see "Shared primitives" above and the list below). When a pattern
  isn't here, reach for a well-known industry-standard approach (WCAG touch
  targets, WAI-ARIA Authoring Practices, Radix/shadcn patterns for menus and
  segmented controls, recharts responsive containers, CSS Grid/Flexbox with
  `minmax()` and `auto-fit` instead of media-query pixel math). Avoid niche
  libraries, bespoke re-implementations of solved problems, and any new
  dependency not already in `package.json`.
- **Mobile-first, multi-resolution.** Layouts must work at 375px and scale
  cleanly to 1280px+. Build the base styles for the narrowest target, add
  `sm:` / `md:` / `lg:` overrides only when the layout actually needs to
  reflow. Prefer responsive container queries and `auto-fit`/`minmax()` grid
  over hardcoded breakpoint jumps when the content can flow. Test mentally at
  375 / 768 / 1280. Horizontal scroll is acceptable for genuinely dense
  content (see `ActivityHeatmapWidget`) but not as a substitute for
  responsive layout.
- **Concrete reference = contract.** When the user supplies a screenshot,
  mockup, or URL to match, the implementation matches its tokens, layout
  geometry, copy, spacing, states, and responsive intent unless the user
  explicitly accepts a deviation.
- **Never weaken UX or flatten the surface to buy points.** No dropping
  animations, hiding content, simplifying interactions, or replacing
  rendered/lit material with flat fills for a Lighthouse score or a deadline.
- **GPU-composited animation only** — `transform`, `opacity`, `filter`. Never
  animate layout properties (`width`, `height`, `top`, `left`, …).
- **Slop motion is forbidden.** Every animation or hover maps to a real
  interaction, state change, or affordance. A hover that changes nothing, or
  motion on a non-interactive element, is slop — don't add it.
- **Accessibility is not optional.** Keyboard handlers, focus rings, aria
  labels/roles, and `aria-hidden` on decorative icons per
  `.ai/rules/accessibility.md`.
- **No emojis as icons.** SVG icon sets only (we use `lucide-react`).

## Established patterns (copy, don't reinvent)

When a new widget needs one of these, find the example and follow it:

- **WCAG touch targets** — interactive icon buttons use
  `min-h-[44px] min-w-[44px]` (arbitrary value is intentional: 44px is the
  WCAG 2.5.5 minimum, not on the Tailwind scale). See `Modal`'s close button,
  `AppHeader` nav buttons.
- **Modal / dialog** — Escape to close, focus save/restore on open/close,
  `role="dialog"` + `aria-modal="true"`, `aria-label` from title, body-scroll
  lock, 44×44 close button with focus ring. See `src/components/ui/Modal.tsx`.
  Copy verbatim for any new dialog.
- **Full-screen overlay shell** — backdrop + centered frame + header/body/
  footer slots. See `src/components/ui/CardShell.tsx`. Use for study-mode
  overlays, not modals.
- **Dashboard widget shell** — `rounded-xl border border-border-primary
  bg-surface-primary p-5 shadow-sm` + `<h3>` title + empty state. See
  `MemoryStagesWidget`. New dashboard widgets hardcode this shell (don't use
  `<Card>` — different padding, and the widgets predate the primitive).
- **Generic card** — `<Card variant="default|dashed|hover">` with optional
  `onClick` that turns it into a keyboard-accessible `role="button"` div. Use
  for one-off cards in deck pages and lists.
- **Toast** — `useToast()` returns `{ toast }`; call
  `toast({ title, description?, variant? })`. Already wired via
  `<ToastProvider>` in root layout.
- **Responsive chart** — recharts `<ResponsiveContainer width="100%"
  height="100%">` inside a fixed-height parent (`h-48`, `h-64`, …). Chart
  colors via `var(--chart-*)` in `fill` or `style`. See
  `MemoryStagesWidget`, `ReviewForecastWidget`.
- **Tinted background from a token** —
  `color-mix(in srgb, var(--accent-primary) 15%, transparent)` via
  `style={{ backgroundColor: … }}`. See `ActivityHeatmapWidget` intensity
  levels, `StreakWidget` flame circle.
- **Mobile drawer** — fixed left drawer, `w-72 max-w-[85vw]`, slides in via
  transform. See `AppHeader` mobile menu.
- **Searchable list** — `SearchBar` with Cmd/Ctrl+K shortcut, results panel,
  keyboard nav. See `src/components/layout/SearchBar.tsx`.

## Verification

- `npm run lint` and `npm run typecheck` are required by `AGENTS.md`. Run both
  after every frontend change.
- Visual QA: this repo has no Playwright / browser automation wired up. When
  the change is user-visible, build mentally against the three breakpoints
  above and flag to the user that a manual look at `npm run dev` is the
  final gate. Do not claim a visual is "done" from code alone.
- If a future task wires up Lighthouse / Playwright, prefer real-browser audits
  over the `lighthouse` CLI and run both mobile + desktop presets.

## When this skill does not apply

- Pure TypeScript/logic with no visual surface (state management, query
  hooks, API clients) — just write the code.
- Backend Route Handlers and Drizzle queries — use the `adding-backend-endpoint`
  skill instead.
- Schema changes — use `schema-migration`.

## Design tokens added (keep this list current as you add tokens)

_None yet. When you add a token to `globals.css`, add a one-line entry here:
`<token name> — <where used> — <why no existing token fit>`._

## Activation

Use for any frontend, web UI, UX, visual, design, styling, layout, animation,
accessibility, or component work — building, redesigning, or auditing. Not
for backend, CLI, or pure-logic tasks with no visual surface.