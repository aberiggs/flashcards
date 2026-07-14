# Code Style

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

## Components

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

## Naming

| Thing                        | Convention                  |
| ---------------------------- | --------------------------- |
| Components / files           | `PascalCase`                |
| Route handler files          | `route.ts` (Next.js convention) |
| Variables / functions        | `camelCase`                 |
| Types / interfaces           | `PascalCase` (no `I` prefix) |
| Constants (module-level)     | `SCREAMING_SNAKE_CASE` + `as const` |

## Don't copy bad patterns

The codebase is not perfectly harmonious. There are anti-patterns, stale
conventions, and outright bad code. **Do not copy them for the sake of
"consistency."** When you spot a problem in neighboring code, name it, do
better in the code you're writing, and (if the fix is small and safe) leave
the neighbor better than you found it.

- Reusing an established pattern is good; reusing a broken one is not.
- "It was already like this" is not a justification. "I kept it consistent"
  is not a justification. The goal is continuous improvement, not stasis.
- If the bad pattern is load-bearing or the fix is risky, leave a `// TODO:`
  comment naming the issue and move on. Don't rewrite the world unprompted.
- When in doubt, ask the user before a wider refactor.