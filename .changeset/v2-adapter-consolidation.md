---
"@tapsioss/ripple-browser": major
"@tapsioss/ripple-node": major
---

Consolidate HTTP and logger adapters into core.

#### Breaking Changes

##### `FetchHttpAdapter` removed from packages

The package-specific `FetchHttpAdapter` exports have been removed. The built-in
`HttpClient` from core is now used by default — no adapter needed in config.

```diff
-import { FetchHttpAdapter } from "@tapsioss/ripple-browser";
-
 const client = new RippleClient({
   apiKey: "your-api-key",
   endpoint: "https://api.example.com/events",
-  httpAdapter: new FetchHttpAdapter(),
   storageAdapter: new IndexedDBAdapter(),
 });
```

For custom HTTP implementations, pass `httpAdapter` with your own `HttpAdapter`.

##### Logger class renames

- `ConsoleLoggerAdapter` → `ConsoleLogger`
- `NoOpLoggerAdapter` → `NoOpLogger`

#### New Features

##### `httpAdapter` is now optional

The built-in isomorphic `HttpClient` (fetch-based with `keepalive`) is used by
default. Only `storageAdapter` remains required.

##### `HttpClient` exported from both packages

```ts
import { HttpClient } from "@tapsioss/ripple-browser";
import { HttpClient } from "@tapsioss/ripple-node";
```
