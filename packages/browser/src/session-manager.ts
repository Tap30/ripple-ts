/**
 * Manages user session tracking for browser environments.
 * Session lifecycle matches browser sessionStorage (cleared on tab/window close).
 */
export class SessionManager {
  private readonly _storageKey: string;
  private _sessionId: string | null = null;

  /**
   * Create a new SessionManager instance.
   *
   * @param storageKey The sessionStorage key to use (default: "ripple_session_id")
   */
  constructor(storageKey: string = "ripple_session_id") {
    this._storageKey = storageKey;
  }

  /**
   * Generate a unique session ID.
   *
   * @returns A unique session identifier
   */
  private _generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Initialize the session manager and get or create a session ID.
   *
   * @returns The current session ID
   */
  public init(): string {
    const existing = sessionStorage.getItem(this._storageKey);

    if (existing) {
      this._sessionId = existing;
    } else {
      this._sessionId = this._generateSessionId();
      sessionStorage.setItem(this._storageKey, this._sessionId);
    }

    return this._sessionId;
  }

  /**
   * Get the current session ID.
   *
   * @returns The session ID or null if not initialized
   */
  public getSessionId(): string | null {
    return this._sessionId;
  }
}
