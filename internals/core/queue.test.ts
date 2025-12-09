import { describe, expect, it } from "vitest";
import { Queue } from "./queue.ts";

describe("Queue", () => {
  describe("enqueue", () => {
    it("should add element to empty queue", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);

      expect(queue.size()).toBe(1);
      expect(queue.isEmpty()).toBe(false);
    });

    it("should add multiple elements", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      expect(queue.size()).toBe(3);
    });

    it("should maintain FIFO order", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      expect(queue.toArray()).toEqual([1, 2, 3]);
    });
  });

  describe("dequeue", () => {
    it("should return null for empty queue", () => {
      const queue = new Queue<number>();

      expect(queue.dequeue()).toBeNull();
    });

    it("should remove and return first element", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.enqueue(2);

      expect(queue.dequeue()).toBe(1);
      expect(queue.size()).toBe(1);
    });

    it("should maintain FIFO order", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      expect(queue.dequeue()).toBe(1);
      expect(queue.dequeue()).toBe(2);
      expect(queue.dequeue()).toBe(3);
    });

    it("should handle single element", () => {
      const queue = new Queue<number>();

      queue.enqueue(42);

      expect(queue.dequeue()).toBe(42);
      expect(queue.isEmpty()).toBe(true);
    });

    it("should return null after all elements dequeued", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.dequeue();

      expect(queue.dequeue()).toBeNull();
    });
  });

  describe("toArray", () => {
    it("should return empty array for empty queue", () => {
      const queue = new Queue<number>();

      expect(queue.toArray()).toEqual([]);
    });

    it("should return all elements in order", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      expect(queue.toArray()).toEqual([1, 2, 3]);
    });

    it("should not modify queue", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.enqueue(2);

      queue.toArray();

      expect(queue.size()).toBe(2);
    });

    it("should work with complex types", () => {
      const queue = new Queue<{ id: number }>();

      queue.enqueue({ id: 1 });
      queue.enqueue({ id: 2 });

      expect(queue.toArray()).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe("fromArray", () => {
    it("should populate empty queue", () => {
      const queue = new Queue<number>();

      queue.fromArray([1, 2, 3]);

      expect(queue.toArray()).toEqual([1, 2, 3]);
      expect(queue.size()).toBe(3);
    });

    it("should clear existing queue", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.enqueue(2);
      queue.fromArray([3, 4]);

      expect(queue.toArray()).toEqual([3, 4]);
      expect(queue.size()).toBe(2);
    });

    it("should handle empty array", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.fromArray([]);

      expect(queue.isEmpty()).toBe(true);
    });

    it("should maintain order from array", () => {
      const queue = new Queue<string>();

      queue.fromArray(["a", "b", "c"]);

      expect(queue.dequeue()).toBe("a");
      expect(queue.dequeue()).toBe("b");
      expect(queue.dequeue()).toBe("c");
    });
  });

  describe("clear", () => {
    it("should clear empty queue", () => {
      const queue = new Queue<number>();

      queue.clear();

      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it("should remove all elements", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);
      queue.clear();

      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
      expect(queue.toArray()).toEqual([]);
    });

    it("should allow enqueue after clear", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.clear();
      queue.enqueue(2);

      expect(queue.size()).toBe(1);
      expect(queue.dequeue()).toBe(2);
    });
  });

  describe("size", () => {
    it("should return 0 for empty queue", () => {
      const queue = new Queue<number>();

      expect(queue.size()).toBe(0);
    });

    it("should track size correctly", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      expect(queue.size()).toBe(1);

      queue.enqueue(2);
      expect(queue.size()).toBe(2);

      queue.dequeue();
      expect(queue.size()).toBe(1);

      queue.dequeue();
      expect(queue.size()).toBe(0);
    });
  });

  describe("isEmpty", () => {
    it("should return true for empty queue", () => {
      const queue = new Queue<number>();

      expect(queue.isEmpty()).toBe(true);
    });

    it("should return false for non-empty queue", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);

      expect(queue.isEmpty()).toBe(false);
    });

    it("should return true after clearing", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.clear();

      expect(queue.isEmpty()).toBe(true);
    });

    it("should return true after dequeuing all", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      queue.dequeue();

      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle alternating enqueue/dequeue", () => {
      const queue = new Queue<number>();

      queue.enqueue(1);
      expect(queue.dequeue()).toBe(1);

      queue.enqueue(2);
      expect(queue.dequeue()).toBe(2);

      queue.enqueue(3);
      expect(queue.dequeue()).toBe(3);
    });

    it("should handle large number of elements", () => {
      const queue = new Queue<number>();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        queue.enqueue(i);
      }

      expect(queue.size()).toBe(count);

      for (let i = 0; i < count; i++) {
        expect(queue.dequeue()).toBe(i);
      }

      expect(queue.isEmpty()).toBe(true);
    });

    it("should work with different types", () => {
      const stringQueue = new Queue<string>();

      stringQueue.enqueue("hello");
      expect(stringQueue.dequeue()).toBe("hello");

      const objectQueue = new Queue<{ name: string }>();

      objectQueue.enqueue({ name: "test" });
      expect(objectQueue.dequeue()).toEqual({ name: "test" });

      const boolQueue = new Queue<boolean>();

      boolQueue.enqueue(true);
      expect(boolQueue.dequeue()).toBe(true);
    });
  });
});
