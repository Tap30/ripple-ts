---
"@tapsioss/ripple-browser": patch
"@tapsioss/ripple-node": patch
---

**Enhance browser compatibility by updating error handling syntax.**

This change refactors `catch {}` blocks to `catch (_) {}` to ensure broader compatibility, specifically for legacy iOS browsers that do not support optional catch binding (a feature introduced in ES2019).

**Why this change?**

While modern JavaScript environments support optional catch binding (e.g., `try { ... } catch { ... }`), our codebase targets ES2017. Legacy iOS browsers running older versions of Safari/WebKit do not recognize the `catch {}` syntax, leading to syntax errors and breaking application functionality on those devices.

By explicitly including the unused error parameter `_`, we ensure that the code remains valid ES2017, preventing syntax errors in environments that do not support the newer `catch` syntax. This maintains robust error handling across a wider range of user devices.

**Before:**

```ts
try {
  // ... some code that might throw
} catch {
  // Ignore error
}
```

**After:**

```ts
try {
  // ... some code that might throw
  
  // Use `catch (_) {}` instead of `catch {}` for ES2017 compatibility.
  // Older iOS Safari versions don't support optional catch binding.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (_) {
}
```
