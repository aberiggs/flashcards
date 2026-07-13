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