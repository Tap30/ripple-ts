---
"@tapsioss/ripple-browser": major
"@tapsioss/ripple-node": major
---

BREAKING CHANGE: Rename `ConsoleLoggerAdopter` to `ConsoleLoggerAdapter` to fix typo

If you're using the logger directly, update your imports:

```diff
- import { ConsoleLoggerAdopter } from '@tapsioss/ripple-browser';
+ import { ConsoleLoggerAdapter } from '@tapsioss/ripple-browser';

- const logger = new ConsoleLoggerAdopter(LogLevel.DEBUG);
+ const logger = new ConsoleLoggerAdapter(LogLevel.DEBUG);
```
