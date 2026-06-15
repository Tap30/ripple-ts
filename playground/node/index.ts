// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-console */

import { appendFileSync, writeFileSync } from "node:fs";

import {
  LogLevel,
  NoOpStorage,
  RippleClient,
  type LoggerAdapter,
} from "@tapsioss/ripple-node";

class HybridLogger implements LoggerAdapter {
  readonly #filePath: string;
  readonly #level: LogLevel;
  readonly #levelOrder = [
    LogLevel.DEBUG,
    LogLevel.INFO,
    LogLevel.WARN,
    LogLevel.ERROR,
    LogLevel.NONE,
  ] as const;

  constructor(filePath: string, level: LogLevel = LogLevel.INFO) {
    this.#filePath = filePath;
    this.#level = level;
    writeFileSync(this.#filePath, "");
  }

  #shouldLog(messageLevel: LogLevel): boolean {
    if (this.#level === LogLevel.NONE) return false;

    return (
      this.#levelOrder.indexOf(messageLevel) >=
      this.#levelOrder.indexOf(this.#level)
    );
  }

  #log(
    level: LogLevel,
    method: "debug" | "info" | "warn" | "error",
    message: string,
    args: unknown[],
  ): void {
    if (!this.#shouldLog(level)) return;

    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${args.length ? ` ${JSON.stringify(args)}` : ""}\n`;

    appendFileSync(this.#filePath, line);
    console[method](`[Ripple] ${message}`, ...args);
  }

  public debug(message: string, ...args: unknown[]): void {
    this.#log(LogLevel.DEBUG, "debug", message, args);
  }
  public info(message: string, ...args: unknown[]): void {
    this.#log(LogLevel.INFO, "info", message, args);
  }
  public warn(message: string, ...args: unknown[]): void {
    this.#log(LogLevel.WARN, "warn", message, args);
  }
  public error(message: string, ...args: unknown[]): void {
    this.#log(LogLevel.ERROR, "error", message, args);
  }
}

type CustomEvents = {
  server_start: { port: number; nodeVersion: string };
  api_request: {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
  };
  batch_event: { index: number; timestamp: number };
  high_volume_event: { index: number };
  error_test: { shouldFail: boolean };
};

const log = (msg: string) =>
  console.log(`[${new Date().toISOString()}] ${msg}`);

const separator = () => console.log("\n" + "=".repeat(60) + "\n");

log("Starting Node.js Playground...");
separator();

const client = new RippleClient<CustomEvents>({
  endpoint: "http://localhost:3000/events",
  apiKey: "test-api-key",
  batchOptions: { size: 5, interval: 5000 },
  retryOptions: { maxAttempts: 3 },
  storageAdapter: new NoOpStorage(),
  loggerAdapter: new HybridLogger("ripple.log", LogLevel.DEBUG),
});

await client.init();
log("✓ Client initialized");

separator();
log("Test: Predefined Events (client.events.*)");

await client.events.productViewed({
  product: { productId: "p-1", price: { amount: 49.99, currency: "USD" } },
});
log("✓ events.productViewed");

await client.events.orderCompleted({
  order: {
    orderId: "ord-1",
    products: [{ productId: "p-1", price: { amount: 49.99, currency: "USD" } }],
    totalValue: { amount: 54.99, currency: "USD" },
  },
});
log("✓ events.orderCompleted");

await client.events.paymentCaptured({
  payment: {
    paymentId: "pay-1",
    order: {
      orderId: "ord-1",
      products: [
        { productId: "p-1", price: { amount: 49.99, currency: "USD" } },
      ],
      totalValue: { amount: 54.99, currency: "USD" },
    },
    method: "credit_card",
    value: { amount: 54.99, currency: "USD" },
  },
});
log("✓ events.paymentCaptured");

separator();
log("Test: Convenience Methods");

await client.identify("user-123", { email: "user@example.com" });
log("✓ identify()");

await client.clicked({ elementId: "cta-btn", elementType: "button" });
log("✓ click()");

await client.viewed({ elementId: "hero-banner" });
log("✓ view()");

await client.screen({
  title: "Dashboard",
  url: "https://app.example.com/dashboard",
});
log("✓ screen()");

separator();
log("Test: Custom Events (client.track)");

await client.track("server_start", {
  port: 3000,
  nodeVersion: process.version,
});
log("✓ track() server_start");

await client.track("api_request", {
  method: "POST",
  path: "/api/users",
  statusCode: 201,
  duration: 45,
});
log("✓ track() api_request");

separator();
log("Test: Metadata");

client.setMetadata("region", "us-east-1");
client.setMetadata("deploymentId", "deploy-xyz");
log("✓ Set metadata");

separator();
log("Test: Batch (10 events)");

for (let i = 0; i < 10; i++) {
  await client.track("batch_event", { index: i, timestamp: Date.now() });
}

log("✓ Tracked 10 events (auto-flush at size 5)");

separator();
log("Test: High Volume (100 events)");

const start = performance.now();

for (let i = 0; i < 100; i++) {
  await client.track("high_volume_event", { index: i });
}

log(`✓ Tracked 100 events in ${(performance.now() - start).toFixed(1)}ms`);

separator();
log("Test: Flush & Dispose");

await client.flush();
log("✓ Flushed");

client.dispose();
log("✓ Disposed");

separator();
log("Node.js Playground Complete!");
