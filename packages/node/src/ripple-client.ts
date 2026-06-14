import {
  Client,
  type ClientConfig,
  type EventPayload,
  type Platform,
  type ServerPlatform,
} from "@internals/core";

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
   * Get platform information for Node.js environment.
   *
   * @returns Server platform information
   */
  protected _getPlatform(): Platform | null {
    return {
      type: "server",
    } satisfies ServerPlatform;
  }
}
