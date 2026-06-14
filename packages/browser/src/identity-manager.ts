import { IdGenerator } from "@internals/core";

/**
 * Manages anonymous ID persistence for browser environments.
 * The anonymous ID lifecycle matches browser sessionStorage (cleared on tab/window close).
 */
export class IdentityManager {
  readonly #storageKey: string;
  #anonymousId: string | null = null;

  /**
   * Create a new SessionManager instance.
   *
   * @param storageKey The sessionStorage key to use (default: "ripple_anonymous_id")
   */
  constructor(storageKey: string = "ripple_anonymous_id") {
    this.#storageKey = storageKey;
  }

  /**
   * Initialize the session manager and get or create an anonymous ID.
   *
   * @returns The current anonymous ID
   */
  public init(): string {
    const existing = sessionStorage.getItem(this.#storageKey);

    if (existing) {
      this.#anonymousId = existing;
    } else {
      this.#anonymousId = IdGenerator.generate();
      sessionStorage.setItem(this.#storageKey, this.#anonymousId);
    }

    return this.#anonymousId;
  }

  /**
   * Get the current anonymous ID.
   *
   * @returns The anonymous ID or null if not initialized
   */
  public getAnonymousId(): string | null {
    return this.#anonymousId;
  }

  /**
   * Clear the current session.
   */
  public clear(): void {
    this.#anonymousId = null;
    sessionStorage.removeItem(this.#storageKey);
  }
}
