---
"@tapsioss/ripple-browser": major
"@tapsioss/ripple-node": major
---

Consolidate browser storage adapters into `WebStorage` and add `init()` to `StorageAdapter` interface.

#### Breaking Changes

##### `StorageAdapter` interface now requires `init()` method

All storage adapter implementations must implement `init(): Promise<void>`.

##### `IndexedDBAdapter`, `LocalStorageAdapter` removed from public exports

These are now internal to `WebStorage`. Use `WebStorage` directly:

```diff
-import { IndexedDBAdapter } from "@tapsioss/ripple-browser";
-const client = new RippleClient({ storageAdapter: new IndexedDBAdapter() });
+import { WebStorage } from "@tapsioss/ripple-browser";
+const client = new RippleClient({ storageAdapter: new WebStorage() });
```

##### Storage class renames

- `IndexedDBAdapter` → `IndexedDBStorage` (internal)
- `LocalStorageAdapter` → `LocalStorage` (internal)
- `NoOpStorageAdapter` → `NoOpStorage`

#### New Features

##### `WebStorage` — auto-detecting browser storage

Automatically selects the best available backend (IndexedDB → localStorage → NoOp):

```ts
import { WebStorage } from "@tapsioss/ripple-browser";

const client = new RippleClient({
  storageAdapter: new WebStorage(),           // auto-detect
  // or with preferences:
  storageAdapter: new WebStorage({ prefer: "localstorage", ttl: 3600000 }),
});
```

##### `StorageAdapter.init()` called automatically

The base `Client.init()` now calls `storageAdapter.init()` before restoring events. Custom storage adapters can use this for async setup.
