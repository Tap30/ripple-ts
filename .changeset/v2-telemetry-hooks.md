---
"@tapsioss/ripple-browser": minor
"@tapsioss/ripple-node": minor
---

Add telemetry hooks and automatic telemetry reporting.

#### New Features

##### Telemetry hooks for production monitoring

Fire-and-forget callbacks for observing SDK internals:

```ts
const client = new RippleClient({
  hooks: {
    onFlush: info => console.log(`Flushed ${info.eventCount} events`),
    onSendSuccess: info => metrics.increment("events.sent", info.batchSize),
    onSendFailure: info => alerts.notify(`Send failed: ${info.error}`),
    onRetry: info => console.log(`Retry #${info.attempt}`),
    onDrop: info => console.warn(`Dropped ${info.eventCount}: ${info.reason}`),
    onEnqueue: info => gauge.set("buffer_size", info.bufferSize),
  },
});
```

##### Automatic telemetry reporting

When enabled, the SDK automatically reports internal metrics to a dedicated endpoint:

```ts
const client = new RippleClient({
  telemetryOptions: {
    disabled: false,
    endpoint: "https://telemetry.example.com/sdk",
  },
});
```

Uses the configured `apiKey` and `apiKeyHeader` for authentication. User hooks
and auto-telemetry work together — both fire on each event.
