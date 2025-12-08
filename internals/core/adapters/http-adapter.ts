import type { Event, HttpResponse } from "../types.ts";

/**
 * Abstract interface for HTTP communication.
 * Implement this interface to use custom HTTP clients (axios, fetch, gRPC, etc.).
 */
export interface HttpAdapter {
  /**
   * Send events to the specified endpoint.
   *
   * @param endpoint The API endpoint URL
   * @param events Array of events to send
   * @param headers Optional custom headers to merge with defaults
   * @returns Promise resolving to HTTP response
   */
  send(
    endpoint: string,
    events: Event[],
    headers?: Record<string, string>,
  ): Promise<HttpResponse>;
}
