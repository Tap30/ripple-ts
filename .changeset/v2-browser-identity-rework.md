---
"@tapsioss/ripple-browser": major
---

Replace session-based identity with persistent anonymous ID.

#### Breaking Changes

##### `getSessionId()` removed, replaced by `getAnonymousId()`

The browser client no longer exposes a session ID. Instead, an anonymous ID is
persisted in `sessionStorage` and used for cross-event identity resolution.

```diff
-const sessionId = client.getSessionId();
+const anonymousId = client.getAnonymousId();
```

##### Default `sessionStoreKey` changed

The default storage key changed from `"ripple_session_id"` to
`"ripple_session"`.

##### `ua-parser-js` moved from `peerDependencies` to `dependencies`

Users no longer need to install `ua-parser-js` separately — it's now bundled
as a direct dependency.
