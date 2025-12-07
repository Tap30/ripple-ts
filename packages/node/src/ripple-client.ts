import {
  Client,
  type ClientConfig,
  type HttpAdapter,
  type Platform,
  type StorageAdapter,
} from "@internals/core";
import { FetchHttpAdapter } from "./adapters/fetch-http-adapter.ts";
import { FileStorageAdapter } from "./adapters/file-storage-adapter.ts";

/**
 * Optional adapters for customizing RippleClient behavior.
 */
export type RippleClientAdapters = {
  /**
   * Custom HTTP adapter (default: FetchHttpAdapter)
   */
  httpAdapter?: HttpAdapter;
  /**
   * Custom storage adapter (default: FileStorageAdapter)
   */
  storageAdapter?: StorageAdapter;
};

/**
 * Ripple SDK client for Node.js environments.
 * Supports custom HTTP and storage adapters for flexibility.
 *
 * @template TContext The type definition for global context
 */
export class RippleClient<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> extends Client<TContext> {
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
      adapters?.storageAdapter ?? new FileStorageAdapter(),
    );
  }

  /**
   * Get platform information for Node.js environment.
   *
   * @returns Server platform information
   */
  protected _getPlatform(): Platform | undefined {
    return {
      type: "server",
    };
  }
}
