/**
 * Manages global context that is attached to all tracked events.
 *
 * @template TContext The type definition for context keys and values
 */
export class ContextManager<TContext extends Record<string, unknown>> {
  private _context: Partial<TContext> = {};

  /**
   * Set a context value.
   *
   * @template K The context key type
   * @param key The context key
   * @param value The value to set
   */
  public set<K extends keyof TContext>(key: K, value: TContext[K]): void {
    this._context[key] = value;
  }

  /**
   * Get a context value.
   *
   * @template K The context key type
   * @param key The context key
   * @returns The context value, or undefined if not set
   */
  public get<K extends keyof TContext>(key: K): TContext[K] | undefined {
    return this._context[key];
  }

  /**
   * Get all context values.
   *
   * @returns A shallow copy of all context data
   */
  public getAll(): Partial<TContext> {
    return { ...this._context };
  }

  /**
   * Check if context is empty.
   *
   * @returns True if no context values are set
   */
  public isEmpty(): boolean {
    return Object.keys(this._context).length === 0;
  }

  /**
   * Clear all context values.
   */
  public clear(): void {
    this._context = {};
  }
}
