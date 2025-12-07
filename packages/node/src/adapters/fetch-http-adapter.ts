import type { Event, HttpAdapter, HttpResponse } from "@internals/core";

/**
 * HTTP adapter implementation using Node.js fetch API.
 * Suitable for Node.js 18+ environments with native fetch support.
 */
export class FetchHttpAdapter implements HttpAdapter {
  /**
   * Send events using Node.js fetch API.
   *
   * @param endpoint The API endpoint URL
   * @param events Array of events to send
   * @param headers Optional custom headers
   * @returns Promise resolving to HTTP response
   */
  public async send(
    endpoint: string,
    events: Event[],
    headers: Record<string, string> = {},
  ): Promise<HttpResponse> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ events }),
    });

    return {
      ok: response.ok,
      status: response.status,
      data: await response.json().catch(() => undefined),
    };
  }
}
