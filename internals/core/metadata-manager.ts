/**
 * Manages shared metadata that gets attached to all events.
 * Provides type-safe metadata management with generic support.
 *
 * @template TMetadata The type definition for metadata
 */
export class MetadataManager<TMetadata extends Record<string, unknown>> {
  private _metadata: Partial<TMetadata> = {};

  /**
   * Set a metadata value.
   *
   * @template K The metadata key type
   * @param key The metadata key
   * @param value The value to set
   */
  public set<K extends keyof TMetadata>(key: K, value: TMetadata[K]): void {
    this._metadata[key] = value;
  }

  /**
   * Get all metadata as a single object.
   *
   * @returns All metadata or empty object if none set
   */
  public getAll(): Partial<TMetadata> {
    return { ...this._metadata };
  }

  /**
   * Check if metadata is empty.
   *
   * @returns True if no metadata has been set
   */
  public isEmpty(): boolean {
    return Object.keys(this._metadata).length === 0;
  }

  /**
   * Merge shared metadata with event-specific metadata.
   *
   * @param eventMetadata Event-specific metadata
   * @returns Merged metadata object
   */
  public merge(eventMetadata?: Partial<TMetadata>): TMetadata | null {
    if (this.isEmpty() && !eventMetadata) {
      return null;
    }

    return {
      ...this._metadata,
      ...eventMetadata,
    } as TMetadata;
  }
}
