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
   * @param headers Headers to include in the request
   * @param apiKeyHeader The header name used for API key (unused in Node.js)
   * @returns Promise resolving to HTTP response
   */
  public async send(
    endpoint: string,
    events: Event[],
    headers: Record<string, string>,
  ): Promise<HttpResponse> {
    const body = JSON.stringify({ events });

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
    });

    let data: unknown;

    try {
      data = await response.json();
      // Use `catch (_) {}` instead of `catch {}` for ES2017 compatibility.
      // Older iOS Safari versions don't support optional catch binding.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // Ignore JSON parsing errors
      data = undefined;
    }

    return {
      status: response.status,
      data,
    };
  }
}
