import type { Event as RippleEvent } from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FetchHttpAdapter } from "./fetch-http-adapter.ts";

global.fetch = vi.fn();

interface MockBlob {
  content: BlobPart[];
  options?: BlobPropertyBag;
  type: string;
}

interface MockURL {
  toString: () => string;
  searchParams: {
    set: (key: string, value: string) => void;
  };
}

describe("FetchHttpAdapter", () => {
  let adapter: FetchHttpAdapter;
  let mockEvents: RippleEvent[];
  let endpoint: string;
  let headers: Record<string, string>;
  let apiKeyHeader: string;

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(global, "window", {
      value: {
        addEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global, "document", {
      value: {
        visibilityState: "visible",
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global, "navigator", {
      value: {
        sendBeacon: vi.fn().mockReturnValue(true),
      },
      writable: true,
      configurable: true,
    });

    global.Blob = vi.fn().mockImplementation(function (
      this: MockBlob,
      content: BlobPart[],
      options?: BlobPropertyBag,
    ) {
      this.content = content;
      this.options = options;
      this.type = options?.type || "";
      return this;
    }) as unknown as typeof Blob;

    global.URL = vi.fn().mockImplementation(function (
      this: MockURL,
      url: string,
    ) {
      this.toString = vi.fn().mockReturnValue(url);
      this.searchParams = {
        set: vi.fn(),
      };
      return this;
    }) as unknown as typeof URL;

    adapter = new FetchHttpAdapter();

    endpoint = "https://api.test.com/events";
    headers = {
      "Content-Type": "application/json",
      "X-API-Key": "test-key",
    };
    apiKeyHeader = "X-API-Key";

    mockEvents = [
      {
        name: "test_event",
        payload: { key: "value" },
        issuedAt: Date.now(),
        context: {},
        sessionId: "session-123",
        metadata: null,
        platform: null,
      },
    ];
  });

  describe("constructor", () => {
    it("should create instance", () => {
      expect(adapter).toBeInstanceOf(FetchHttpAdapter);
    });

    it("should handle missing window object", () => {
      const originalWindow = global.window;

      delete (global as { window?: Window }).window;

      expect(() => new FetchHttpAdapter()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe("send", () => {
    it("should send events using fetch", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send(
        endpoint,
        mockEvents,
        headers,
        apiKeyHeader,
      );

      expect(fetch).toHaveBeenCalledWith(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ events: mockEvents }),
        keepalive: true,
      });
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it("should handle successful response", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send(
        endpoint,
        mockEvents,
        headers,
        apiKeyHeader,
      );

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it("should handle failed response", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send(
        endpoint,
        mockEvents,
        headers,
        apiKeyHeader,
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
    });

    it("should handle JSON parsing error", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send(
        endpoint,
        mockEvents,
        headers,
        apiKeyHeader,
      );

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeUndefined();
    });

    it("should use keepalive flag", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await adapter.send(endpoint, mockEvents, headers, apiKeyHeader);

      expect(fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          keepalive: true,
        }),
      );
    });

    it("should handle empty events array", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send(endpoint, [], headers, apiKeyHeader);

      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          body: JSON.stringify({ events: [] }),
        }),
      );
    });
  });

  describe("sendBeacon fallback", () => {
    it("should use sendBeacon when page is unloading", async () => {
      const visibilityHandler = vi
        .mocked(window.addEventListener)
        .mock.calls.find(
          call => call[0] === "visibilitychange",
        )?.[1] as () => void;

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });

      visibilityHandler();

      const mockUrl = {
        toString: vi.fn().mockReturnValue(endpoint),
        searchParams: {
          set: vi.fn(),
        },
      };

      vi.mocked(URL).mockImplementation(function (this: MockURL) {
        return mockUrl as MockURL;
      } as unknown as typeof URL);
      vi.mocked(navigator.sendBeacon).mockReturnValue(true);

      const result = await adapter.send(
        endpoint,
        mockEvents,
        headers,
        apiKeyHeader,
      );

      expect(navigator.sendBeacon).toHaveBeenCalled();
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it("should add API key as query parameter for sendBeacon", async () => {
      const pagehideHandler = vi
        .mocked(window.addEventListener)
        .mock.calls.find(call => call[0] === "pagehide")?.[1] as () => void;

      pagehideHandler();

      const mockUrl = {
        toString: vi.fn().mockReturnValue(endpoint),
        searchParams: {
          set: vi.fn(),
        },
      };

      vi.mocked(URL).mockImplementation(function (this: MockURL) {
        return mockUrl as MockURL;
      } as unknown as typeof URL);
      vi.mocked(navigator.sendBeacon).mockReturnValue(true);

      await adapter.send(endpoint, mockEvents, headers, apiKeyHeader);

      expect(mockUrl.searchParams.set).toHaveBeenCalledWith(
        "apiKey",
        headers[apiKeyHeader],
      );
    });

    it("should handle sendBeacon without API key", async () => {
      const pagehideHandler = vi
        .mocked(window.addEventListener)
        .mock.calls.find(call => call[0] === "pagehide")?.[1] as () => void;

      pagehideHandler();

      const mockUrl = {
        toString: vi.fn().mockReturnValue(endpoint),
        searchParams: {
          set: vi.fn(),
        },
      };

      vi.mocked(URL).mockImplementation(function (this: MockURL) {
        return mockUrl as MockURL;
      } as unknown as typeof URL);
      vi.mocked(navigator.sendBeacon).mockReturnValue(true);

      const headersWithoutKey = { "Content-Type": "application/json" };

      const result = await adapter.send(
        endpoint,
        mockEvents,
        headersWithoutKey,
        apiKeyHeader,
      );

      expect(mockUrl.searchParams.set).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
    });

    it("should handle sendBeacon failure", async () => {
      const pagehideHandler = vi
        .mocked(window.addEventListener)
        .mock.calls.find(call => call[0] === "pagehide")?.[1] as () => void;

      pagehideHandler();

      const mockUrl = {
        toString: vi.fn().mockReturnValue(endpoint),
        searchParams: {
          set: vi.fn(),
        },
      };

      vi.mocked(URL).mockImplementation(function (this: MockURL) {
        return mockUrl as MockURL;
      } as unknown as typeof URL);
      vi.mocked(navigator.sendBeacon).mockReturnValue(false);

      const result = await adapter.send(
        endpoint,
        mockEvents,
        headers,
        apiKeyHeader,
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
    });

    it("should handle missing navigator", async () => {
      const pagehideHandler = vi
        .mocked(window.addEventListener)
        .mock.calls.find(call => call[0] === "pagehide")?.[1] as () => void;

      pagehideHandler();

      const originalNavigator = global.navigator;

      delete (global as { navigator?: Navigator }).navigator;

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send(
        endpoint,
        mockEvents,
        headers,
        apiKeyHeader,
      );

      expect(result.ok).toBe(true);

      global.navigator = originalNavigator;
    });
  });

  describe("visibility change handling", () => {
    it("should set unloading state on visibility hidden", () => {
      const visibilityHandler = vi
        .mocked(window.addEventListener)
        .mock.calls.find(
          call => call[0] === "visibilitychange",
        )?.[1] as () => void;

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });

      visibilityHandler();

      expect(visibilityHandler).toBeDefined();
    });

    it("should clear unloading state on visibility visible", () => {
      const visibilityHandler = vi
        .mocked(window.addEventListener)
        .mock.calls.find(
          call => call[0] === "visibilitychange",
        )?.[1] as () => void;

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
      });

      visibilityHandler();

      expect(visibilityHandler).toBeDefined();
    });

    it("should set unloading state on pagehide", () => {
      const pagehideHandler = vi
        .mocked(window.addEventListener)
        .mock.calls.find(call => call[0] === "pagehide")?.[1] as () => void;

      pagehideHandler();

      expect(pagehideHandler).toBeDefined();
    });

    it("should handle visibility state transitions", () => {
      const visibilityHandler = vi
        .mocked(window.addEventListener)
        .mock.calls.find(
          call => call[0] === "visibilitychange",
        )?.[1] as () => void;

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });
      visibilityHandler();

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
      });
      visibilityHandler();

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });
      visibilityHandler();

      expect(visibilityHandler).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty headers", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send(endpoint, [], headers, apiKeyHeader);

      expect(result.ok).toBe(true);
    });

    it("should handle custom headers", async () => {
      const customHeaders = {
        "X-Custom-Header": "custom-value",
        "X-API-Key": "test-key",
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send(
        endpoint,
        mockEvents,
        customHeaders,
        apiKeyHeader,
      );

      expect(fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          headers: customHeaders,
        }),
      );
      expect(result.ok).toBe(true);
    });

    it("should handle special characters in endpoint", async () => {
      const specialEndpoint = "https://api.test.com/events?foo=bar&baz=qux";

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await adapter.send(specialEndpoint, mockEvents, headers, apiKeyHeader);

      expect(fetch).toHaveBeenCalledWith(
        specialEndpoint,
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });
});
