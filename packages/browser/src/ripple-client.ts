import {
  Client,
  type ClientConfig,
  type HttpAdapter,
  type Platform,
  type StorageAdapter,
} from "@internals/core";
import { UAParser } from "ua-parser-js";
import { FetchHttpAdapter } from "./adapters/fetch-http-adapter.ts";
import { LocalStorageAdapter } from "./adapters/local-storage-adapter.ts";
import { SessionManager } from "./session-manager.ts";

/**
 * Optional adapters for customizing RippleClient behavior.
 */
export type RippleClientAdapters = {
  /**
   * Custom HTTP adapter (default: FetchHttpAdapter)
   */
  httpAdapter?: HttpAdapter;
  /**
   * Custom storage adapter (default: LocalStorageAdapter)
   */
  storageAdapter?: StorageAdapter;
};

/**
 * Ripple SDK client for browser environments.
 * Supports custom HTTP and storage adapters for flexibility.
 * Automatically tracks user sessions tied to browser session lifecycle.
 *
 * @template TContext The type definition for global context
 */
export class RippleClient<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> extends Client<TContext> {
  private readonly _sessionManager: SessionManager;

  /**
   * Create a new RippleClient instance.
   *
   * @param config Client configuration
   * @param adapters Optional custom adapters
   */
  constructor(config: ClientConfig, adapters?: RippleClientAdapters) {
    super(
      config,
      adapters?.httpAdapter ?? new FetchHttpAdapter(),
      adapters?.storageAdapter ?? new LocalStorageAdapter(),
    );

    this._sessionManager = new SessionManager();
  }

  /**
   * Initialize the client, restore persisted events, and start session tracking.
   * Should be called before tracking events.
   */
  public override async init(): Promise<void> {
    this._sessionId = this._sessionManager.init();

    await super.init();
  }

  /**
   * Get the current session ID.
   *
   * @returns The session ID or null if not initialized
   */
  public getSessionId(): string | null {
    return this._sessionManager.getSessionId();
  }

  /**
   * Get platform information for browser environment.
   *
   * @returns Web platform information
   */
  protected _getPlatform(): Platform | null {
    if (typeof navigator === "undefined") return null;

    const parser = new UAParser(navigator.userAgent);

    const browser = parser.getBrowser();
    const device = parser.getDevice();
    const os = parser.getOS();

    return {
      type: "web",
      browser: {
        name: browser.name?.toLowerCase() || "UNKNOWN",
        version: browser.version?.toLowerCase() || "UNKNOWN",
      },
      device: {
        name: device.type?.toLowerCase() || "desktop",
        version: device.vendor?.toLowerCase() || "UNKNOWN",
      },
      os: {
        name: os.name?.toLowerCase() || "UNKNOWN",
        version: os.version?.toLowerCase() || "UNKNOWN",
      },
    };
  }
}
