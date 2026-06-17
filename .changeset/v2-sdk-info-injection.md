---
"@tapsioss/ripple-browser": minor
"@tapsioss/ripple-node": minor
---

Build-time SDK info injection.

#### New Features

##### Automatic SDK name and version injection

`SDK_NAME` and `SDK_VERSION` are now injected at build time from each package's
`package.json`. The `_getSdkInfo()` abstract method on `Client` provides this to
the event `sdk` field, ensuring every event carries the correct package name and
version without manual updates.

The build step `build:inject-sdk-info` runs before package bundling via
`scripts/inject-sdk-info.ts`.
