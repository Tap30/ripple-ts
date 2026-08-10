---
"@tapsioss/ripple-browser": patch
---

Deprecate "background" and "foreground" app state values

- Removed automatic background/foreground tracking via `visibilitychange` listener in the browser SDK.
- The `appOpened()` and `appClosed()` methods remain as the recommended way to track app lifecycle.
- Users can still programmatically call `client.events.appStateChanged()` with "background" or "foreground", but a deprecation warning will be logged.
- The initial app state is now `"closed"` instead of `"foreground"`.
