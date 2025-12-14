# Ripple SDK Playground

Manual testing environment for Ripple TypeScript SDKs (Browser and Node.js).

## Setup

```bash
# From project root
pnpm install
pnpm build

# Start the mock server and playground
pnpm dev
```

This will start:

- Mock API server on `http://localhost:3000`
- Browser playground on `http://localhost:5173`

## Browser Playground

Open `http://localhost:5173` in your browser.

### Test Cases

#### 1. Basic Event Tracking

- **Track Simple Event**: Track event without payload
- **Track Event with Payload**: Track event with custom data
- **Track Event with Metadata**: Track event with schema version

#### 2. Metadata Management

- **Set Metadata**: Add global metadata that attaches to all events
- **Track with Metadata**: Test typed metadata with TypeScript autocomplete

#### 3. Batch and Flush

- **Track 10 Events**: Test auto-flush at batch size (5 events)
- **Manual Flush**: Force flush queued events

#### 4. Storage Adapters

- **Test LocalStorage**: 5-10MB, permanent storage
- **Test SessionStorage**: 5-10MB, session-only storage
- **Test CookieStorage**: 4KB, configurable expiry

#### 5. Page Unload (Beacon API)

- **Track & Hide Tab**: Switch tabs to trigger `visibilitychange` → Beacon API
- **Track & Refresh Page**: Refresh to trigger `pagehide` → Beacon API

#### 6. Error Handling

- **Test Retry Logic**: Send to invalid endpoint to test exponential backoff

#### 7. Lifecycle Management

- **Dispose Client**: Clean up event listeners and timers
- **Clear Log**: Clear the console log

### How to Test

1. **Open DevTools** (F12) → Network tab
2. Click buttons to trigger events
3. Watch for:
   - POST requests to `/events` (fetch API)
   - Beacon requests (when switching tabs/refreshing)
   - Retry attempts on failures
4. Check browser storage:
   - Application tab → IndexedDB → `ripple_db`
   - Application tab → Local Storage
   - Application tab → Session Storage
   - Application tab → Cookies

## Node.js Playground

Run the Node.js playground:

```bash
# From playground directory
cd playground/node
tsx index.ts
```

### Test Cases

#### 1. Basic Configuration

- Initialize client with FileStorage adapter
- Verify file creation at `.ripple_events.json`

#### 2. Type-safe Metadata

- Set typed metadata with TypeScript autocomplete
- Track events with metadata attached

#### 3. Basic Event Tracking

- Track server lifecycle events
- Track API request events
- Track database query events

#### 4. Event with Metadata

- Track events with schema versioning

#### 5. Metadata Management

- Set global metadata (deployment, region, etc.)
- Verify metadata attached to all events

#### 6. Batch Processing

- Track 10 events to test auto-flush at batch size

#### 7. Manual Flush

- Force flush queued events

#### 8. Custom File Path

- Test FileStorage with custom path
- Verify file creation at custom location

#### 9. Error Handling

- Send to invalid endpoint
- Watch console for retry logs with exponential backoff

#### 10. High Volume

- Track 100 events rapidly
- Measure performance

#### 11. Different Event Types

- Error events
- Performance metrics
- Business events

#### 12. Lifecycle Management

- Final flush before disposal
- Clean up resources

### How to Test

1. Run `tsx index.ts` from `playground/node`
2. Watch console output for test results
3. Check created files:
   - `.ripple_events.json` (default storage)
   - `.ripple_typed_events.json` (typed client)
   - `./custom_events.json` (custom path)
4. Verify events sent to mock server (check server logs)

## Mock Server

The mock server (`server.ts`) provides:

- `POST /events` - Accepts event batches
- Logs received events to console
- Returns success/error responses for testing

## Testing Checklist

### Browser

- [ ] Events tracked successfully
- [ ] Auto-flush at batch size (5 events)
- [ ] Manual flush works
- [ ] Metadata attached to events
- [ ] Beacon API used on tab switch
- [ ] Beacon API used on page refresh
- [ ] Events persisted in IndexedDB
- [ ] Events restored after page reload
- [ ] Retry logic works on failure
- [ ] Dispose cleans up listeners

### Node.js

- [ ] Events tracked successfully
- [ ] Auto-flush at batch size (5 events)
- [ ] Manual flush works
- [ ] Metadata attached to events
- [ ] Events persisted to file
- [ ] Events restored from file
- [ ] Retry logic works on failure
- [ ] Custom file paths work
- [ ] High volume (100 events) works
- [ ] Dispose cleans up resources

## Troubleshooting

### Browser

- **Events not sending**: Check Network tab for errors
- **Storage not working**: Check browser storage quota
- **Beacon not triggering**: Ensure tab switch/refresh happens

### Node.js

- **File not created**: Check write permissions
- **Events not sending**: Ensure mock server is running
- **Retry not working**: Check console for error logs
