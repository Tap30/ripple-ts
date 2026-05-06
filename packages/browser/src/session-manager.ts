/**
 * Manages user session tracking for browser environments.
 * Session lifecycle matches browser sessionStorage (cleared on tab/window close).
 */
export class SessionManager {
  readonly #storageKey: string;
  #sessionId: string | null = null;

  /**
   * Create a new SessionManager instance.
   *
   * @param storageKey The sessionStorage key to use (default: "ripple_session_id")
   */
  constructor(storageKey: string = "ripple_session_id") {
    this.#storageKey = storageKey;
  }

  /**
   * Generate a unique session ID.
   *
   * @returns A unique session identifier
   */
  #generateSessionId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(
      "",
    );

    return `${Date.now()}-${hex}`;
  }

  /**
   * Initialize the session manager and get or create a session ID.
   *
   * @returns The current session ID
   */
  public init(): string {
    const existing = sessionStorage.getItem(this.#storageKey);

    if (existing) {
      this.#sessionId = existing;
    } else {
      this.#sessionId = this.#generateSessionId();
      sessionStorage.setItem(this.#storageKey, this.#sessionId);
    }

    return this.#sessionId;
  }

  /**
   * Get the current session ID.
   *
   * @returns The session ID or null if not initialized
   */
  public getSessionId(): string | null {
    return this.#sessionId;
  }

  /**
   * Clear the current session.
   */
  public clear(): void {
    this.#sessionId = null;

    sessionStorage.removeItem(this.#storageKey);
  }
}
