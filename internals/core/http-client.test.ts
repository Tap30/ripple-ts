import type { Event as RippleEvent } from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "./http-client.ts";

global.fetch = vi.fn();

describe("HttpClient", () => {
  let adapter: HttpClient;
  let mockEvents: RippleEvent[];
  let endpoint: string;
  let apiKeyHeader: string;
  let headers: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = new HttpClient();

    endpoint = "https://api.test.com/events";
    apiKeyHeader = "X-API-Key";
    headers = {
      "Content-Type": "application/json",
      [apiKeyHeader]: "test-key",
    };

    mockEvents = [
      {
        name: "test_event",
        anonymousId: "anon-user-123",
        eventId: "event-id",
        sdk: {
          name: "sdk",
          version: "x.y.z",
        },
        userId: "user-123",
        payload: { key: "value" },
        issuedAt: Date.now(),
        schemaVersion: null,
        metadata: null,
        platform: null,
      } satisfies RippleEvent,
    ];
  });

  describe("constructor", () => {
    it("should create instance", () => {
      expect(adapter).toBeInstanceOf(HttpClient);
    });
  });

  describe("send", () => {
    it("should send events using fetch", async () => {
      const mockResponse = {
        status: 200,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send({
        endpoint,
        headers,
        apiKeyHeader,
        events: mockEvents,
      });

      expect(fetch).toHaveBeenCalledWith(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ events: mockEvents }),
        keepalive: true,
      });

      expect(result.status).toBe(200);
    });

    it("should handle successful response", async () => {
      const mockResponse = {
        status: 200,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send({
        endpoint,
        apiKeyHeader,
        headers,
        events: mockEvents,
      });

      expect(result.status).toBe(200);
    });

    it("should handle failed response", async () => {
      const mockResponse = {
        status: 500,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send({
        endpoint,
        apiKeyHeader,
        headers,
        events: mockEvents,
      });

      expect(result.status).toBe(500);
    });

    it("should handle JSON parsing error", async () => {
      const mockResponse = {
        status: 200,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send({
        endpoint,
        apiKeyHeader,
        headers,
        events: mockEvents,
      });

      expect(result.status).toBe(200);
      expect(result.data).toBeUndefined();
    });

    it("should skip JSON parsing for 204 No Content", async () => {
      const mockResponse = {
        status: 204,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn(),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send({
        endpoint,
        apiKeyHeader,
        headers,
        events: mockEvents,
      });

      expect(result.status).toBe(204);
      expect(result.data).toBeUndefined();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should skip JSON parsing when content-length is 0", async () => {
      const mockResponse = {
        status: 200,
        headers: { get: vi.fn().mockReturnValue("0") },
        json: vi.fn(),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send({
        endpoint,
        apiKeyHeader,
        headers,
        events: mockEvents,
      });

      expect(result.status).toBe(200);
      expect(result.data).toBeUndefined();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should use keepalive flag", async () => {
      const mockResponse = {
        status: 200,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await adapter.send({
        endpoint,
        apiKeyHeader,
        headers,
        events: mockEvents,
      });

      expect(fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          keepalive: true,
        }),
      );
    });

    it("should handle empty events array", async () => {
      const mockResponse = {
        status: 200,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await adapter.send({
        endpoint,
        apiKeyHeader,
        headers,
        events: [],
      });

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
        status: 200,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await adapter.send({
        endpoint,
        apiKeyHeader,
        headers,
        events: [],
      });

      expect(result.status).toBe(200);
    });

    it("should handle custom headers", async () => {
      const customHeaders = {
        "X-Custom-Header": "custom-value",
        "X-API-Key": "test-key",
      };

      const mockResponse = {
        status: 200,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await adapter.send({
        endpoint,
        apiKeyHeader,
        events: mockEvents,
        headers: customHeaders,
      });

      expect(fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          headers: customHeaders,
        }),
      );
    });

    it("should handle special characters in endpoint", async () => {
      const specialEndpoint = "https://api.test.com/events?foo=bar&baz=qux";

      const mockResponse = {
        status: 200,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await adapter.send({
        headers,
        apiKeyHeader,
        endpoint: specialEndpoint,
        events: mockEvents,
      });

      expect(fetch).toHaveBeenCalledWith(
        specialEndpoint,
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });
});
