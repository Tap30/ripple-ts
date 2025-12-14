import { Client, type ClientConfig, type Platform } from "@internals/core";

/**
 * Node.js-specific client configuration
 */
export type NodeClientConfig = ClientConfig;

/**
 * Ripple SDK client for Node.js environments.
 *
 * @template TMetadata The type definition for metadata
 */
export class RippleClient<
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> extends Client<TMetadata> {
  /**
   * Create a new RippleClient instance.
   *
   * @param config Client configuration including required adapters
   */
  constructor(config: NodeClientConfig) {
    const finalConfig: ClientConfig = {
      ...config,
      adapters: config.adapters,
    };

    super(finalConfig);
  }

  /**
   * Get platform information for Node.js environment.
   *
   * @returns Server platform information
   */
  protected _getPlatform(): Platform | null {
    return {
      type: "server",
    };
  }
}
