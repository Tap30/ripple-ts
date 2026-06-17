/**
 * Manages shared metadata that gets attached to all events.
 * Provides type-safe metadata management with generic support.
 *
 * @template TMetadata The type definition for metadata
 */
export class MetadataManager<TMetadata extends Record<string, unknown>> {
  #metadata: Partial<TMetadata> = {};

  // We have set-once-read-many scenario.
  // This will prevent unnecessary allocation pressure.
  #snapshot: Partial<TMetadata> | null = null;

  /**
   * Set a metadata value.
   *
   * @template K The metadata key type
   * @param key The metadata key
   * @param value The value to set
   */
  public set<K extends keyof TMetadata>(key: K, value: TMetadata[K]): void {
    this.#metadata[key] = value;

    // Cache invalidation
    this.#snapshot = null;
  }

  /**
   * Get all metadata as a single object.
   *
   * @returns All metadata or empty object if none set
   */
  public getAll(): Partial<TMetadata> | null {
    if (this.isEmpty()) return null;

    if (!this.#snapshot) {
      this.#snapshot = Object.freeze({
        ...this.#metadata,
      });
    }

    return this.#snapshot;
  }

  /**
   * Check if metadata is empty.
   *
   * @returns True if no metadata has been set
   */
  public isEmpty(): boolean {
    return Object.keys(this.#metadata).length === 0;
  }

  /**
   * Clear all metadata.
   */
  public clear(): void {
    this.#metadata = {};
    this.#snapshot = null;
  }
}
