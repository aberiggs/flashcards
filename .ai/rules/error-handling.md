# Error Handling (Client)

```ts
try {
  await doSomething();
} catch (err) {
  setError(err instanceof Error ? err.message : "An unexpected error occurred");
}
```

- Use `void expression()` to intentionally discard a promise in event handlers
  (e.g., `void signOut()`).
- Never swallow errors silently.