# Do Not

- Add a global state library (Zustand, Redux, Jotai) without discussion.
- Add a test framework other than Vitest. Vitest + `@testcontainers/postgresql`
  is the chosen stack (see `stack-and-commands.md`); adding Jest/Playwright/etc.
  requires a discussion first.
- Use `console.log` in committed code; use `console.error` only in genuine error paths.
- Add Prettier or change the ESLint config without updating this file.
- Add a platform-specific binary (e.g. `@esbuild/darwin-arm64`, `@swc/core-*`,
  `@rollup/rollup-*`) as a direct dependency. These are optional dependencies of
  their parent package and resolve automatically per-platform; pinning one
  breaks `npm ci` on other OS/arch combos (the cause of the #54 CI failure).