---
"@tapsioss/ripple-browser": minor
---

Automatic `app_state_changed` tracking and manual `openApp()`/`closeApp()` methods.

#### New Features

##### Auto-tracking visibility changes

The browser client automatically tracks `app_state_changed` events when page
visibility changes (`foreground` ↔ `background`). Starts after `init()`,
cleaned up on `dispose()`.

##### `openApp()` and `closeApp()`

Manual methods to explicitly signal app lifecycle state:

```ts
client.openApp();  // { newState: "opened", previousState: ... }
client.closeApp(); // { newState: "closed", previousState: ... }
```
