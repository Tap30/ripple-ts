import type { Event, HttpAdapter, HttpResponse } from "@internals/core";

/**
 * HTTP adapter implementation using the Fetch API with Beacon fallback.
 * Uses sendBeacon for page unload scenarios to ensure event delivery.
 */
export class FetchHttpAdapter implements HttpAdapter {
  private _isUnloading = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this._isUnloading = true;
        } else {
          this._isUnloading = false;
        }
      });

      // This is the most reliable event for "page is definitely going away"
      // scenarios, which is why it's recommended for use with Beacon API.
      window.addEventListener("pagehide", () => {
        this._isUnloading = true;
      });
    }
  }

  /**
   * Send events using Beacon API or Fetch API.
   * Uses Beacon when page is unloading for guaranteed delivery.
   * Note: Beacon API doesn't support custom headers, so apiKey is sent as query parameter.
   *
   * @param endpoint The API endpoint URL
   * @param events Array of events to send
   * @param headers Headers to include in the request
   * @param apiKeyHeader The header name used for API key
   * @returns Promise resolving to HTTP response
   */
  public async send(
    endpoint: string,
    events: Event[],
    headers: Record<string, string>,
    apiKeyHeader: string,
  ): Promise<HttpResponse> {
    const body = JSON.stringify({ events });

    if (
      this._isUnloading &&
      typeof navigator !== "undefined" &&
      navigator.sendBeacon
    ) {
      const url = new URL(endpoint);
      const apiKey = headers[apiKeyHeader];

      if (apiKey) {
        url.searchParams.set("apiKey", apiKey);
      }

      const blob = new Blob([body], { type: "application/json" });
      const success = navigator.sendBeacon(url.toString(), blob);

      return {
        ok: success,
        status: success ? 200 : 500,
        data: undefined,
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      // This ensures request completes even if page is navigated away
      // Provides similar guarantees to Beacon but with response handling
      keepalive: true,
    });

    return {
      ok: response.ok,
      status: response.status,
      data: await response.json().catch(() => undefined),
    };
  }
}
