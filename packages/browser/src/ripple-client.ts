import {
  Client,
  type ClientConfig,
  type EventPayload,
  type Platform,
  type SdkInfo,
  type WebPlatform,
} from "@internals/core";
import { UAParser } from "ua-parser-js";
import { SDK_NAME, SDK_VERSION } from "./__sdk_build_info__.ts";
import { IdentityManager } from "./identity-manager.ts";

/**
 * Browser-specific client configuration
 */
export type BrowserClientConfig = ClientConfig & {
  /**
   * Custom session storage key for anonymous ID persistence (default: "ripple_anonymous_id")
   */
  sessionStoreKey?: string;
};

/**
 * Ripple SDK client for browser environments.
 * Automatically persists anonymous ID via sessionStorage.
 *
 * @template TCustomEvents Custom event definitions merged with predefined CDP events
 * @template TMetadata The type definition for metadata
 */
export class RippleClient<
  TCustomEvents extends Record<string, EventPayload> = Record<
    string,
    EventPayload
  >,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> extends Client<TCustomEvents, TMetadata> {
  readonly #identityManager: IdentityManager;

  /**
   * Create a new RippleClient instance.
   *
   * @param config Client configuration including required adapters
   */
  constructor(config: BrowserClientConfig) {
    super(config);
    this.#identityManager = new IdentityManager(config.sessionStoreKey);
  }

  protected override _getSdkInfo(): SdkInfo {
    return {
      name: SDK_NAME,
      version: SDK_VERSION,
    };
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
    } satisfies WebPlatform;
  }

  /**
   * Initialize the client, restore persisted events, and restore anonymous ID.
   */
  public override async init(): Promise<void> {
    this._anonymousId = this.#identityManager.init();
    await super.init();
  }

  /**
   * Dispose the client and clean up resources including session management.
   */
  public override dispose(): void {
    this.#identityManager.clear();
    super.dispose();
  }
}
