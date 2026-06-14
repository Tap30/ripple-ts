import {
  NoOpLoggerAdapter,
  type HttpAdapter,
  type HttpAdapterContext,
  type StorageAdapter,
} from "@internals/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RippleClient, type NodeClientConfig } from "./ripple-client.ts";

type TestMetadata = {
  environment: string;
  serverId: string;
};

type TestEvents = {
  "api.request": { endpoint: string; method: string };
  test_event: { key: string };
  simple_event: Record<string, unknown>;
};

const mockHttpAdapter: HttpAdapter = {
  send: vi.fn().mockResolvedValue({ status: 200 }),
};

const mockStorageAdapter: StorageAdapter = {
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockConfig: NodeClientConfig = {
  apiKey: "test-key",
  endpoint: "https://api.test.com/events",
  httpAdapter: mockHttpAdapter,
  storageAdapter: mockStorageAdapter,
  loggerAdapter: new NoOpLoggerAdapter(),
};

describe("RippleClient", () => {
  let client: RippleClient<TestEvents, TestMetadata>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new RippleClient<TestEvents, TestMetadata>(mockConfig);
  });

  describe("constructor", () => {
    it("should create instance", () => {
      expect(client).toBeInstanceOf(RippleClient);
    });
  });

  describe("init", () => {
    it("should initialize and load events", async () => {
      await client.init();

      expect(mockStorageAdapter.load).toHaveBeenCalled();
    });

    it("should not re-initialize", async () => {
      await client.init();
      await client.init();

      expect(mockStorageAdapter.load).toHaveBeenCalledTimes(1);
    });
  });

  describe("platform detection", () => {
    it("should report server platform", async () => {
      await client.init();
      await client.track("test_event", { key: "value" });
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              name: "test_event",
              platform: { type: "server" },
            }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });
  });

  describe("tracking", () => {
    it("should track custom events with payload", async () => {
      await client.init();
      await client.track("api.request", { endpoint: "/users", method: "GET" });
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              name: "api.request",
              payload: { endpoint: "/users", method: "GET" },
            }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });

    it("should track predefined events", async () => {
      await client.init();
      await client.track("product_viewed", {
        product: { productId: "p-1", price: { amount: 99, currency: "USD" } },
      });
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({ name: "product_viewed" }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });

    it("should include schemaVersion", async () => {
      await client.init();
      await client.track("test_event", { key: "v" }, "2.0.0");
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({ schemaVersion: "2.0.0" }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });

    it("should include metadata from setMetadata", async () => {
      await client.init();
      client.setMetadata("environment", "production");
      client.setMetadata("serverId", "srv-1");
      await client.track("simple_event");
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              metadata: { environment: "production", serverId: "srv-1" },
            }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });

    it("should include anonymousId", async () => {
      await client.init();
      await client.track("test_event", { key: "v" });
      await client.flush();

      expect(mockHttpAdapter.send).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              anonymousId: expect.any(String) as string,
            }),
          ]) as Array<unknown>,
        } as Partial<HttpAdapterContext>),
      );
    });
  });

  describe("dispose", () => {
    it("should dispose without error", () => {
      expect(() => client.dispose()).not.toThrow();
    });

    it("should allow re-init after dispose", async () => {
      await client.init();
      client.dispose();
      await expect(client.init()).resolves.not.toThrow();
    });

    it("should work normally after re-init", async () => {
      await client.init();
      client.setMetadata("environment", "dev");
      client.dispose();

      await client.init();
      client.setMetadata("environment", "prod");

      await expect(
        client.track("test_event", { key: "v" }),
      ).resolves.not.toThrow();
      expect(client.getMetadata()).toEqual({ environment: "prod" });
    });
  });
});
