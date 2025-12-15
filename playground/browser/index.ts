import {
  ConsoleLoggerAdopter,
  FetchHttpAdapter,
  IndexedDBAdapter,
  LogLevel,
  RippleClient,
} from "@tapsioss/ripple-browser";

const client = new RippleClient({
  endpoint: "http://localhost:3000/events",
  apiKey: "test-api-key",
  maxBatchSize: 5,
  maxRetries: 3,
  flushInterval: 5000,
  sessionStoreKey: "my_app_session",
  adapters: {
    httpAdapter: new FetchHttpAdapter(),
    storageAdapter: new IndexedDBAdapter(),
    loggerAdapter: new ConsoleLoggerAdopter(LogLevel.DEBUG),
  },
});

await client.init();

const createButton = (props: {
  label: string;
  onClick: (event: MouseEvent) => void;
  variant?: "primary" | "secondary" | "danger";
}): HTMLButtonElement => {
  const { label, onClick, variant = "primary" } = props;

  const btn = document.createElement("button");

  btn.textContent = label;
  btn.style.cssText = `
    margin: 5px;
    padding: 10px 15px;
    font-size: 14px;
    cursor: pointer;
    border: none;
    border-radius: 4px;
    background: ${variant === "danger" ? "#dc3545" : variant === "secondary" ? "#6c757d" : "#007bff"};
    color: white;
  `;

  btn.addEventListener("click", onClick);

  return btn;
};

const createSection = (title: string): HTMLDivElement => {
  const section = document.createElement("div");

  section.style.cssText = `
    margin: 20px 0;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
  `;

  const heading = document.createElement("h3");

  heading.textContent = title;
  heading.style.cssText = "margin-top: 0;";
  section.appendChild(heading);

  return section;
};

const createLog = (): {
  element: HTMLDivElement;
  log: (message: string) => void;
  clear: () => void;
} => {
  const logDiv = document.createElement("div");

  logDiv.style.cssText = `
    margin: 10px 0;
    padding: 10px;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 12px;
  `;

  const log = (message: string): void => {
    const entry = document.createElement("div");

    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
  };

  const clear = (): void => {
    logDiv.innerHTML = "";
  };

  return { element: logDiv, log, clear };
};

const logger = createLog();

document.body.appendChild(logger.element);

const basicSection = createSection("Basic Event Tracking");

document.body.appendChild(basicSection);

const trackSimpleBtn = createButton({
  label: "Track Simple Event",
  onClick: () => {
    void (async () => {
      await client.track("button_click");
      logger.log("Tracked: button_click");
    })();
  },
});

const trackWithPayloadBtn = createButton({
  label: "Track Event with Payload",
  onClick: () => {
    void (async () => {
      await client.track("user_action", {
        action: "click",
        target: "button",
        timestamp: Date.now(),
      });
      logger.log("Tracked: user_action with payload");
    })();
  },
});

const trackWithMetadataBtn = createButton({
  label: "Track Event with Metadata",
  onClick: () => {
    void (async () => {
      await client.track(
        "form_submit",
        { formId: "contact-form", fields: 5 },
        {
          schemaVersion: "1.0.0",
          eventType: "user_interaction",
          source: "web",
        },
      );
      logger.log("Tracked: form_submit with typed metadata");
    })();
  },
});

const trackWithCustomMetadataBtn = createButton({
  label: "Track with Custom Metadata",
  onClick: () => {
    void (async () => {
      await client.track(
        "purchase_completed",
        { orderId: "order-123", amount: 99.99 },
        {
          schemaVersion: "2.1.0",
          eventType: "conversion",
          source: "checkout_page",
          experimentId: "exp-456",
          timestamp: Date.now(),
        },
      );
      logger.log("Tracked: purchase_completed with rich metadata");
    })();
  },
});

basicSection.appendChild(trackSimpleBtn);
basicSection.appendChild(trackWithPayloadBtn);
basicSection.appendChild(trackWithMetadataBtn);
basicSection.appendChild(trackWithCustomMetadataBtn);

const metadataSection = createSection("Metadata Management");

document.body.appendChild(metadataSection);

const setMetadataBtn = createButton({
  label: "Set Metadata",
  onClick: () => {
    const random = Math.random().toString(36).substring(7);

    client.setMetadata(`key_${random}`, `value_${random}`);
    logger.log(`Set metadata: key_${random}`);
  },
});

const trackWithSharedMetadataBtn = createButton({
  label: "Track with Shared Metadata",
  onClick: () => {
    void (async () => {
      await client.track("metadata_test");
      logger.log("Tracked event with shared metadata");
    })();
  },
});

metadataSection.appendChild(setMetadataBtn);
metadataSection.appendChild(trackWithSharedMetadataBtn);

const batchSection = createSection("Batch and Flush");

document.body.appendChild(batchSection);

const trackMultipleBtn = createButton({
  label: "Track 10 Events (Batch Test)",
  onClick: () => {
    void (async () => {
      for (let i = 0; i < 10; i++) {
        await client.track("batch_event", { index: i });
      }

      logger.log("Tracked 10 events (should auto-flush at batch size 5)");
    })();
  },
});

const manualFlushBtn = createButton({
  label: "Manual Flush",
  onClick: () => {
    void (async () => {
      await client.flush();
      logger.log("Manually flushed events");
    })();
  },
  variant: "secondary",
});

batchSection.appendChild(trackMultipleBtn);
batchSection.appendChild(manualFlushBtn);

const unloadSection = createSection("Page Unload");

document.body.appendChild(unloadSection);

const testRefreshBtn = createButton({
  label: "Track & Refresh Page",
  onClick: () => {
    void (async () => {
      await client.track("refresh_test", { beforeRefresh: true });
      logger.log("Tracked event. Refreshing in 1 second...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    })();
  },
});

unloadSection.appendChild(testRefreshBtn);

const errorSection = createSection("Error Handling");

document.body.appendChild(errorSection);

const testRetryBtn = createButton({
  label: "Test Retry Logic (Invalid Endpoint)",
  onClick: () => {
    void (async () => {
      const errorClient = new RippleClient({
        endpoint: "http://localhost:9999/invalid",
        apiKey: "test-key",
        maxRetries: 2,
        adapters: {
          httpAdapter: new FetchHttpAdapter(),
          storageAdapter: new IndexedDBAdapter(),
          loggerAdapter: new ConsoleLoggerAdopter(LogLevel.WARN),
        },
      });

      await errorClient.init();
      await errorClient.track("error_test", { shouldFail: true });
      logger.log(
        "Tracked event to invalid endpoint (check console for retries)",
      );
    })();
  },
});

errorSection.appendChild(testRetryBtn);

const lifecycleSection = createSection("Lifecycle Management");

document.body.appendChild(lifecycleSection);

const disposeBtn = createButton({
  label: "Dispose Client",
  onClick: () => {
    client.dispose();
    logger.log("Client disposed (event listeners removed)");
  },
  variant: "danger",
});

const clearLogBtn = createButton({
  label: "Clear Log",
  onClick: () => {
    logger.clear();
  },
  variant: "secondary",
});

lifecycleSection.appendChild(disposeBtn);
lifecycleSection.appendChild(clearLogBtn);

// Initial log
logger.log("Browser playground initialized");
logger.log("Client ready with IndexedDB storage");
logger.log("Open DevTools Network tab to see requests");
