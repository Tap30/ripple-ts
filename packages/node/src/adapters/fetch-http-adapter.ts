import type {
  HttpAdapter,
  HttpAdapterContext,
  HttpResponse,
} from "@internals/core";

/**
 * HTTP adapter implementation using Node.js fetch API.
 * Suitable for Node.js 18+ environments with native fetch support.
 */
export class FetchHttpAdapter implements HttpAdapter {
  /**
   * Send events using the provided adapter context.
   *
   * @param context System context and configuration needed by the adapter
   * to construct and perform the HTTP request.
   * @returns Promise resolving to HTTP response
   */
  public async send(ctx: HttpAdapterContext): Promise<HttpResponse> {
    const { events, headers, endpoint } = ctx;
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
