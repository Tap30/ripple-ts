import { Client, type ClientConfig, type Platform } from "@internals/core";
import { FetchHttpAdapter } from "./adapters/fetch-http-adapter.ts";
import { FileStorageAdapter } from "./adapters/file-storage-adapter.ts";

/**
 * Node.js-specific client configuration with optional adapters
 */
export type NodeClientConfig = Omit<ClientConfig, "adapters"> & {
  /**
   * Custom adapters for HTTP and storage
   */
  adapters?: {
    /**
     * HTTP adapter for sending events
     */
    httpAdapter?: ClientConfig["adapters"]["httpAdapter"];
    /**
     * Storage adapter for persisting events
     */
    storageAdapter?: ClientConfig["adapters"]["storageAdapter"];
  };
};

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
   * @param config Client configuration including optional adapters
   */
  constructor(config: NodeClientConfig) {
    const finalConfig: ClientConfig = {
      ...config,
      adapters: {
        httpAdapter: config.adapters?.httpAdapter ?? new FetchHttpAdapter(),
        storageAdapter:
          config.adapters?.storageAdapter ?? new FileStorageAdapter(),
      },
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
