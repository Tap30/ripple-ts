---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

Add disposal state tracking to prevent operations after client disposal. The client now tracks disposal state with a `_disposed` flag that prevents `track()` calls from re-initializing a disposed client. Explicit `init()` call is required to re-enable a disposed client.
