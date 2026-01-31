import type { Event as RippleEvent } from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FetchHttpAdapter } from "./fetch-http-adapter.ts";

global.fetch = vi.fn();

describe("FetchHttpAdapter", () => {
  let adapter: FetchHttpAdapter;
  let mockEvents: RippleEvent[];
  let endpoint: string;
  let headers: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = new FetchHttpAdapter();

    endpoint = "https://api.test.com/events";
    headers = {
      "Content-Type": "application/json",
      "X-API-Key": "test-key",
    };

    mockEvents = [
      {
        name: "test_event",
        payload: { key: "value" },
        issuedAt: Date.now(),
        metadata: null,
        sessionId: "session-123",
        platform: null,
      } satisfies RippleEvent,
    ];
  });

  describe("constructor", () => {
    it("should create instance", () => {
      expect(adapter).toBeInstanceOf(FetchHttpAdapter);
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

      const result = await adapter.send(endpoint, mockEvents, headers);

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

      const result = await adapter.send(endpoint, mockEvents, headers);

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

      const result = await adapter.send(endpoint, mockEvents, headers);

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

      const result = await adapter.send(endpoint, mockEvents, headers);

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

      await adapter.send(endpoint, mockEvents, headers);

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

      const result = await adapter.send(endpoint, [], headers);

      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          body: JSON.stringify({ events: [] }),
        }),
      );
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

      const result = await adapter.send(endpoint, [], headers);

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

      const result = await adapter.send(endpoint, mockEvents, customHeaders);

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

      await adapter.send(specialEndpoint, mockEvents, headers);

      expect(fetch).toHaveBeenCalledWith(
        specialEndpoint,
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });
});
