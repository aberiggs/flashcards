# TypeScript

- **Strict mode** is enabled in `tsconfig.json`.
- Root target: `ES2017`.
- **Path alias**: `@/*` → `./src/*`. Use `@/` for all intra-`src/` imports.
- Never use `any`; prefer `unknown` + type guards when the shape is truly unknown.
- Avoid type assertions (`as Foo`) unless bridging external API responses that are
  already validated.
- `interface` for object shapes; `type` for unions, intersections, and aliases.
- Do **not** prefix interface names with `I`.