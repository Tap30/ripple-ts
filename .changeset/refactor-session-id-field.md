---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

**Replace `_setSessionId()` method with a `protected _sessionId` field.**

The protected `_setSessionId(sessionId)` method has been removed in favor of a directly accessible `protected _sessionId` field. Subclasses can now assign the session ID directly instead of going through a setter method.

No public API changes.
