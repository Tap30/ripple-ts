---
"@tapsioss/ripple-browser": minor
---

Automatic `app_state_changed` tracking on visibility change.

#### New Features

The browser client now automatically tracks `app_state_changed` events when
the page visibility changes (`foreground` ↔ `background`). No configuration
needed — events are sent automatically after `init()`.

```ts
// Automatically tracked:
// { newState: "background", previousState: "foreground" }
// { newState: "foreground", previousState: "background" }
```

The listener is cleaned up on `dispose()`.
