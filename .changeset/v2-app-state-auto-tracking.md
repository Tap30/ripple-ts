---
"@tapsioss/ripple-browser": minor
---

Automatic `app_state_changed` tracking and manual `appOpened()`/`appClosed()` methods.

#### New Features

##### Auto-tracking visibility changes

The browser client automatically tracks `app_state_changed` events when page
visibility changes (`foreground` ↔ `background`). Starts after `init()`,
cleaned up on `dispose()`.

##### `appOpened()` and `appClosed()`

Manual methods to explicitly signal app lifecycle state:

```ts
client.appOpened();  // { newState: "opened", previousState: ... }
client.appClosed(); // { newState: "closed", previousState: ... }
```
