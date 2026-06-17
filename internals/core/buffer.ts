/**
 * Fixed-capacity FIFO ring buffer.
 * When full, new enqueues overwrite the oldest element.
 *
 * @template T The type of elements in the buffer
 */
export class Buffer<T> {
  readonly #items: (T | undefined)[];
  readonly #capacity: number;

  #head = 0;
  #length = 0;

  /**
   * Create a ring buffer with the given capacity.
   *
   * @param capacity Maximum number of elements the buffer can hold
   */
  constructor(capacity: number) {
    if (capacity < 1) {
      throw new Error("Buffer capacity must be at least 1");
    }

    this.#capacity = capacity;
    this.#items = new Array<T | undefined>(capacity);
  }

  /**
   * Add an element to the end of the buffer.
   * If the buffer is full, the oldest element is evicted.
   *
   * @param value The value to enqueue
   */
  public enqueue(value: T): void {
    const tail = (this.#head + this.#length) % this.#capacity;

    this.#items[tail] = value;

    if (this.#length === this.#capacity) {
      this.#head = (this.#head + 1) % this.#capacity;
    } else {
      this.#length++;
    }
  }

  /**
   * Remove and return the element at the front of the buffer.
   *
   * @returns The dequeued value, or null if buffer is empty
   */
  public dequeue(): T | null {
    if (this.#length === 0) return null;

    const value = this.#items[this.#head] as T;

    this.#items[this.#head] = undefined;
    this.#head = (this.#head + 1) % this.#capacity;
    this.#length--;

    return value;
  }

  /**
   * Convert the buffer to an array.
   *
   * @returns Array containing all buffer elements in FIFO order
   */
  public toArray(): T[] {
    const result: T[] = [];

    for (let i = 0; i < this.#length; i++) {
      result.push(this.#items[(this.#head + i) % this.#capacity] as T);
    }

    return result;
  }

  /**
   * Populate the buffer from an array.
   * Clears existing contents. If the array exceeds capacity, only the
   * last `capacity` items are kept (newest-win).
   *
   * @param items Array of items to add to the buffer
   */
  public fromArray(items: T[]): void {
    this.clear();

    const start =
      items.length > this.#capacity ? items.length - this.#capacity : 0;

    for (let i = start; i < items.length; i++) {
      this.#items[this.#length] = items[i];
      this.#length++;
    }
  }

  /**
   * Remove all elements from the buffer.
   */
  public clear(): void {
    this.#head = 0;
    this.#length = 0;
  }

  /**
   * Get the number of elements in the buffer.
   *
   * @returns The buffer size
   */
  public size(): number {
    return this.#length;
  }

  /**
   * Check if the buffer is empty.
   *
   * @returns True if buffer has no elements
   */
  public isEmpty(): boolean {
    return this.#length === 0;
  }
}
