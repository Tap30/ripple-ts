import {
  ConsoleLogger,
  LogLevel,
  RippleClient,
  WebStorage,
} from "@tapsioss/ripple-browser";

type CustomEvents = {
  button_click: Record<string, unknown>;
  user_action: { action: string; target: string; timestamp: number };
  form_submit: { formId: string; fields: number };
  batch_event: { index: number };
  rebatch_event: { index: number; timestamp: number };
  refresh_test: { beforeRefresh: boolean };
  metadata_test: Record<string, unknown>;
};

const client = new RippleClient<CustomEvents>({
  endpoint: "http://localhost:3000/events",
  apiKey: "test-api-key",
  batchOptions: { size: 5, interval: 5000 },
  retryOptions: { maxAttempts: 3 },
  sessionStoreKey: "my_app_session",
  storageAdapter: new WebStorage(),
  loggerAdapter: new ConsoleLogger(LogLevel.DEBUG),
});

await client.init();

const createButton = (props: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
}): HTMLButtonElement => {
  const btn = document.createElement("button");

  btn.textContent = props.label;
  btn.style.cssText = `
    margin: 5px; padding: 10px 15px; font-size: 14px; cursor: pointer;
    border: none; border-radius: 4px; color: white;
    background: ${props.variant === "danger" ? "#dc3545" : props.variant === "secondary" ? "#6c757d" : "#007bff"};
  `;
  btn.addEventListener("click", props.onClick);

  return btn;
};

const createSection = (title: string): HTMLDivElement => {
  const section = document.createElement("div");

  section.style.cssText =
    "margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px;";

  const heading = document.createElement("h3");

  heading.textContent = title;
  section.appendChild(heading);

  return section;
};

const logDiv = document.createElement("div");

logDiv.style.cssText =
  "padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px;";
document.body.appendChild(logDiv);

const log = (msg: string) => {
  const entry = document.createElement("div");

  entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
};

// Predefined Events Section
const predefinedSection = createSection(
  "Predefined CDP Events (client.events.*)",
);

document.body.appendChild(predefinedSection);

predefinedSection.appendChild(
  createButton({
    label: "Product Viewed",
    onClick: () => {
      void client.events
        .productViewed({
          product: {
            productId: "p-123",
            price: { amount: 29.99, currency: "USD" },
          },
        })
        .then(() => log("events.productViewed tracked"));
    },
  }),
);

predefinedSection.appendChild(
  createButton({
    label: "Order Completed",
    onClick: () => {
      void client.events
        .orderCompleted({
          order: {
            orderId: "ord-456",
            products: [
              { productId: "p-123", price: { amount: 29.99, currency: "USD" } },
            ],
            totalValue: { amount: 34.99, currency: "USD" },
          },
        })
        .then(() => log("events.orderCompleted tracked"));
    },
  }),
);

predefinedSection.appendChild(
  createButton({
    label: "Payment Captured",
    onClick: () => {
      void client.events
        .paymentCaptured({
          payment: {
            paymentId: "pay-1",
            order: {
              orderId: "ord-456",
              products: [
                {
                  productId: "p-123",
                  price: { amount: 29.99, currency: "USD" },
                },
              ],
              totalValue: { amount: 34.99, currency: "USD" },
            },
            method: "credit_card",
            value: { amount: 34.99, currency: "USD" },
          },
        })
        .then(() => log("events.paymentCaptured tracked"));
    },
  }),
);

// Convenience Methods Section
const convenienceSection = createSection("Convenience Methods");

document.body.appendChild(convenienceSection);

convenienceSection.appendChild(
  createButton({
    label: "Identify User",
    onClick: () => {
      void client
        .identify("user-123", { email: "user@example.com", firstName: "John" })
        .then(() => log("identify() tracked"));
    },
  }),
);

convenienceSection.appendChild(
  createButton({
    label: "Click Event",
    onClick: () => {
      void client
        .clicked({ elementId: "buy-btn", elementType: "button" })
        .then(() => log("clicked() tracked"));
    },
  }),
);

convenienceSection.appendChild(
  createButton({
    label: "Screen (Auto-Capture)",
    onClick: () => {
      void client.screen().then(() => log("screen() tracked (auto-captured)"));
    },
  }),
);

convenienceSection.appendChild(
  createButton({
    label: "Open App",
    onClick: () => {
      client.appOpened();
      log("appOpened() tracked");
    },
  }),
);

convenienceSection.appendChild(
  createButton({
    label: "Close App",
    onClick: () => {
      client.appClosed();
      log("appClosed() tracked");
    },
  }),
);

// Custom Events Section
const customSection = createSection("Custom Events (client.track)");

document.body.appendChild(customSection);

customSection.appendChild(
  createButton({
    label: "Track Custom Event",
    onClick: () => {
      void client
        .track("form_submit", { formId: "contact", fields: 5 }, "1.0.0")
        .then(() => log("track() custom event with schemaVersion"));
    },
  }),
);

// Batch Section
const batchSection = createSection("Batch & Flush");

document.body.appendChild(batchSection);

batchSection.appendChild(
  createButton({
    label: "Track 10 Events",
    onClick: () => {
      void (async () => {
        for (let i = 0; i < 10; i++)
          await client.track("batch_event", { index: i });
        log("Tracked 10 events (auto-flush at size 5)");
      })();
    },
  }),
);

batchSection.appendChild(
  createButton({
    label: "Manual Flush",
    onClick: () => {
      void client.flush().then(() => log("Flushed"));
    },
    variant: "secondary",
  }),
);

// Lifecycle Section
const lifecycleSection = createSection("Lifecycle");

document.body.appendChild(lifecycleSection);

lifecycleSection.appendChild(
  createButton({
    label: "Dispose",
    onClick: () => {
      client.dispose();
      log("Disposed");
    },
    variant: "danger",
  }),
);

lifecycleSection.appendChild(
  createButton({
    label: "Clear Log",
    onClick: () => {
      logDiv.innerHTML = "";
    },
    variant: "secondary",
  }),
);

log("Browser playground initialized");
log(`Anonymous ID: ${client.getAnonymousId()}`);
