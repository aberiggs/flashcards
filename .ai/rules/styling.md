# Styling (Tailwind v4)

- **No `tailwind.config.*`** — configuration lives in `globals.css` via `@theme inline`.
- Use the CSS custom property tokens (`--surface-primary`, `--text-secondary`,
  `--accent-primary`, etc.) rather than raw hex values.
- Use `style={{ … }}` only when Tailwind can't express the value (CSS variables,
  `color-mix()`, dynamic `calc()` expressions).
- Conditional classes: template literals or a helper — avoid third-party `clsx` unless
  already present.