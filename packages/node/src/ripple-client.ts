import {
  Client,
  type AllEvents,
  type ClientConfig,
  type EventPayload,
  type Platform,
  type SdkInfo,
  type ServerPlatform,
  type WebScreenedPayload,
} from "@internals/core";
import { SDK_NAME, SDK_VERSION } from "./__sdk_build_info__.ts";

/**
 * Node.js-specific client configuration
 */
export type NodeClientConfig = ClientConfig;

/**
 * Ripple SDK client for Node.js environments.
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
  /**
   * Create a new RippleClient instance.
   *
   * @param config Client configuration including required adapters
   */
  constructor(config: NodeClientConfig) {
    super(config);
  }

  /**
   * Get SDK information for node environment.
   *
   * @returns Node SDK information
   */
  protected override _getSdkInfo(): SdkInfo {
    return {
      name: SDK_NAME,
      version: SDK_VERSION,
    };
  }

  /**
   * Get platform information for Node.js environment.
   *
   * @returns Server platform information
   */
  protected _getPlatform(): Platform | null {
    return {
      type: "server",
    } satisfies ServerPlatform;
  }

  /**
   * Track a screen/page view event.
   *
   * @param payload Screen event data (required in Node.js)
   * @param schemaVersion Event schema version
   */
  public async screen(
    payload: WebScreenedPayload,
    schemaVersion?: string,
  ): Promise<void> {
    return this.track(
      "screened",
      payload as AllEvents<TCustomEvents>["screened"],
      schemaVersion,
    );
  }
}
