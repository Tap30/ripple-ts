import type {
  HttpAdapter,
  HttpAdapterContext,
} from "./adapters/http-adapter.ts";
import type { HttpResponse } from "./types.ts";

/**
 * Built-in HTTP adapter using the Fetch API.
 * Works in both browser and Node.js 18+ environments.
 * Uses keepalive flag when available for reliable delivery during page unload.
 */
export class HttpClient implements HttpAdapter {
  /**
   * Send events using the Fetch API.
   *
   * @param context Request context including endpoint, events, and headers
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

    // Skip JSON parsing for 204 No Content or explicitly empty bodies
    const contentLength = response.headers.get("content-length");
    const isEmpty = response.status === 204 || contentLength === "0";

    if (!isEmpty) {
      try {
        data = (await response.json()) as unknown;
        // Use `catch (_) {}` instead of `catch {}` for ES2017 compatibility.
        // Older iOS Safari versions don't support optional catch binding.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // Ignore JSON parsing errors
        data = undefined;
      }
    }

    return {
      status: response.status,
      data,
    };
  }
}
