import type {
  HttpAdapter,
  HttpAdapterContext,
  HttpResponse,
} from "@internals/core";

/**
 * HTTP adapter implementation using the Fetch API.
 * Uses keepalive flag to ensure requests complete even during page navigation.
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
    const { events, endpoint, headers } = ctx;
    const body = JSON.stringify({ events });

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      keepalive: true,
    });

    let data: unknown;

    try {
      data = (await response.json()) as unknown;
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
