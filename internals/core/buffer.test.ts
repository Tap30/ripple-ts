import { describe, expect, it } from "vitest";
import { Buffer } from "./buffer.ts";

describe("Buffer", () => {
  describe("enqueue", () => {
    it("should add element to empty buffer", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);

      expect(buffer.size()).toBe(1);
      expect(buffer.isEmpty()).toBe(false);
    });

    it("should add multiple elements", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.enqueue(2);
      buffer.enqueue(3);

      expect(buffer.size()).toBe(3);
    });

    it("should maintain FIFO order", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.enqueue(2);
      buffer.enqueue(3);

      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });
  });

  describe("dequeue", () => {
    it("should return null for empty buffer", () => {
      const buffer = new Buffer<number>();

      expect(buffer.dequeue()).toBeNull();
    });

    it("should remove and return first element", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.enqueue(2);

      expect(buffer.dequeue()).toBe(1);
      expect(buffer.size()).toBe(1);
    });

    it("should maintain FIFO order", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.enqueue(2);
      buffer.enqueue(3);

      expect(buffer.dequeue()).toBe(1);
      expect(buffer.dequeue()).toBe(2);
      expect(buffer.dequeue()).toBe(3);
    });

    it("should handle single element", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(42);

      expect(buffer.dequeue()).toBe(42);
      expect(buffer.isEmpty()).toBe(true);
    });

    it("should return null after all elements dequeued", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.dequeue();

      expect(buffer.dequeue()).toBeNull();
    });
  });

  describe("toArray", () => {
    it("should return empty array for empty buffer", () => {
      const buffer = new Buffer<number>();

      expect(buffer.toArray()).toEqual([]);
    });

    it("should return all elements in order", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.enqueue(2);
      buffer.enqueue(3);

      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it("should not modify buffer", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.enqueue(2);

      buffer.toArray();

      expect(buffer.size()).toBe(2);
    });

    it("should work with complex types", () => {
      const buffer = new Buffer<{ id: number }>();

      buffer.enqueue({ id: 1 });
      buffer.enqueue({ id: 2 });

      expect(buffer.toArray()).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe("fromArray", () => {
    it("should populate empty buffer", () => {
      const buffer = new Buffer<number>();

      buffer.fromArray([1, 2, 3]);

      expect(buffer.toArray()).toEqual([1, 2, 3]);
      expect(buffer.size()).toBe(3);
    });

    it("should clear existing buffer", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.enqueue(2);
      buffer.fromArray([3, 4]);

      expect(buffer.toArray()).toEqual([3, 4]);
      expect(buffer.size()).toBe(2);
    });

    it("should handle empty array", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.fromArray([]);

      expect(buffer.isEmpty()).toBe(true);
    });

    it("should maintain order from array", () => {
      const buffer = new Buffer<string>();

      buffer.fromArray(["a", "b", "c"]);

      expect(buffer.dequeue()).toBe("a");
      expect(buffer.dequeue()).toBe("b");
      expect(buffer.dequeue()).toBe("c");
    });
  });

  describe("clear", () => {
    it("should clear empty buffer", () => {
      const buffer = new Buffer<number>();

      buffer.clear();

      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.size()).toBe(0);
    });

    it("should remove all elements", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.enqueue(2);
      buffer.enqueue(3);
      buffer.clear();

      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.size()).toBe(0);
      expect(buffer.toArray()).toEqual([]);
    });

    it("should allow enqueue after clear", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.clear();
      buffer.enqueue(2);

      expect(buffer.size()).toBe(1);
      expect(buffer.dequeue()).toBe(2);
    });
  });

  describe("size", () => {
    it("should return 0 for empty buffer", () => {
      const buffer = new Buffer<number>();

      expect(buffer.size()).toBe(0);
    });

    it("should track size correctly", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      expect(buffer.size()).toBe(1);

      buffer.enqueue(2);
      expect(buffer.size()).toBe(2);

      buffer.dequeue();
      expect(buffer.size()).toBe(1);

      buffer.dequeue();
      expect(buffer.size()).toBe(0);
    });
  });

  describe("isEmpty", () => {
    it("should return true for empty buffer", () => {
      const buffer = new Buffer<number>();

      expect(buffer.isEmpty()).toBe(true);
    });

    it("should return false for non-empty buffer", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);

      expect(buffer.isEmpty()).toBe(false);
    });

    it("should return true after clearing", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.clear();

      expect(buffer.isEmpty()).toBe(true);
    });

    it("should return true after dequeuing all", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      buffer.dequeue();

      expect(buffer.isEmpty()).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle alternating enqueue/dequeue", () => {
      const buffer = new Buffer<number>();

      buffer.enqueue(1);
      expect(buffer.dequeue()).toBe(1);

      buffer.enqueue(2);
      expect(buffer.dequeue()).toBe(2);

      buffer.enqueue(3);
      expect(buffer.dequeue()).toBe(3);
    });

    it("should handle large number of elements", () => {
      const buffer = new Buffer<number>();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        buffer.enqueue(i);
      }

      expect(buffer.size()).toBe(count);

      for (let i = 0; i < count; i++) {
        expect(buffer.dequeue()).toBe(i);
      }

      expect(buffer.isEmpty()).toBe(true);
    });

    it("should work with different types", () => {
      const stringBuffer = new Buffer<string>();

      stringBuffer.enqueue("hello");
      expect(stringBuffer.dequeue()).toBe("hello");

      const objectBuffer = new Buffer<{ name: string }>();

      objectBuffer.enqueue({ name: "test" });
      expect(objectBuffer.dequeue()).toEqual({ name: "test" });

      const boolBuffer = new Buffer<boolean>();

      boolBuffer.enqueue(true);
      expect(boolBuffer.dequeue()).toBe(true);
    });
  });
});
