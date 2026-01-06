import { createRequire } from "module";
import { describe, it, expect, beforeEach } from "vitest";
import { LRUCache as LRU } from "../src/index.js";
import type { Status } from "../src/types/base.js";

describe("basic test", () => {
  let c: LRU<{}, number>;
  let statuses: Status<number>[];

  const s = (): Status<number> => {
    const status: Status<number> = {};
    statuses.push(status);
    return status;
  };

  beforeEach(() => {
    c = new LRU({ max: 10 });
    statuses = [];
  });

  it("should handle basic set and get operations", () => {
    for (let i = 0; i < 5; i++) {
      expect(c.set(i, i, { status: s() })).toBe(c);
    }
    for (let i = 0; i < 5; i++) {
      expect(c.get(i, { status: s() })).toBe(i);
    }
    expect(c.size).toBe(5);
    expect(Array.from(c.entries())).toMatchSnapshot();
    expect(c.getRemainingTTL(1)).toBe(Infinity);
    expect(c.getRemainingTTL("not in cache")).toBe(0);
  });
});
