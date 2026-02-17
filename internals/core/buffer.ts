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
  private _head: Node<T> | null = null;
  private _tail: Node<T> | null = null;
  private _length = 0;

  /**
   * Add an element to the end of the buffer.
   *
   * @param value The value to enqueue
   */
  public enqueue(value: T): void {
    const node: Node<T> = { value, next: null };

    if (!this._tail) {
      this._head = this._tail = node;
    } else {
      this._tail.next = node;
      this._tail = node;
    }

    this._length++;
  }

  /**
   * Remove and return the element at the front of the buffer.
   *
   * @returns The dequeued value, or null if buffer is empty
   */
  public dequeue(): T | null {
    if (!this._head) return null;

    const value = this._head.value;

    this._head = this._head.next;

    if (!this._head) this._tail = null;

    this._length--;

    return value;
  }

  /**
   * Convert the buffer to an array.
   *
   * @returns Array containing all buffer elements in order
   */
  public toArray(): T[] {
    const result: T[] = [];
    let current = this._head;

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
    this._head = this._tail = null;
    this._length = 0;
  }

  /**
   * Get the number of elements in the buffer.
   *
   * @returns The buffer size
   */
  public size(): number {
    return this._length;
  }

  /**
   * Check if the buffer is empty.
   *
   * @returns True if buffer has no elements
   */
  public isEmpty(): boolean {
    return this._length === 0;
  }
}
