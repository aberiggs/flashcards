# Do Not

- Add a global state library (Zustand, Redux, Jotai) without discussion.
- Add a test framework other than Vitest. Vitest + `@testcontainers/postgresql`
  is the chosen stack (see `stack-and-commands.md`); adding Jest/Playwright/etc.
  requires a discussion first.
- Use `console.log` in committed code; use `console.error` only in genuine error paths.
- Add Prettier or change the ESLint config without updating this file.