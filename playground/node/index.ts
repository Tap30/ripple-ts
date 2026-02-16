// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-console */

import { appendFileSync, writeFileSync } from "node:fs";

import {
  FetchHttpAdapter,
  LogLevel,
  NoOpStorageAdapter,
  RippleClient,
  type LoggerAdapter,
} from "@tapsioss/ripple-node";

class HybridLogger implements LoggerAdapter {
  private readonly _filePath: string;
  private readonly _level: LogLevel;
  private readonly _levelOrder = [
    LogLevel.DEBUG,
    LogLevel.INFO,
    LogLevel.WARN,
    LogLevel.ERROR,
    LogLevel.NONE,
  ] as const;

  constructor(filePath: string, level: LogLevel = LogLevel.INFO) {
    this._filePath = filePath;
    this._level = level;

    writeFileSync(this._filePath, "");
  }

  private _shouldLog(messageLevel: LogLevel): boolean {
    if (this._level === LogLevel.NONE) return false;

    return (
      this._levelOrder.indexOf(messageLevel) >=
      this._levelOrder.indexOf(this._level)
    );
  }

  private _log(
    level: LogLevel,
    consoleMethod: "debug" | "info" | "warn" | "error",
    message: string,
    args: unknown[],
  ): void {
    if (!this._shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0 ? ` ${JSON.stringify(args)}` : "";
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${argsStr}\n`;

    appendFileSync(this._filePath, line);
    console[consoleMethod](`[Ripple] ${message}`, ...args);
  }

  public debug(message: string, ...args: unknown[]): void {
    this._log(LogLevel.DEBUG, "debug", message, args);
  }

  public info(message: string, ...args: unknown[]): void {
    this._log(LogLevel.INFO, "info", message, args);
  }

  public warn(message: string, ...args: unknown[]): void {
    this._log(LogLevel.WARN, "warn", message, args);
  }

  public error(message: string, ...args: unknown[]): void {
    this._log(LogLevel.ERROR, "error", message, args);
  }
}

const log = (message: string): void => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const separator = (): void => {
  console.log("\n" + "=".repeat(60) + "\n");
};

log("Starting Node.js Playground...");
separator();

const client = new RippleClient({
  endpoint: "http://localhost:3000/events",
  apiKey: "test-api-key",
  maxBatchSize: 5,
  maxRetries: 3,
  flushInterval: 5000,
  httpAdapter: new FetchHttpAdapter(),
  storageAdapter: new NoOpStorageAdapter(),
  loggerAdapter: new HybridLogger("ripple.log", LogLevel.DEBUG),
});

await client.init();
log("✓ Client initialized with NoOpStorage");

separator();
log("Test Case 2: Basic Event Tracking");

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
log("Test Case 3: Event with Metadata");

await client.track(
  "user_created",
  {
    userId: "user-789",
    email: "user@example.com",
    plan: "premium",
  },
  {
    schemaVersion: "2.0.0",
    eventType: "user_lifecycle",
    source: "registration_api",
    experimentId: "onboarding-v2",
  },
);
log("✓ Tracked: user_created with rich metadata");

separator();
log("Test Case 4: Metadata Management");

client.setMetadata("deploymentId", "deploy-xyz-123");
client.setMetadata("region", "us-east-1");
log("✓ Set shared metadata");

separator();
log("Test Case 5: Batch Processing (10 events)");

for (let i = 0; i < 10; i++) {
  await client.track("batch_event", {
    index: i,
    timestamp: Date.now(),
  });
}

log("✓ Tracked 10 events (should auto-flush at batch size 5)");

separator();
log("Test Case 6: Dynamic Rebatching (25 events)");

log("Simulating offline accumulation scenario...");

for (let i = 0; i < 25; i++) {
  await client.track("rebatch_event", {
    index: i,
    batch: Math.floor(i / 5),
  });
}

log("✓ Tracked 25 events - flush will rebatch into 5 batches of 5 events each");
log("Check server logs to see multiple batch requests");

separator();
log("Test Case 7: Manual Flush");

await client.track("pre_flush_event", { test: true });
await client.flush();
log("✓ Manually flushed events");

separator();
log("Test Case 8: Multiple Client Instances");

const customPathClient = new RippleClient({
  endpoint: "http://localhost:3000/events",
  apiKey: "test-api-key",
  httpAdapter: new FetchHttpAdapter(),
  storageAdapter: new NoOpStorageAdapter(),
});

await customPathClient.init();
await customPathClient.track("custom_client_test", { instance: "secondary" });
await customPathClient.flush();
log("✓ Tested multiple client instances");

separator();
log("Test Case 9: Error Handling (Invalid Endpoint)");

try {
  const errorClient = new RippleClient({
    endpoint: "http://localhost:9999/invalid",
    apiKey: "test-api-key",
    maxRetries: 2,
    httpAdapter: new FetchHttpAdapter(),
    storageAdapter: new NoOpStorageAdapter(),
    loggerAdapter: new HybridLogger("ripple-error.log", LogLevel.WARN),
  });

  await errorClient.init();
  await errorClient.track("error_test", { shouldFail: true });
  await errorClient.flush();
  log(
    "✓ Tracked event to invalid endpoint (check ripple-error.log for retry logs)",
  );
} catch {
  log("✓ Error handling test completed (expected failure)");
}

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
log("  - ripple.log (SDK logs - empty if no errors)");
log("  - ripple-error.log (SDK logs from error test)");
separator();
