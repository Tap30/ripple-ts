# TODOs

Improvement points for future versions of Ripple TypeScript SDKs.

## Critical

- [ ] **Fix event duplication in storage adapters** — `save()` merges persisted
      events with incoming events (`[...persisted, ...events]`), but the
      dispatcher already passes the full queue via
      `save(this._queue.toArray())`. This causes event duplication on every
      save. Either remove the merge logic or change the dispatcher to only pass
      new events.
