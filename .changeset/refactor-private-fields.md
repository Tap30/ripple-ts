---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

**Migrate private members to native ES private field syntax (`#`).**

All private fields and methods across `internals/core` and `packages/browser` have been migrated from the conventional `_` underscore prefix to native ES `#` private syntax. This enforces true encapsulation at the JavaScript engine level rather than relying on naming convention alone.

No public API changes.
