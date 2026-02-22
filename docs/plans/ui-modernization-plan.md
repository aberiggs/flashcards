# UI Modernization Plan

Comprehensive audit and modernization of the flashcards app UI for professional quality,
responsive design, and accessibility across all device sizes.

**Created:** 2026-02-21
**Status:** Complete

---

## Audit Summary

| Severity | Count | Category |
|----------|-------|----------|
| Critical | 4 | Mobile nav, dark mode breakage, touch targets, a11y |
| Medium | 12 | Consistency, responsive gaps, dead UI |
| Low | 10 | Maintainability, minor mobile tweaks |

---

## Phase 1: Design Tokens & Foundation

- [x] **1.1** Add semantic status color tokens (`--status-error`, `--status-success`,
  `--status-warning`, `--status-info`, `--status-close`) to `globals.css` with
  light + dark variants. Map them into the `@theme inline` block for Tailwind usage.
  Also added `--status-*-bg`, `--status-*-border`, `--status-*-text` for each.
- [x] **1.2** Consolidate duplicated dark theme block in `globals.css` using CSS
  `@mixin dark-tokens` pattern. Scope the global `*` transition to only
  `background-color` and `border-color` (removed `color` to avoid SVG conflicts).
- [x] **1.3** Standardize border-radius: `rounded-xl` for cards/widgets, `rounded-lg`
  for buttons/inputs. Update `Card.tsx` to `rounded-xl`. Add `shadow-sm` to the base
  `Card` component. `dashed` variant gets `shadow-none` override.
- [x] **1.4** Standardize button sizing: `py-2.5` minimum on all buttons. Remove the
  one-off `hover:scale-105 active:scale-95` transforms from `CreateDeckModal`.

## Phase 2: Mobile Navigation & Layout

- [x] **2.1** Add hamburger + slide-out drawer mobile navigation to `AppHeader.tsx`.
  Include Home, Decks, and Settings links. Visible below `md` breakpoint. Includes
  Escape key dismissal, body scroll lock, backdrop click to close.
- [x] **2.2** Fix `StreakWidget` responsive layout: stacks vertically on mobile with
  horizontal divider swap, sub-stats spread evenly with `flex-1`.
- [x] **2.3** Raise `text-[10px]` (heatmap labels/legend) and `text-[11px]` (card
  preview) to `text-xs` minimum for accessibility.
- [x] **2.4** Unify max-width containers to `max-w-5xl` across all content pages
  (dashboard, decks list, deck detail, study, options). Header stays at `max-w-7xl`.

## Phase 3: Dark Mode & Theming Fixes

- [x] **3.1** Fix sign-in buttons: Google button uses `bg-surface-primary text-text-primary
  border-border-secondary`. GitHub button keeps brand hex but gets `border-border-primary`.
  Divider and "or" text use theme tokens.
- [x] **3.2** Fix confidence rating buttons (study page): replaced `bg-red-50`,
  `bg-orange-50`, `bg-yellow-50`, `bg-green-50` with `bg-status-error-bg`,
  `bg-status-close-bg`, `bg-status-warning-bg`, `bg-status-success-bg`.
- [x] **3.3** Fix session-complete screen: `bg-green-50` -> `bg-status-success-bg`,
  `text-green-600` -> `text-status-success-text`.
- [x] **3.4** Fix error/warning alerts in `GenerateCardsModal.tsx`: reject/approve
  buttons and error/count-warning alerts all use status tokens.

## Phase 4: Touch Targets & Accessibility

- [x] **4.1** Increase touch targets to 44px minimum: `AppHeader` icon buttons get
  `min-h-[44px] min-w-[44px]`, `Modal` close button enlarged, `CardViewerModal`
  mobile nav arrows enlarged, `CardEditForm` buttons to `py-2.5`, deck detail
  action buttons to `py-2.5`, options remove button gets proper padding.
- [x] **4.2** Fix `Card` component: add `role="button"`, `tabIndex={0}`, and
  `onKeyDown` handler (Enter/Space) when `onClick` is provided.
- [x] **4.3** Fix `Modal`/overlay accessibility: `role="dialog"`, `aria-modal="true"`,
  focus management (focus dialog on open, restore previous focus on close). Applied
  to `Modal.tsx`, `CardViewerModal.tsx`, `CardShell.tsx`.
- [x] **4.4** Fix `ThemeToggle`: add `aria-label`, `role="radio"`, `aria-checked`,
  and focus rings on each button. Wrap in `role="radiogroup"`.

## Phase 5: Component Polish & Consistency

- [x] **5.1** Fix `FlipCard` padding: `p-4 sm:p-8` for more room on mobile. Add
  `pre`/code block styling to `MarkdownContent.tsx` with `overflow-x-auto` and
  themed backgrounds. Distinguish inline vs fenced code.
- [x] **5.2** Remove non-functional UI from Options page: dead checkboxes (study
  preferences) and data management buttons removed entirely. Updated all section
  cards to `rounded-xl shadow-sm` for consistency.
- [x] **5.3** Improve `CardPreview` responsive sizing: `h-32 sm:h-[140px]`,
  `p-4 sm:p-5`, `text-[11px]` -> `text-xs`.

## Phase 6: Final Polish

- [x] **6.1** Add entrance animations: `animate-fade-in-up` and `animate-fade-in`
  keyframes in `globals.css`, applied to dashboard and sign-in page main content.
  Mobile drawer backdrop uses `animate-fade-in`.
- [x] **6.2** Verified consistent empty states: all dashboard widgets, deck detail
  loading skeletons, and empty card browser use matching pattern.
- [x] **6.3** `npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass clean.
  Landing page feature cards and sign-in box updated to `rounded-xl shadow-sm`.
  Study card `min-h-[400px]` made responsive: `min-h-[300px] sm:min-h-[400px]`.

## Files Modified

| File | Changes |
|------|---------|
| `src/app/globals.css` | Status tokens, consolidated dark theme, scoped transitions, entrance animations |
| `src/app/page.tsx` | Dark mode sign-in fixes, `rounded-xl`, `max-w-5xl`, entrance animation |
| `src/app/(protected)/decks/page.tsx` | `max-w-5xl` |
| `src/app/(protected)/decks/[id]/page.tsx` | `max-w-5xl`, button touch targets |
| `src/app/(protected)/decks/[id]/study/page.tsx` | `max-w-5xl`, status tokens, responsive card height |
| `src/app/(protected)/options/page.tsx` | `max-w-5xl`, removed dead UI, `rounded-xl`, touch targets |
| `src/components/layout/AppHeader.tsx` | Hamburger + slide-out drawer, touch targets |
| `src/components/ui/Card.tsx` | `rounded-xl`, `shadow-sm`, a11y (role/tabIndex/onKeyDown) |
| `src/components/ui/Modal.tsx` | `role="dialog"`, focus management, touch targets, `rounded-xl` |
| `src/components/ui/CardShell.tsx` | `role="dialog"`, `aria-modal` |
| `src/components/ui/MarkdownContent.tsx` | Code block styling (pre + fenced code) |
| `src/components/features/dashboard/StreakWidget.tsx` | Responsive stacking layout |
| `src/components/features/dashboard/ActivityHeatmapWidget.tsx` | Font sizes raised to `text-xs` |
| `src/components/features/decks/CardPreview.tsx` | Responsive height/padding, `text-xs` |
| `src/components/features/decks/FlipCard.tsx` | Responsive padding `p-4 sm:p-8` |
| `src/components/features/decks/CardViewerModal.tsx` | `role="dialog"`, mobile touch targets |
| `src/components/features/decks/CardEditForm.tsx` | Button touch targets `py-2.5` |
| `src/components/features/decks/CreateDeckModal.tsx` | Button sizing, removed scale transforms |
| `src/components/features/decks/GenerateCardsModal.tsx` | Status tokens for buttons/alerts |
| `src/components/theme/ThemeToggle.tsx` | `aria-label`, focus rings, radio role |
