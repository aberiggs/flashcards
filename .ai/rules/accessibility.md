# Accessibility

- All icon-only buttons must have `aria-label`.
- Decorative Lucide icons: `<Icon className="w-4 h-4" aria-hidden />`.
- Non-`<button>` clickable elements need `role="button"`, `tabIndex={0}`, and an
  `onKeyDown` handler.
- Interactive elements: include `focus:outline-none focus:ring-2 focus:ring-[--accent-primary]`.