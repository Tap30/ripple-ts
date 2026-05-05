---
"@tapsioss/ripple-browser": minor
"@tapsioss/ripple-node": minor
---

**Replace multiple `HttpAdapter.send` parameters with a context object.**

This refactor simplifies the `HttpAdapter` interface by consolidating multiple parameters
into a single context object named `HttpAdapterContext`.

**Before:**

```ts
send(
  endpoint: string,
  events: Event[],
  headers: Record<string, string>,
  apiKeyHeader: string,
): Promise<HttpResponse>;
```

**After:**

```ts
// After
send(context: HttpAdapterContext): Promise<HttpResponse>;
```
