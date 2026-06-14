import {
  Client,
  type AllEvents,
  type Campaign,
  type ClientConfig,
  type EventPayload,
  type Platform,
  type SdkInfo,
  type WebPlatform,
  type WebScreenedPayload,
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
   * Track a screen/page view event.
   * Automatically captures page title, URL, pathname, referrer, and search from the browser.
   * Provided parameters take precedence over auto-captured values.
   *
   * @param payload Optional override for auto-captured screen data
   * @param schemaVersion Event schema version
   */
  public async screen(
    payload?: Partial<WebScreenedPayload>,
    schemaVersion?: string,
  ): Promise<void> {
    const auto: WebScreenedPayload = {
      title: this.#extractTitle(),
      url: this.#extractUrl(),
      pathname: this.#extractPathname(),
      referrer: this.#extractReferrer(),
      search: this.#extractSearch(),
      keywords: this.#extractKeywords(),
      campaign: this.#extractCampaign(),
    };

    return this.track(
      "screened",
      { ...auto, ...payload } as AllEvents<TCustomEvents>["screened"],
      schemaVersion,
    );
  }

  /**
   * Extract url from the documents's `title` field.
   */
  #extractTitle(): string {
    if (typeof document !== "undefined") return document.title;

    return "";
  }

  /**
   * Extract url from the location's `href` field.
   */
  #extractUrl(): string {
    if (typeof location !== "undefined") return location.href;

    return "";
  }

  /**
   * Extract url from the location's `pathname` field.
   */
  #extractPathname(): string | undefined {
    if (typeof location !== "undefined") return location.pathname;

    return undefined;
  }

  /**
   * Extract url from the location's search field.
   */
  #extractSearch(): string | undefined {
    if (typeof location !== "undefined") return location.search;

    return undefined;
  }

  /**
   * Extract referrer from the document's `referrer` field.
   */
  #extractReferrer(): string | undefined {
    if (typeof document !== "undefined") return document.referrer;

    return undefined;
  }

  /**
   * Extract keywords from the page's meta keywords tag.
   */
  #extractKeywords(): string[] | undefined {
    if (typeof document === "undefined") return undefined;

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="keywords"]',
    );

    if (!meta?.content) return undefined;

    return meta.content
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);
  }

  /**
   * Extract UTM campaign parameters from the current URL.
   */
  #extractCampaign(): Campaign | undefined {
    if (typeof location === "undefined") return undefined;

    const params = new URLSearchParams(location.search);
    const source = params.get("utm_source");
    const medium = params.get("utm_medium");

    if (!source || !medium) return undefined;

    return {
      source,
      medium,
      name: params.get("utm_campaign") ?? undefined,
      term: params.get("utm_term") ?? undefined,
      content: params.get("utm_content") ?? undefined,
    };
  }

  /**
   * Dispose the client and clean up resources including session management.
   */
  public override dispose(): void {
    this.#identityManager.clear();
    super.dispose();
  }
}
