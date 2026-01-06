export type StackLike = Stack | number[];

class Stack {
  heap: number[];
  length: number;
  // private constructor
  static #constructing: boolean = false;

  static create(max: number): StackLike {
    Stack.#constructing = true;
    const s = new Stack(max);
    Stack.#constructing = false;
    return s;
  }

  constructor(max: number) {
    /* c8 ignore start */
    if (!Stack.#constructing) {
      throw new TypeError("instantiate Stack using Stack.create(n)");
    }
    /* c8 ignore stop */
    this.heap = new Array(max).fill(0);
    this.length = 0;
  }

  push(n: number) {
    this.heap[this.length++] = n;
  }

  pop(): number | undefined {
    return this.heap[--this.length];
  }
}

export default Stack;
