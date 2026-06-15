---
"@tapsioss/ripple-browser": minor
"@tapsioss/ripple-node": minor
---

Add `screen()` method for page/screen view tracking.

#### New Features

##### Browser: `screen(payload?, schemaVersion?)`

Auto-captures page info from the browser environment:

- `title` — from `document.title`
- `url` — from `location.href`
- `pathname` — from `location.pathname`
- `referrer` — from `document.referrer`
- `search` — from `location.search`
- `keywords` — from `<meta name="keywords">` tag
- `campaign` — from UTM query parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`)

Provided payload fields take precedence over auto-captured values.

```ts
await client.screen(); // fully auto-captured
await client.screen({ title: "Custom Title" }); // override title only
```

##### Node: `screen(payload, schemaVersion?)`

Requires a `ScreenPayload` — no auto-capture in server environments.

```ts
await client.screen({ title: "Dashboard", url: "/dashboard" });
```
