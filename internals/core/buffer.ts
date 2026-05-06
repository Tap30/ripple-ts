/**
 * Node in a singly linked list.
 *
 * @template T The type of value stored in the node
 */
type Node<T> = {
  value: T;
  next: Node<T> | null;
};

/**
 * FIFO queue implementation using a singly linked list.
 *
 * @template T The type of elements in the buffer
 */
export class Buffer<T> {
  #head: Node<T> | null = null;
  #tail: Node<T> | null = null;
  #length = 0;

  /**
   * Add an element to the end of the buffer.
   *
   * @param value The value to enqueue
   */
  public enqueue(value: T): void {
    const node: Node<T> = { value, next: null };

    if (!this.#tail) {
      this.#head = this.#tail = node;
    } else {
      this.#tail.next = node;
      this.#tail = node;
    }

    this.#length++;
  }

  /**
   * Remove and return the element at the front of the buffer.
   *
   * @returns The dequeued value, or null if buffer is empty
   */
  public dequeue(): T | null {
    if (!this.#head) return null;

    const value = this.#head.value;

    this.#head = this.#head.next;

    if (!this.#head) this.#tail = null;

    this.#length--;

    return value;
  }

  /**
   * Convert the buffer to an array.
   *
   * @returns Array containing all buffer elements in order
   */
  public toArray(): T[] {
    const result: T[] = [];
    let current = this.#head;

    while (current) {
      result.push(current.value);
      current = current.next;
    }

    return result;
  }

  /**
   * Populate the buffer from an array.
   * Clears existing buffer contents first.
   *
   * @param items Array of items to add to the buffer
   */
  public fromArray(items: T[]): void {
    this.clear();

    for (const item of items) {
      this.enqueue(item);
    }
  }

  /**
   * Remove all elements from the buffer.
   */
  public clear(): void {
    this.#head = this.#tail = null;
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
