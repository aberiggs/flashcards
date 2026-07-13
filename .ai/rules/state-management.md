# State Management

- No global state library. Use React built-ins: `useState`, `useEffect`, `useRef`,
  `useCallback`.
- TanStack Query provides caching, refetch, and loading states. `useMutation` /
  `useQuery` hooks in `src/lib/hooks.ts` are the data layer — invalidate affected
  query keys in mutation `onSuccess` callbacks to keep the UI fresh.
- When you need a stable snapshot of data (e.g., during a study session), copy
  query results into local state at session start to prevent mid-session re-sorting
  from refetches.