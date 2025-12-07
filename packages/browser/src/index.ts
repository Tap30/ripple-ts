export { CookieStorageAdapter } from "./adapters/cookie-storage-adapter.ts";
export { FetchHttpAdapter } from "./adapters/fetch-http-adapter.ts";
export { IndexedDBAdapter } from "./adapters/indexed-db-adapter.ts";
export { LocalStorageAdapter } from "./adapters/local-storage-adapter.ts";
export { SessionStorageAdapter } from "./adapters/session-storage-adapter.ts";
export { RippleClient, type RippleClientAdapters } from "./ripple-client.ts";
export { SessionManager } from "./session-manager.ts";

export type {
  ClientConfig,
  Event,
  EventPayload,
  HttpAdapter,
  HttpResponse,
  StorageAdapter,
} from "@repo/core";
