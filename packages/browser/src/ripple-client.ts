import { Client, type ClientConfig, type Platform } from "@internals/core";
import { UAParser } from "ua-parser-js";
import { SessionManager } from "./session-manager.ts";

/**
 * Browser-specific client configuration
 */
export type BrowserClientConfig = ClientConfig & {
  /**
   * Custom session storage key (default: "ripple_session_id")
   */
  sessionStoreKey?: string;
};

/**
 * Ripple SDK client for browser environments.
 * Automatically tracks user sessions tied to browser session lifecycle.
 *
 * @template TMetadata The type definition for metadata
 */
export class RippleClient<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> extends Client<TMetadata> {
  private readonly _sessionManager: SessionManager;

  /**
   * Create a new RippleClient instance.
   *
   * @param config Client configuration including required adapters
   */
  constructor(config: BrowserClientConfig) {
    const finalConfig: ClientConfig = {
      ...config,
      adapters: config.adapters,
    };

    super(finalConfig);

    this._sessionManager = new SessionManager(config.sessionStoreKey);
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
