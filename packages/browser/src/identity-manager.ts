import { IdGenerator } from "@internals/core";

/**
 * Manages anonymous ID persistence for browser environments.
 * The anonymous ID lifecycle matches browser sessionStorage (cleared on tab/window close).
 */
export class IdentityManager {
  readonly #storageKey: string;
  readonly #userIdKey: string;

  #anonymousId: string | null = null;

  constructor(storageKey: string = "ripple_session") {
    this.#storageKey = storageKey;
    this.#userIdKey = `${storageKey}_user`;
  }

  /**
   * Initialize and get or create an anonymous ID.
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
   * Get the persisted user ID.
   *
   * @returns The user ID or null
   */
  public getUserId(): string | null {
    return sessionStorage.getItem(this.#userIdKey);
  }

  /**
   * Persist the user ID to sessionStorage.
   *
   * @param userId The user ID to persist
   */
  public setUserId(userId: string): void {
    sessionStorage.setItem(this.#userIdKey, userId);
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
   * Clear all identity state.
   */
  public clear(): void {
    this.#anonymousId = null;

    sessionStorage.removeItem(this.#storageKey);
    sessionStorage.removeItem(this.#userIdKey);
  }
}
