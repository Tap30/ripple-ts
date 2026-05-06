import type { Event, HttpResponse } from "../types.ts";

/**
 * Context and configuration passed to HttpAdapter implementations.
 * Adapters can use this information to construct the underlying request.
 */
export type HttpAdapterContext = {
  /** The API endpoint URL. */
  endpoint: string;

  /** Events to send. */
  events: Event[];

  /** Headers to include in the request. */
  headers: Record<string, string>;

  /** Header name used for the API key. */
  apiKeyHeader: string;
};

/**
 * Abstract interface for HTTP communication.
 * Implement this interface to use custom HTTP clients (axios, fetch, gRPC, etc.).
 */
export interface HttpAdapter {
  /**
   * Send events using the provided adapter context.
   *
   * @param context System context and configuration needed by the adapter
   * to construct and perform the HTTP request.
   * @returns Promise resolving to HTTP response
   */
  send(context: HttpAdapterContext): Promise<HttpResponse>;
}
