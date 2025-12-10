// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-console */

import {
  FetchHttpAdapter,
  FileStorageAdapter,
  RippleClient,
} from "@tapsioss/ripple-node";

// Utility for logging
const log = (message: string): void => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const separator = (): void => {
  console.log("\n" + "=".repeat(60) + "\n");
};

log("Starting Node.js Playground...");
separator();

const client = new RippleClient(
  {
    endpoint: "http://localhost:3000/events",
    apiKey: "test-api-key",
    maxBatchSize: 5,
    maxRetries: 3,
    flushInterval: 5000,
  },
  {
    httpAdapter: new FetchHttpAdapter(),
    storageAdapter: new FileStorageAdapter(".ripple_events.json"),
  },
);

await client.init();
log("✓ Client initialized with FileStorage");

separator();
log("Test Case 2: Type-safe Context");

type AppContext = {
  userId: string;
  requestId: string;
  environment: string;
  serverVersion: string;
};

const typedClient = new RippleClient<AppContext>(
  {
    endpoint: "http://localhost:3000/events",
    apiKey: "test-api-key",
  },
  {
    storageAdapter: new FileStorageAdapter(".ripple_typed_events.json"),
  },
);

await typedClient.init();
typedClient.setContext("userId", "user-123");
typedClient.setContext("requestId", "req-abc-456");
typedClient.setContext("environment", "development");
typedClient.setContext("serverVersion", "1.0.0");
log("✓ Set typed context");

separator();
log("Test Case 3: Basic Event Tracking");

await client.track("server_start", {
  port: 3000,
  nodeVersion: process.version,
});
log("✓ Tracked: server_start");

await client.track("api_request", {
  method: "POST",
  path: "/api/users",
  statusCode: 201,
  duration: 45,
});
log("✓ Tracked: api_request");

await client.track("database_query", {
  query: "SELECT * FROM users",
  duration: 12,
  rows: 150,
});
log("✓ Tracked: database_query");

separator();
log("Test Case 4: Event with Metadata");

await client.track(
  "user_created",
  {
    userId: "user-789",
    email: "user@example.com",
    plan: "premium",
  },
  {
    schemaVersion: "2.0.0",
  },
);
log("✓ Tracked: user_created with metadata");

separator();
log("Test Case 5: Context Management");

client.setContext("deploymentId", "deploy-xyz-123");
client.setContext("region", "us-east-1");
log("✓ Set global context");

await typedClient.track("context_test", {
  message: "This event includes typed context",
});
log("✓ Tracked event with typed context");

separator();
log("Test Case 6: Batch Processing (10 events)");

for (let i = 0; i < 10; i++) {
  await client.track("batch_event", {
    index: i,
    timestamp: Date.now(),
  });
}

log("✓ Tracked 10 events (should auto-flush at batch size 5)");

separator();
log("Test Case 7: Manual Flush");

await client.track("pre_flush_event", { test: true });
await client.flush();
log("✓ Manually flushed events");

separator();
log("Test Case 8: Custom File Path");

const customPathClient = new RippleClient(
  {
    endpoint: "http://localhost:3000/events",
    apiKey: "test-api-key",
  },
  {
    storageAdapter: new FileStorageAdapter("./custom_events.json"),
  },
);

await customPathClient.init();
await customPathClient.track("custom_path_test", { path: "custom" });
await customPathClient.flush();
log("✓ Tested custom file path storage");

separator();
log("Test Case 9: Error Handling (Invalid Endpoint)");

const errorClient = new RippleClient({
  endpoint: "http://localhost:9999/invalid",
  apiKey: "test-api-key",
  maxRetries: 2,
});

await errorClient.init();
// await errorClient.track("error_test", { shouldFail: true });
// log("✓ Tracked event to invalid endpoint (check console for retry logs)");

// await new Promise(resolve => {
//   setTimeout(resolve, 5000);
// });

separator();
log("Test Case 10: High Volume (100 events)");

const startTime = performance.now();

for (let i = 0; i < 100; i++) {
  await client.track("high_volume_event", {
    index: i,
    batch: Math.floor(i / 10),
  });
}

const duration = performance.now() - startTime;

log(`✓ Tracked 100 events in ${duration}ms`);

separator();
log("Test Case 11: Different Event Types");

await client.track("error_occurred", {
  error: "Database connection failed",
  stack: "Error: Connection timeout...",
  severity: "high",
});
log("✓ Tracked: error_occurred");

await client.track("performance_metric", {
  metric: "response_time",
  value: 234,
  unit: "ms",
});
log("✓ Tracked: performance_metric");

await client.track("business_event", {
  event: "subscription_renewed",
  userId: "user-456",
  plan: "enterprise",
  amount: 999,
});
log("✓ Tracked: business_event");

separator();
log("Test Case 12: Lifecycle Management");

await client.flush();
log("✓ Final flush completed");

client.dispose();
log("✓ Client disposed");

separator();
log("Node.js Playground Complete!");
log("Check the following files:");
log("  - .ripple_events.json");
log("  - .ripple_typed_events.json");
log("  - ./custom_events.json");
log("Check console for retry logs and network requests");
separator();
