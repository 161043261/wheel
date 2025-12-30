#!node --no-warnings --expose-gc

import { createRequire } from "module";
import { LRUCache } from "../src/index.js";
import t, { Test } from "tap";

// Note: This test requires --expose-gc flag

const MAX_SIZE = 10_000;
const ITEM_SIZE = 100;
const PROF_EVERY = 100;
const N = 1_000;

if (typeof gc !== "function") {
  process.exit(0);
}

const customRequire = createRequire(import.meta.url);

const tryRequire = (moduleName: string) => {
  try {
    return customRequire(moduleName);
  } catch (err) {
    process.exit(0);
  }
};

const v8 = tryRequire("v8");

const expectItemCount = Math.ceil(MAX_SIZE / ITEM_SIZE);
const max = expectItemCount + 1;
const keyRange = expectItemCount * 2;

const makeItem = () => Buffer.allocUnsafe(ITEM_SIZE);

const prof = (i: number, cache: LRUCache<number, Buffer>) => {
  gc?.();
  return {
    i,
    ...v8.getHeapStatistics(),
    valListLength: cache.valList.length,
    freeLength: cache.free.length,
  };
};

const runTest = async (t: Test, cache: LRUCache<number, Buffer>) => {
  // first, fill to expected size
  for (let i = 0; i < expectItemCount; i++) {
    cache.set(i, makeItem());
  }
  // now start the setting and profiling
  const profiles: ReturnType<typeof prof>[] = [];
  for (let i = 0; i < N; i++) {
    if (i % PROF_EVERY === 0) {
      const profile = prof(i, cache);
      // expect(profile.valListLength).toBeLessThanOrEqual(max);
      t.ok(profile.valListLength <= max);
      // expect(profile.freeLength).toBeLessThanOrEqual(1);
      t.ok(profile.freeLength <= 1);
      // expect(profile.number_of_native_contexts).toBeLessThanOrEqual(2);
      t.ok(profile.number_of_native_contexts <= 2);
      // expect(profile.number_of_detached_contexts).toBe(0);
      t.equal(profile.number_of_detached_contexts, 0);
      profiles.push(profile);
    }
    const item = makeItem();
    cache.set(i % keyRange, item);
  }

  const profile = prof(N, cache);
  profiles.push(profile);

  // memory leaks can be hard to catch deterministically.
  // The first few items will tend to be lower, and we'll see
  // *some* modest increase in heap usage from tap itself as it
  // runs the test and builds up its internal results data.
  // But, after the initial few profiles, it should be modest.
  // Considering that the reported bug showed a 10x increase in
  // memory in this reproduction case, 2x is still pretty aggressive,
  // without risking false hits from other node or tap stuff.

  const start = Math.floor(profiles.length / 2);
  const initial = profiles[start];
  for (let i = start; i < profiles.length; i++) {
    const current = profiles[i];
    const delta = current.total_heap_size / initial.total_heap_size;
    // expect(delta).toBeLessThan(2);
    t.ok(delta < 2);
  }
};

t.test("should no memory leak with both max and maxSize", (t) => {
  return runTest(
    t,
    new LRUCache<number, Buffer>({
      maxSize: MAX_SIZE,
      sizeCalculation: (s: Buffer) => s.length,
      max,
    }),
  );
});

t.test("should no memory leak with no max, only maxSize", (t) => {
  return runTest(
    t,
    new LRUCache<number, Buffer>({
      maxSize: MAX_SIZE,
      sizeCalculation: (s: Buffer) => s.length,
    }),
  );
});

t.test("should no memory leak with only max, no maxSize", (t) => {
  return runTest(
    t,
    new LRUCache<number, Buffer>({
      max,
      // sizeCalculation: (s: Buffer) => s.length,
    }),
  );
});
