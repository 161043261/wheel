import Stack, { type StackLike } from "./stack.js";

import type {
  Disposer,
  Inserter,
  Fetcher,
  Memoizer,
  SizeCalculator,
  DisposeTask,
  Status,
  MemoizerOptions,
  DisposeReason,
  GetOptions,
  Entry,
  SetOptions,
  HasOptions,
  PeekOptions,
  BackgroundFetch,
  FetchOptions,
  FetchOptionsNoContext,
  FetchOptionsWithContext,
  MemoOptions,
  MemoOptionsNoContext,
  MemoOptionsWithContext,
  Options,
} from "./types/index.js";
import { warned, isPosInt, shouldWarn, emitWarning } from "./utils.js";

export class LRUCache<K extends {}, V extends {}, FC = unknown> {
  // options that cannot be changed without disaster
  readonly max: number;
  readonly maxSize: number;
  readonly dispose?: Disposer<K, V>;
  readonly onInsert?: Inserter<K, V>;
  readonly disposeAfter?: Disposer<K, V>;
  readonly fetchMethod?: Fetcher<K, V, FC>;
  readonly memoMethod?: Memoizer<K, V, FC>;
  ttl: number;
  ttlResolution: number;
  ttlAutopurge: boolean;
  updateAgeOnGet: boolean;
  updateAgeOnHas: boolean;
  allowStale: boolean;
  noDisposeOnSet: boolean;
  noUpdateTTL: boolean;
  maxEntrySize: number;
  sizeCalculation?: SizeCalculator<K, V>;
  noDeleteOnFetchRejection: boolean;
  noDeleteOnStaleGet: boolean;
  allowStaleOnFetchAbort: boolean;
  allowStaleOnFetchRejection: boolean;
  ignoreFetchAbort: boolean;

  // computed properties
  size: number;
  calculatedSize: number;
  keyMap: Map<K, number>;
  keyList: (K | undefined)[];
  valList: (V | BackgroundFetch<V> | undefined)[];
  next: number[];
  prev: number[];
  head: number;
  tail: number;
  free: StackLike;
  disposed?: DisposeTask<K, V>[];
  sizes?: number[];
  starts?: number[];
  ttls?: number[];
  autopurgeTimers?: (undefined | ReturnType<typeof setTimeout>)[];
  hasDispose: boolean;
  hasFetchMethod: boolean;
  hasDisposeAfter: boolean;
  hasOnInsert: boolean;

  constructor(options: Options<K, V, FC> | LRUCache<K, V, FC>) {
    const {
      max = 0,
      ttl,
      ttlResolution = 1,
      ttlAutopurge,
      updateAgeOnGet,
      updateAgeOnHas,
      allowStale,
      dispose,
      onInsert,
      disposeAfter,
      noDisposeOnSet,
      noUpdateTTL,
      maxSize = 0,
      maxEntrySize = 0,
      sizeCalculation,
      fetchMethod,
      memoMethod,
      noDeleteOnFetchRejection,
      noDeleteOnStaleGet,
      allowStaleOnFetchRejection,
      allowStaleOnFetchAbort,
      ignoreFetchAbort,
    } = options;

    if (max !== 0 && !isPosInt(max)) {
      throw new TypeError("max option must be a nonnegative integer");
    }

    this.max = max;
    this.maxSize = maxSize;
    this.maxEntrySize = maxEntrySize || this.maxSize;
    this.sizeCalculation = sizeCalculation;
    if (this.sizeCalculation) {
      if (!this.maxSize && !this.maxEntrySize) {
        throw new TypeError(
          "cannot set sizeCalculation without setting maxSize or maxEntrySize",
        );
      }
      if (typeof this.sizeCalculation !== "function") {
        throw new TypeError("sizeCalculation set to non-function");
      }
    }

    if (memoMethod !== undefined && typeof memoMethod !== "function") {
      throw new TypeError("memoMethod must be a function if defined");
    }
    this.memoMethod = memoMethod;

    if (fetchMethod !== undefined && typeof fetchMethod !== "function") {
      throw new TypeError("fetchMethod must be a function if specified");
    }
    this.fetchMethod = fetchMethod;

    this.hasFetchMethod = !!fetchMethod;

    this.keyMap = new Map();
    this.keyList = new Array(max).fill(undefined);
    this.valList = new Array(max).fill(undefined);
    this.next = new Array<number>(max).fill(0);
    this.prev = new Array<number>(max).fill(0);
    this.head = 0 as number;
    this.tail = 0 as number;
    this.free = Stack.create(max);
    this.size = 0;
    this.calculatedSize = 0;

    if (typeof dispose === "function") {
      this.dispose = dispose;
    }
    if (typeof onInsert === "function") {
      this.onInsert = onInsert;
    }
    if (typeof disposeAfter === "function") {
      this.disposeAfter = disposeAfter;
      this.disposed = [];
    } else {
      this.disposeAfter = undefined;
      this.disposed = undefined;
    }
    this.hasDispose = !!this.dispose;
    this.hasOnInsert = !!this.onInsert;
    this.hasDisposeAfter = !!this.disposeAfter;

    this.noDisposeOnSet = !!noDisposeOnSet;
    this.noUpdateTTL = !!noUpdateTTL;
    this.noDeleteOnFetchRejection = !!noDeleteOnFetchRejection;
    this.allowStaleOnFetchRejection = !!allowStaleOnFetchRejection;
    this.allowStaleOnFetchAbort = !!allowStaleOnFetchAbort;
    this.ignoreFetchAbort = !!ignoreFetchAbort;

    // NB: maxEntrySize is set to maxSize if it's set
    if (this.maxEntrySize !== 0) {
      if (this.maxSize !== 0) {
        if (!isPosInt(this.maxSize)) {
          throw new TypeError(
            "maxSize must be a positive integer if specified",
          );
        }
      }
      if (!isPosInt(this.maxEntrySize)) {
        throw new TypeError(
          "maxEntrySize must be a positive integer if specified",
        );
      }
      this.initializeSizeTracking();
    }

    this.allowStale = !!allowStale;
    this.noDeleteOnStaleGet = !!noDeleteOnStaleGet;
    this.updateAgeOnGet = !!updateAgeOnGet;
    this.updateAgeOnHas = !!updateAgeOnHas;
    this.ttlResolution =
      isPosInt(ttlResolution) || ttlResolution === 0 ? ttlResolution : 1;
    this.ttlAutopurge = !!ttlAutopurge;
    this.ttl = ttl || 0;
    if (this.ttl) {
      if (!isPosInt(this.ttl)) {
        throw new TypeError("ttl must be a positive integer if specified");
      }
      this.initializeTTLTracking();
    }

    // do not allow completely unbounded caches
    if (this.max === 0 && this.ttl === 0 && this.maxSize === 0) {
      throw new TypeError("At least one of max, maxSize, or ttl is required");
    }
    if (!this.ttlAutopurge && !this.max && !this.maxSize) {
      const code = "LRU_CACHE_UNBOUNDED";
      if (shouldWarn(code)) {
        warned.add(code);
        const msg =
          "TTL caching without ttlAutopurge, max, or maxSize can " +
          "result in unbounded memory consumption.";
        emitWarning(msg, "UnboundedCacheWarning", code, LRUCache);
      }
    }
  }

  /**
   * Return the number of ms left in the item's TTL. If item is not in cache,
   * returns `0`. Returns `Infinity` if item is in cache without a defined TTL.
   */
  getRemainingTTL(key: K) {
    return this.keyMap.has(key) ? Infinity : 0;
  }

  private initializeTTLTracking() {
    const ttls = new Array<number>(this.max).fill(0);
    const starts = new Array<number>(this.max).fill(0);
    this.ttls = ttls;
    this.starts = starts;
    const purgeTimers = this.ttlAutopurge
      ? new Array<undefined | ReturnType<typeof setTimeout>>(this.max)
      : undefined;
    this.autopurgeTimers = purgeTimers;

    this.setItemTTL = (index, ttl, start = performance.now()) => {
      starts[index] = ttl !== 0 ? start : 0;
      ttls[index] = ttl;
      // clear out the purge timer if we're setting TTL to 0, and
      // previously had a ttl purge timer running, so it doesn't
      // fire unnecessarily.
      if (purgeTimers?.[index]) {
        clearTimeout(purgeTimers[index]);
        purgeTimers[index] = undefined;
      }
      if (ttl !== 0 && purgeTimers) {
        const t = setTimeout(() => {
          if (this.isStale(index)) {
            this.#privateDelete(this.keyList[index] as K, "expire");
          }
        }, ttl + 1);
        // unref() not supported on all platforms
        /* c8 ignore start */
        if (t.unref) {
          t.unref();
        }
        /* c8 ignore stop */
        purgeTimers[index] = t;
      }
    };

    this.updateItemAge = (index) => {
      starts[index] = ttls[index] !== 0 ? performance.now() : 0;
    };

    this.statusTTL = (status, index) => {
      if (ttls[index]) {
        const ttl = ttls[index];
        const start = starts[index];
        /* c8 ignore next */
        if (!ttl || !start) return;
        status.ttl = ttl;
        status.start = start;
        status.now = cachedNow || getNow();
        const age = status.now - start;
        status.remainingTTL = ttl - age;
      }
    };

    // debounce calls to perf.now() to 1s so we're not hitting
    // that costly call repeatedly.
    let cachedNow = 0;
    const getNow = () => {
      const n = performance.now();
      if (this.ttlResolution > 0) {
        cachedNow = n;
        const t = setTimeout(() => (cachedNow = 0), this.ttlResolution);
        // not available on all platforms
        /* c8 ignore start */
        if (t.unref) {
          t.unref();
        }
        /* c8 ignore stop */
      }
      return n;
    };

    this.getRemainingTTL = (key) => {
      const index = this.keyMap.get(key);
      if (index === undefined) {
        return 0;
      }
      const ttl = ttls[index];
      const start = starts[index];
      if (!ttl || !start) {
        return Infinity;
      }
      const age = (cachedNow || getNow()) - start;
      return ttl - age;
    };

    this.isStale = (index) => {
      const s = starts[index];
      const t = ttls[index];
      return !!t && !!s && (cachedNow || getNow()) - s > t;
    };
  }

  // conditionally set private methods related to TTL
  private updateItemAge: (index: number) => void = () => {};

  private statusTTL: (status: Status<V>, index: number) => void = () => {};

  private setItemTTL: (
    index: number,
    ttl: number,
    start?: number,
    // ignore because we never call this if we're not already in TTL mode
    /* c8 ignore start */
  ) => void = () => {};
  /* c8 ignore stop */

  isStale: (index: number) => boolean = () => false;

  private initializeSizeTracking() {
    const sizes = new Array<number>(this.max).fill(0);
    this.calculatedSize = 0;
    this.sizes = sizes;
    this.removeItemSize = (index) => {
      this.calculatedSize -= sizes[index] as number;
      sizes[index] = 0;
    };
    this.requireSize = (k, v, size, sizeCalculation) => {
      // provisionally accept background fetches.
      // actual value size will be checked when they return.
      if (this.isBackgroundFetch(v)) {
        return 0;
      }
      if (!isPosInt(size)) {
        if (sizeCalculation) {
          if (typeof sizeCalculation !== "function") {
            throw new TypeError("sizeCalculation must be a function");
          }
          size = sizeCalculation(v, k);
          if (!isPosInt(size)) {
            throw new TypeError(
              "sizeCalculation return invalid (expect positive integer)",
            );
          }
        } else {
          throw new TypeError(
            "invalid size value (must be positive integer). " +
              "When maxSize or maxEntrySize is used, sizeCalculation " +
              "or size must be set.",
          );
        }
      }
      return size;
    };
    this.addItemSize = (index: number, size: number, status?: Status<V>) => {
      sizes[index] = size;
      if (this.maxSize) {
        const maxSize = this.maxSize - (sizes[index] as number);
        while (this.calculatedSize > maxSize) {
          this.evict(true);
        }
      }
      this.calculatedSize += sizes[index] as number;
      if (status) {
        status.entrySize = size;
        status.totalCalculatedSize = this.calculatedSize;
      }
    };
  }

  private removeItemSize: (index: number) => void = (_i) => {};

  private addItemSize: (
    index: number,
    size: number,
    status?: Status<V>,
  ) => void = (_i, _s, _st) => {};

  private requireSize: (
    k: K,
    v: V | BackgroundFetch<V>,
    size?: number,
    sizeCalculation?: SizeCalculator<K, V>,
  ) => number = (
    _k: K,
    _v: V | BackgroundFetch<V>,
    size?: number,
    sizeCalculation?: SizeCalculator<K, V>,
  ) => {
    if (size || sizeCalculation) {
      throw new TypeError(
        "cannot set size without setting maxSize or maxEntrySize on cache",
      );
    }
    return 0;
  };

  *indexes({ allowStale = this.allowStale } = {}) {
    if (this.size) {
      for (let i = this.tail; true; ) {
        if (!this.isValidIndex(i)) {
          break;
        }
        if (allowStale || !this.isStale(i)) {
          yield i;
        }
        if (i === this.head) {
          break;
        } else {
          i = this.prev[i] as number;
        }
      }
    }
  }

  *rindexes({ allowStale = this.allowStale } = {}) {
    if (this.size) {
      for (let i = this.head; true; ) {
        if (!this.isValidIndex(i)) {
          break;
        }
        if (allowStale || !this.isStale(i)) {
          yield i;
        }
        if (i === this.tail) {
          break;
        } else {
          i = this.next[i] as number;
        }
      }
    }
  }

  private isValidIndex(index: number) {
    return (
      index !== undefined && this.keyMap.get(this.keyList[index] as K) === index
    );
  }

  /**
   * Return a generator yielding `[key, value]` pairs,
   * in order from most recently used to least recently used.
   */
  *entries() {
    for (const i of this.indexes()) {
      if (
        this.valList[i] !== undefined &&
        this.keyList[i] !== undefined &&
        !this.isBackgroundFetch(this.valList[i])
      ) {
        yield [this.keyList[i], this.valList[i]] as [K, V];
      }
    }
  }

  /**
   * Inverse order version of {@link entries}
   *
   * Return a generator yielding `[key, value]` pairs,
   * in order from least recently used to most recently used.
   */
  *rentries() {
    for (const i of this.rindexes()) {
      if (
        this.valList[i] !== undefined &&
        this.keyList[i] !== undefined &&
        !this.isBackgroundFetch(this.valList[i])
      ) {
        yield [this.keyList[i], this.valList[i]];
      }
    }
  }

  /**
   * Return a generator yielding the keys in the cache,
   * in order from most recently used to least recently used.
   */
  *keys() {
    for (const i of this.indexes()) {
      const k = this.keyList[i];
      if (k !== undefined && !this.isBackgroundFetch(this.valList[i])) {
        yield k;
      }
    }
  }

  /**
   * Inverse order version of {@link keys}
   *
   * Return a generator yielding the keys in the cache,
   * in order from least recently used to most recently used.
   */
  *rkeys() {
    for (const i of this.rindexes()) {
      const k = this.keyList[i];
      if (k !== undefined && !this.isBackgroundFetch(this.valList[i])) {
        yield k;
      }
    }
  }

  /**
   * Return a generator yielding the values in the cache,
   * in order from most recently used to least recently used.
   */
  *values() {
    for (const i of this.indexes()) {
      const v = this.valList[i];
      if (v !== undefined && !this.isBackgroundFetch(this.valList[i])) {
        yield this.valList[i] as V;
      }
    }
  }

  /**
   * Inverse order version of {@link values}
   *
   * Return a generator yielding the values in the cache,
   * in order from least recently used to most recently used.
   */
  *rvalues() {
    for (const i of this.rindexes()) {
      const v = this.valList[i];
      if (v !== undefined && !this.isBackgroundFetch(this.valList[i])) {
        yield this.valList[i];
      }
    }
  }

  /**
   * Iterating over the cache itself yields the same results as
   * {@link entries}
   */
  [Symbol.iterator]() {
    return this.entries();
  }

  /**
   * A String value that is used in the creation of the default string
   * description of an object. Called by the built-in method
   * `Object.prototype.toString`.
   */
  [Symbol.toStringTag] = "LRUCache";

  /**
   * Find a value for which the supplied fn method returns a truthy value,
   * similar to `Array.find()`. fn is called as `fn(value, key, cache)`.
   */
  find(
    fn: (v: V, k: K, self: LRUCache<K, V, FC>) => boolean,
    getOptions: GetOptions<K, V, FC> = {},
  ) {
    for (const i of this.indexes()) {
      const v = this.valList[i];
      const value = this.isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      if (value === undefined) continue;
      if (fn(value, this.keyList[i] as K, this)) {
        return this.get(this.keyList[i] as K, getOptions);
      }
    }
    return undefined;
  }

  /**
   * Call the supplied function on each item in the cache, in order from most
   * recently used to least recently used.
   *
   * `fn` is called as `fn(value, key, cache)`.
   *
   * If `thisp` is provided, function will be called in the `this`-context of
   * the provided object, or the cache if no `thisp` object is provided.
   *
   * Does not update age or recenty of use, or iterate over stale values.
   */
  forEach(
    fn: (v: V, k: K, self: LRUCache<K, V, FC>) => any,
    thisp: any = this,
  ) {
    for (const i of this.indexes()) {
      const v = this.valList[i];
      const value = this.isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      if (value === undefined) continue;
      fn.call(thisp, value, this.keyList[i] as K, this);
    }
  }

  /**
   * The same as {@link forEach} but items are iterated over in
   * reverse order.  (ie, less recently used items are iterated over first.)
   */
  rforEach(
    fn: (v: V, k: K, self: LRUCache<K, V, FC>) => any,
    thisp: any = this,
  ) {
    for (const i of this.rindexes()) {
      const v = this.valList[i];
      const value = this.isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      if (value === undefined) continue;
      fn.call(thisp, value, this.keyList[i] as K, this);
    }
  }

  /**
   * Delete any stale entries. Returns true if anything was removed,
   * false otherwise.
   */
  purgeStale() {
    let deleted = false;
    for (const i of this.rindexes({ allowStale: true })) {
      if (this.isStale(i)) {
        this.#privateDelete(this.keyList[i] as K, "expire");
        deleted = true;
      }
    }
    return deleted;
  }

  /**
   * Get the extended info about a given entry, to get its value, size, and
   * TTL info simultaneously. Returns `undefined` if the key is not present.
   *
   * Unlike {@link LRUCache#dump}, which is designed to be portable and survive
   * serialization, the `start` value is always the current timestamp, and the
   * `ttl` is a calculated remaining time to live (negative if expired).
   *
   * Always returns stale values, if their info is found in the cache, so be
   * sure to check for expirations (ie, a negative {@link Entry#ttl})
   * if relevant.
   */
  info(key: K): Entry<V> | undefined {
    const i = this.keyMap.get(key);
    if (i === undefined) return undefined;
    const v = this.valList[i];
    /* c8 ignore start - this isn't tested for the info function,
     * but it's the same logic as found in other places. */
    const value: V | undefined = this.isBackgroundFetch(v)
      ? v.__staleWhileFetching
      : v;
    if (value === undefined) return undefined;
    /* c8 ignore end */
    const entry: Entry<V> = { value };
    if (this.ttls && this.starts) {
      const ttl = this.ttls[i];
      const start = this.starts[i];
      if (ttl && start) {
        const remain = ttl - (performance.now() - start);
        entry.ttl = remain;
        entry.start = Date.now();
      }
    }
    if (this.sizes) {
      entry.size = this.sizes[i];
    }
    return entry;
  }

  /**
   * Return an array of [key, {@link Entry}] tuples which can be
   * passed to {@link LRUCache#load}.
   *
   * The `start` fields are calculated relative to a portable `Date.now()`
   * timestamp, even if `performance.now()` is available.
   *
   * Stale entries are always included in the `dump`, even if
   * {@link OptionsBase.allowStale} is false.
   *
   * Note: this returns an actual array, not a generator, so it can be more
   * easily passed around.
   */
  dump() {
    const arr: [K, Entry<V>][] = [];
    for (const i of this.indexes({ allowStale: true })) {
      const key = this.keyList[i];
      const v = this.valList[i];
      const value: V | undefined = this.isBackgroundFetch(v)
        ? v.__staleWhileFetching
        : v;
      if (value === undefined || key === undefined) continue;
      const entry: Entry<V> = { value };
      if (this.ttls && this.starts) {
        entry.ttl = this.ttls[i];
        // always dump the start relative to a portable timestamp
        // it's ok for this to be a bit slow, it's a rare operation.
        const age = performance.now() - (this.starts[i] as number);
        entry.start = Math.floor(Date.now() - age);
      }
      if (this.sizes) {
        entry.size = this.sizes[i];
      }
      arr.unshift([key, entry]);
    }
    return arr;
  }

  /**
   * Reset the cache and load in the items in entries in the order listed.
   *
   * The shape of the resulting cache may be different if the same options are
   * not used in both caches.
   *
   * The `start` fields are assumed to be calculated relative to a portable
   * `Date.now()` timestamp, even if `performance.now()` is available.
   */
  load(arr: [K, Entry<V>][]) {
    this.clear();
    for (const [key, entry] of arr) {
      if (entry.start) {
        // entry.start is a portable timestamp, but we may be using
        // node's performance.now(), so calculate the offset, so that
        // we get the intended remaining TTL, no matter how long it's
        // been on ice.
        //
        // it's ok for this to be a bit slow, it's a rare operation.
        const age = Date.now() - entry.start;
        entry.start = performance.now() - age;
      }
      this.set(key, entry.value, entry);
    }
  }

  /**
   * Add a value to the cache.
   *
   * Note: if `undefined` is specified as a value, this is an alias for
   * {@link LRUCache#privateDelete}
   *
   * Fields on the {@link SetOptions} options param will override
   * their corresponding values in the constructor options for the scope
   * of this single `set()` operation.
   *
   * If `start` is provided, then that will set the effective start
   * time for the TTL calculation. Note that this must be a previous
   * value of `performance.now()` if supported, or a previous value of
   * `Date.now()` if not.
   *
   * Options object may also include `size`, which will prevent
   * calling the `sizeCalculation` function and just use the specified
   * number if it is a positive integer, and `noDisposeOnSet` which
   * will prevent calling a `dispose` function in the case of
   * overwrites.
   *
   * If the `size` (or return value of `sizeCalculation`) for a given
   * entry is greater than `maxEntrySize`, then the item will not be
   * added to the cache.
   *
   * Will update the recency of the entry.
   *
   * If the value is `undefined`, then this is an alias for
   * `cache.delete(key)`. `undefined` is never stored in the cache.
   */
  set(
    k: K,
    v: V | BackgroundFetch<V> | undefined,
    setOptions: SetOptions<K, V, FC> = {},
  ) {
    if (v === undefined) {
      this.delete(k);
      return this;
    }
    const {
      ttl = this.ttl,
      start,
      noDisposeOnSet = this.noDisposeOnSet,
      sizeCalculation = this.sizeCalculation,
      status,
    } = setOptions;
    let { noUpdateTTL = this.noUpdateTTL } = setOptions;

    const size = this.requireSize(k, v, setOptions.size || 0, sizeCalculation);
    // if the item doesn't fit, don't do anything
    // NB: maxEntrySize set to maxSize by default
    if (this.maxEntrySize && size > this.maxEntrySize) {
      if (status) {
        status.set = "miss";
        status.maxEntrySizeExceeded = true;
      }
      // have to delete, in case something is there already.
      this.#privateDelete(k, "set");
      return this;
    }
    let index = this.size === 0 ? undefined : this.keyMap.get(k);
    if (index === undefined) {
      // addition
      index = (
        this.size === 0
          ? this.tail
          : this.free.length !== 0
            ? this.free.pop()
            : this.size === this.max
              ? this.evict(false)
              : this.size
      ) as number;
      this.keyList[index] = k;
      this.valList[index] = v;
      this.keyMap.set(k, index);
      this.next[this.tail] = index;
      this.prev[index] = this.tail;
      this.tail = index;
      this.size++;
      this.addItemSize(index, size, status);
      if (status) status.set = "add";
      noUpdateTTL = false;
      if (this.hasOnInsert) {
        this.onInsert?.(v as V, k, "add");
      }
    } else {
      // update
      this.moveToTail(index);
      const oldVal = this.valList[index] as V | BackgroundFetch<V>;
      if (v !== oldVal) {
        if (this.hasFetchMethod && this.isBackgroundFetch(oldVal)) {
          oldVal.__abortController.abort(new Error("replaced"));
          const { __staleWhileFetching: s } = oldVal;
          if (s !== undefined && !noDisposeOnSet) {
            if (this.hasDispose) {
              this.dispose?.(s as V, k, "set");
            }
            if (this.hasDisposeAfter) {
              this.disposed?.push([s as V, k, "set"]);
            }
          }
        } else if (!noDisposeOnSet) {
          if (this.hasDispose) {
            this.dispose?.(oldVal as V, k, "set");
          }
          if (this.hasDisposeAfter) {
            this.disposed?.push([oldVal as V, k, "set"]);
          }
        }
        this.removeItemSize(index);
        this.addItemSize(index, size, status);
        this.valList[index] = v;
        if (status) {
          status.set = "replace";
          const oldValue =
            oldVal && this.isBackgroundFetch(oldVal)
              ? oldVal.__staleWhileFetching
              : oldVal;
          if (oldValue !== undefined) status.oldValue = oldValue;
        }
      } else if (status) {
        status.set = "update";
      }

      if (this.hasOnInsert) {
        this.onInsert?.(v as V, k, v === oldVal ? "update" : "replace");
      }
    }
    if (ttl !== 0 && !this.ttls) {
      this.initializeTTLTracking();
    }
    if (this.ttls) {
      if (!noUpdateTTL) {
        this.setItemTTL(index, ttl, start);
      }
      if (status) this.statusTTL(status, index);
    }
    if (!noDisposeOnSet && this.hasDisposeAfter && this.disposed) {
      const dt = this.disposed;
      let task: DisposeTask<K, V> | undefined;
      while ((task = dt?.shift())) {
        this.disposeAfter?.(...task);
      }
    }
    return this;
  }

  /**
   * Evict the least recently used item, returning its value or
   * `undefined` if cache is empty.
   */
  pop(): V | undefined {
    try {
      while (this.size) {
        const val = this.valList[this.head];
        this.evict(true);
        if (this.isBackgroundFetch(val)) {
          if (val.__staleWhileFetching) {
            return val.__staleWhileFetching;
          }
        } else if (val !== undefined) {
          return val;
        }
      }
    } finally {
      if (this.hasDisposeAfter && this.disposed) {
        const dt = this.disposed;
        let task: DisposeTask<K, V> | undefined;
        while ((task = dt?.shift())) {
          this.disposeAfter?.(...task);
        }
      }
      // return undefined;
    }
  }

  private evict(free: boolean) {
    const head = this.head;
    const k = this.keyList[head] as K;
    const v = this.valList[head] as V;
    if (this.hasFetchMethod && this.isBackgroundFetch(v)) {
      v.__abortController.abort(new Error("evicted"));
    } else if (this.hasDispose || this.hasDisposeAfter) {
      if (this.hasDispose) {
        this.dispose?.(v, k, "evict");
      }
      if (this.hasDisposeAfter) {
        this.disposed?.push([v, k, "evict"]);
      }
    }
    this.removeItemSize(head);
    if (this.autopurgeTimers?.[head]) {
      clearTimeout(this.autopurgeTimers[head]);
      this.autopurgeTimers[head] = undefined;
    }
    // if we aren't about to use the index, then null these out
    if (free) {
      this.keyList[head] = undefined;
      this.valList[head] = undefined;
      this.free.push(head);
    }
    if (this.size === 1) {
      this.head = this.tail = 0 as number;
      this.free.length = 0;
    } else {
      this.head = this.next[head] as number;
    }
    this.keyMap.delete(k);
    this.size--;
    return head;
  }

  /**
   * Check if a key is in the cache, without updating the recency of use.
   * Will return false if the item is stale, even though it is technically
   * in the cache.
   *
   * Check if a key is in the cache, without updating the recency of
   * use. Age is updated if {@link OptionsBase.updateAgeOnHas} is set
   * to `true` in either the options or the constructor.
   *
   * Will return `false` if the item is stale, even though it is technically in
   * the cache. The difference can be determined (if it matters) by using a
   * `status` argument, and inspecting the `has` field.
   *
   * Will not update item age unless
   * {@link OptionsBase.updateAgeOnHas} is set.
   */
  has(k: K, hasOptions: HasOptions<K, V, FC> = {}) {
    const { updateAgeOnHas = this.updateAgeOnHas, status } = hasOptions;
    const index = this.keyMap.get(k);
    if (index !== undefined) {
      const v = this.valList[index];
      if (this.isBackgroundFetch(v) && v.__staleWhileFetching === undefined) {
        return false;
      }
      if (!this.isStale(index)) {
        if (updateAgeOnHas) {
          this.updateItemAge(index);
        }
        if (status) {
          status.has = "hit";
          this.statusTTL(status, index);
        }
        return true;
      } else if (status) {
        status.has = "stale";
        this.statusTTL(status, index);
      }
    } else if (status) {
      status.has = "miss";
    }
    return false;
  }

  /**
   * Like {@link LRUCache#get} but doesn't update recency or delete stale
   * items.
   *
   * Returns `undefined` if the item is stale, unless
   * {@link OptionsBase.allowStale} is set.
   */
  peek(k: K, peekOptions: PeekOptions<K, V, FC> = {}) {
    const { allowStale = this.allowStale } = peekOptions;
    const index = this.keyMap.get(k);
    if (index === undefined || (!allowStale && this.isStale(index))) {
      return;
    }
    const v = this.valList[index];
    // either stale and allowed, or forcing a refresh of non-stale value
    return this.isBackgroundFetch(v) ? v.__staleWhileFetching : v;
  }

  backgroundFetch(
    k: K,
    index: number | undefined,
    options: FetchOptions<K, V, FC>,
    context: any,
  ): BackgroundFetch<V> {
    const v = index === undefined ? undefined : this.valList[index];
    if (this.isBackgroundFetch(v)) {
      return v;
    }

    const ac = new AbortController();
    const { signal } = options;
    // when/if our AC signals, then stop listening to theirs.
    signal?.addEventListener("abort", () => ac.abort(signal.reason), {
      signal: ac.signal,
    });

    const fetchOpts = {
      signal: ac.signal,
      options,
      context,
    };

    const cb = (v: V | undefined, updateCache = false): V | undefined => {
      const { aborted } = ac.signal;
      const ignoreAbort = options.ignoreFetchAbort && v !== undefined;
      if (options.status) {
        if (aborted && !updateCache) {
          options.status.fetchAborted = true;
          options.status.fetchError = ac.signal.reason;
          if (ignoreAbort) options.status.fetchAbortIgnored = true;
        } else {
          options.status.fetchResolved = true;
        }
      }
      if (aborted && !ignoreAbort && !updateCache) {
        return fetchFail(ac.signal.reason);
      }
      // either we didn't abort, and are still here, or we did, and ignored
      const bf = p as BackgroundFetch<V>;
      // if nothing else has been written there but we're set to update the
      // cache and ignore the abort, or if it's still pending on this specific
      // background request, then write it to the cache.
      const vl = this.valList[index as number];
      if (vl === p || (ignoreAbort && updateCache && vl === undefined)) {
        if (v === undefined) {
          if (bf.__staleWhileFetching !== undefined) {
            this.valList[index as number] = bf.__staleWhileFetching;
          } else {
            this.#privateDelete(k, "fetch");
          }
        } else {
          if (options.status) options.status.fetchUpdated = true;
          this.set(k, v, fetchOpts.options);
        }
      }
      return v;
    };

    const eb = (er: any) => {
      if (options.status) {
        options.status.fetchRejected = true;
        options.status.fetchError = er;
      }
      return fetchFail(er);
    };

    const fetchFail = (er: any): V | undefined => {
      const { aborted } = ac.signal;
      const allowStaleAborted = aborted && options.allowStaleOnFetchAbort;
      const allowStale =
        allowStaleAborted || options.allowStaleOnFetchRejection;
      const noDelete = allowStale || options.noDeleteOnFetchRejection;
      const bf = p as BackgroundFetch<V>;
      if (this.valList[index as number] === p) {
        // if we allow stale on fetch rejections, then we need to ensure that
        // the stale value is not removed from the cache when the fetch fails.
        const del = !noDelete || bf.__staleWhileFetching === undefined;
        if (del) {
          this.#privateDelete(k, "fetch");
        } else if (!allowStaleAborted) {
          // still replace the *promise* with the stale value,
          // since we are done with the promise at this point.
          // leave it untouched if we're still waiting for an
          // aborted background fetch that hasn't yet returned.
          this.valList[index as number] = bf.__staleWhileFetching;
        }
      }
      if (allowStale) {
        if (options.status && bf.__staleWhileFetching !== undefined) {
          options.status.returnedStale = true;
        }
        return bf.__staleWhileFetching;
      } else if (bf.__returned === bf) {
        throw er;
      }
      return undefined;
    };

    const pcall = (res: (v: V | undefined) => void, rej: (e: any) => void) => {
      const fmp = this.fetchMethod?.(k, v, fetchOpts);
      if (fmp && fmp instanceof Promise) {
        fmp.then((v) => res(v === undefined ? undefined : v), rej);
      }
      // ignored, we go until we finish, regardless.
      // defer check until we are actually aborting,
      // so fetchMethod can override.
      ac.signal.addEventListener("abort", () => {
        if (!options.ignoreFetchAbort || options.allowStaleOnFetchAbort) {
          res(undefined);
          // when it eventually resolves, update the cache.
          if (options.allowStaleOnFetchAbort) {
            res = (v) => cb(v, true);
          }
        }
      });
    };

    if (options.status) options.status.fetchDispatched = true;
    const p = new Promise(pcall).then(cb, eb);
    const bf: BackgroundFetch<V> = Object.assign(p, {
      __abortController: ac,
      __staleWhileFetching: v,
      __returned: undefined,
    });

    if (index === undefined) {
      // internal, don't expose status.
      this.set(k, bf, { ...fetchOpts.options, status: undefined });
      index = this.keyMap.get(k);
    } else {
      this.valList[index] = bf;
    }
    return bf;
  }

  isBackgroundFetch(p: any): p is BackgroundFetch<V> {
    if (!this.hasFetchMethod) return false;
    const b = p as BackgroundFetch<V>;
    return (
      !!b &&
      b instanceof Promise &&
      b.hasOwnProperty("__staleWhileFetching") &&
      b.__abortController instanceof AbortController
    );
  }

  /**
   * Make an asynchronous cached fetch using the
   * {@link OptionsBase.fetchMethod} function.
   *
   * If the value is in the cache and not stale, then the returned
   * Promise resolves to the value.
   *
   * If not in the cache, or beyond its TTL staleness, then
   * `fetchMethod(key, staleValue, { options, signal, context })` is
   * called, and the value returned will be added to the cache once
   * resolved.
   *
   * If called with `allowStale`, and an asynchronous fetch is
   * currently in progress to reload a stale value, then the former
   * stale value will be returned.
   *
   * If called with `forceRefresh`, then the cached item will be
   * re-fetched, even if it is not stale. However, if `allowStale` is also
   * set, then the old value will still be returned. This is useful
   * in cases where you want to force a reload of a cached value. If
   * a background fetch is already in progress, then `forceRefresh`
   * has no effect.
   *
   * If multiple fetches for the same key are issued, then they will all be
   * coalesced into a single call to fetchMethod.
   *
   * Note that this means that handling options such as
   * {@link OptionsBase.allowStaleOnFetchAbort},
   * {@link FetchOptions.signal},
   * and {@link OptionsBase.allowStaleOnFetchRejection} will be
   * determined by the FIRST fetch() call for a given key.
   *
   * This is a known (fixable) shortcoming which will be addresed on when
   * someone complains about it, as the fix would involve added complexity and
   * may not be worth the costs for this edge case.
   *
   * If {@link OptionsBase.fetchMethod} is not specified, then this is
   * effectively an alias for `Promise.resolve(cache.get(key))`.
   *
   * When the fetch method resolves to a value, if the fetch has not
   * been aborted due to deletion, eviction, or being overwritten,
   * then it is added to the cache using the options provided.
   *
   * If the key is evicted or deleted before the `fetchMethod`
   * resolves, then the AbortSignal passed to the `fetchMethod` will
   * receive an `abort` event, and the promise returned by `fetch()`
   * will reject with the reason for the abort.
   *
   * If a `signal` is passed to the `fetch()` call, then aborting the
   * signal will abort the fetch and cause the `fetch()` promise to
   * reject with the reason provided.
   *
   * **Setting `context`**
   *
   * If an `FC` type is set to a type other than `unknown`, `void`, or
   * `undefined` in the {@link LRUCache} constructor, then all
   * calls to `cache.fetch()` _must_ provide a `context` option. If
   * set to `undefined` or `void`, then calls to fetch _must not_
   * provide a `context` option.
   *
   * The `context` param allows you to provide arbitrary data that
   * might be relevant in the course of fetching the data. It is only
   * relevant for the course of a single `fetch()` operation, and
   * discarded afterwards.
   *
   * **Note: `fetch()` calls are inflight-unique**
   *
   * If you call `fetch()` multiple times with the same key value,
   * then every call after the first will resolve on the same
   * promise<sup>1</sup>,
   * _even if they have different settings that would otherwise change
   * the behavior of the fetch_, such as `noDeleteOnFetchRejection`
   * or `ignoreFetchAbort`.
   *
   * In most cases, this is not a problem (in fact, only fetching
   * something once is what you probably want, if you're caching in
   * the first place). If you are changing the fetch() options
   * dramatically between runs, there's a good chance that you might
   * be trying to fit divergent semantics into a single object, and
   * would be better off with multiple cache instances.
   *
   * **1**: Ie, they're not the "same Promise", but they resolve at
   * the same time, because they're both waiting on the same
   * underlying fetchMethod response.
   */

  fetch(
    k: K,
    fetchOptions: unknown extends FC
      ? FetchOptions<K, V, FC>
      : FC extends undefined | void
        ? FetchOptionsNoContext<K, V>
        : FetchOptionsWithContext<K, V, FC>,
  ): Promise<undefined | V>;

  // this overload not allowed if context is required
  fetch(
    k: unknown extends FC ? K : FC extends undefined | void ? K : never,
    fetchOptions?: unknown extends FC
      ? FetchOptions<K, V, FC>
      : FC extends undefined | void
        ? FetchOptionsNoContext<K, V>
        : never,
  ): Promise<undefined | V>;

  async fetch(
    k: K,
    fetchOptions: FetchOptions<K, V, FC> = {},
  ): Promise<undefined | V> {
    const {
      // get options
      allowStale = this.allowStale,
      updateAgeOnGet = this.updateAgeOnGet,
      noDeleteOnStaleGet = this.noDeleteOnStaleGet,
      // set options
      ttl = this.ttl,
      noDisposeOnSet = this.noDisposeOnSet,
      size = 0,
      sizeCalculation = this.sizeCalculation,
      noUpdateTTL = this.noUpdateTTL,
      // fetch exclusive options
      noDeleteOnFetchRejection = this.noDeleteOnFetchRejection,
      allowStaleOnFetchRejection = this.allowStaleOnFetchRejection,
      ignoreFetchAbort = this.ignoreFetchAbort,
      allowStaleOnFetchAbort = this.allowStaleOnFetchAbort,
      context,
      forceRefresh = false,
      status,
      signal,
    } = fetchOptions;

    if (!this.hasFetchMethod) {
      if (status) status.fetch = "get";
      return this.get(k, {
        allowStale,
        updateAgeOnGet,
        noDeleteOnStaleGet,
        status,
      });
    }

    const options = {
      allowStale,
      updateAgeOnGet,
      noDeleteOnStaleGet,
      ttl,
      noDisposeOnSet,
      size,
      sizeCalculation,
      noUpdateTTL,
      noDeleteOnFetchRejection,
      allowStaleOnFetchRejection,
      allowStaleOnFetchAbort,
      ignoreFetchAbort,
      status,
      signal,
    };

    let index = this.keyMap.get(k);
    if (index === undefined) {
      if (status) status.fetch = "miss";
      const p = this.backgroundFetch(k, index, options, context);
      return (p.__returned = p);
    } else {
      // in cache, maybe already fetching
      const v = this.valList[index];
      if (this.isBackgroundFetch(v)) {
        const stale = allowStale && v.__staleWhileFetching !== undefined;
        if (status) {
          status.fetch = "inflight";
          if (stale) status.returnedStale = true;
        }
        return stale ? v.__staleWhileFetching : (v.__returned = v);
      }

      // if we force a refresh, that means do NOT serve the cached value,
      // unless we are already in the process of refreshing the cache.
      const isStale = this.isStale(index);
      if (!forceRefresh && !isStale) {
        if (status) status.fetch = "hit";
        this.moveToTail(index);
        if (updateAgeOnGet) {
          this.updateItemAge(index);
        }
        if (status) this.statusTTL(status, index);
        return v;
      }

      // ok, it is stale or a forced refresh, and not already fetching.
      // refresh the cache.
      const p = this.backgroundFetch(k, index, options, context);
      const hasStale = p.__staleWhileFetching !== undefined;
      const staleVal = hasStale && allowStale;
      if (status) {
        status.fetch = isStale ? "stale" : "refresh";
        if (staleVal && isStale) status.returnedStale = true;
      }
      return staleVal ? p.__staleWhileFetching : (p.__returned = p);
    }
  }

  /**
   * In some cases, `cache.fetch()` may resolve to `undefined`, either because
   * a {@link OptionsBasefetchMethod} was not provided (turning
   * `cache.fetch(k)` into just an async wrapper around `cache.get(k)`) or
   * because `ignoreFetchAbort` was specified (either to the constructor or
   * in the {@link FetchOptions}). Also, the
   * {@link OptionsBase.fetchMethod} may return `undefined` or `void`, making
   * the test even more complicated.
   *
   * Because inferring the cases where `undefined` might be returned are so
   * cumbersome, but testing for `undefined` can also be annoying, this method
   * can be used, which will reject if `this.fetch()` resolves to undefined.
   */
  forceFetch(
    k: K,
    fetchOptions: unknown extends FC
      ? FetchOptions<K, V, FC>
      : FC extends undefined | void
        ? FetchOptionsNoContext<K, V>
        : FetchOptionsWithContext<K, V, FC>,
  ): Promise<V>;

  // this overload not allowed if context is required
  forceFetch(
    k: unknown extends FC ? K : FC extends undefined | void ? K : never,
    fetchOptions?: unknown extends FC
      ? FetchOptions<K, V, FC>
      : FC extends undefined | void
        ? FetchOptionsNoContext<K, V>
        : never,
  ): Promise<V>;

  async forceFetch(
    k: K,
    fetchOptions: FetchOptions<K, V, FC> = {},
  ): Promise<V> {
    const v = await this.fetch(
      k,
      fetchOptions as unknown extends FC
        ? FetchOptions<K, V, FC>
        : FC extends undefined | void
          ? FetchOptionsNoContext<K, V>
          : FetchOptionsWithContext<K, V, FC>,
    );
    if (v === undefined) throw new Error("fetch() returned undefined");
    return v;
  }

  /**
   * If the key is found in the cache, then this is equivalent to
   * {@link LRUCache#get}. If not, in the cache, then calculate the value using
   * the {@link OptionsBase.memoMethod}, and add it to the cache.
   *
   * If an `FC` type is set to a type other than `unknown`, `void`, or
   * `undefined` in the LRUCache constructor, then all calls to `cache.memo()`
   * _must_ provide a `context` option. If set to `undefined` or `void`, then
   * calls to memo _must not_ provide a `context` option.
   *
   * The `context` param allows you to provide arbitrary data that might be
   * relevant in the course of fetching the data. It is only relevant for the
   * course of a single `memo()` operation, and discarded afterwards.
   */
  memo(
    k: K,
    memoOptions: unknown extends FC
      ? MemoOptions<K, V, FC>
      : FC extends undefined | void
        ? MemoOptionsNoContext<K, V>
        : MemoOptionsWithContext<K, V, FC>,
  ): V;

  // this overload not allowed if context is required
  memo(
    k: unknown extends FC ? K : FC extends undefined | void ? K : never,
    memoOptions?: unknown extends FC
      ? MemoOptions<K, V, FC>
      : FC extends undefined | void
        ? MemoOptionsNoContext<K, V>
        : never,
  ): V;

  memo(k: K, memoOptions: MemoOptions<K, V, FC> = {}) {
    const memoMethod = this.memoMethod;
    if (!memoMethod) {
      throw new Error("no memoMethod provided to constructor");
    }
    const { context, forceRefresh, ...options } = memoOptions;
    const v = this.get(k, options);
    if (!forceRefresh && v !== undefined) return v;
    const vv = memoMethod(k, v, {
      options,
      context,
    } as MemoizerOptions<K, V, FC>);
    this.set(k, vv, options);
    return vv;
  }

  /**
   * Return a value from the cache. Will update the recency of the cache
   * entry found.
   *
   * If the key is not found, get() will return `undefined`.
   */
  get(k: K, getOptions: GetOptions<K, V, FC> = {}) {
    const {
      allowStale = this.allowStale,
      updateAgeOnGet = this.updateAgeOnGet,
      noDeleteOnStaleGet = this.noDeleteOnStaleGet,
      status,
    } = getOptions;
    const index = this.keyMap.get(k);
    if (index !== undefined) {
      const value = this.valList[index];
      const fetching = this.isBackgroundFetch(value);
      if (status) this.statusTTL(status, index);
      if (this.isStale(index)) {
        if (status) status.get = "stale";
        // delete only if not an in-flight background fetch
        if (!fetching) {
          if (!noDeleteOnStaleGet) {
            this.#privateDelete(k, "expire");
          }
          if (status && allowStale) status.returnedStale = true;
          return allowStale ? value : undefined;
        } else {
          if (
            status &&
            allowStale &&
            value.__staleWhileFetching !== undefined
          ) {
            status.returnedStale = true;
          }
          return allowStale ? value.__staleWhileFetching : undefined;
        }
      } else {
        if (status) status.get = "hit";
        // if we're currently fetching it, we don't actually have it yet
        // it's not stale, which means this isn't a staleWhileRefetching.
        // If it's not stale, and fetching, AND has a __staleWhileFetching
        // value, then that means the user fetched with {forceRefresh:true},
        // so it's safe to return that value.
        if (fetching) {
          return value.__staleWhileFetching;
        }
        this.moveToTail(index);
        if (updateAgeOnGet) {
          this.updateItemAge(index);
        }
        return value;
      }
    } else if (status) {
      status.get = "miss";
    }
    return undefined;
  }

  private connect(p: number, n: number) {
    this.prev[n] = p;
    this.next[p] = n;
  }

  moveToTail(index: number): void {
    // if tail already, nothing to do
    // if head, move head to next[index]
    // else
    //   move next[prev[index]] to next[index] (head has no prev)
    //   move prev[next[index]] to prev[index]
    // prev[index] = tail
    // next[tail] = index
    // tail = index
    if (index !== this.tail) {
      if (index === this.head) {
        this.head = this.next[index] as number;
      } else {
        this.connect(this.prev[index] as number, this.next[index] as number);
      }
      this.connect(this.tail, index);
      this.tail = index;
    }
  }

  /**
   * Deletes a key out of the cache.
   *
   * Returns true if the key was deleted, false otherwise.
   */
  delete(k: K) {
    return this.#privateDelete(k, "delete");
  }

  #privateDelete(k: K, reason: DisposeReason) {
    let deleted = false;
    if (this.size !== 0) {
      const index = this.keyMap.get(k);
      if (index !== undefined) {
        if (this.autopurgeTimers?.[index]) {
          clearTimeout(this.autopurgeTimers?.[index]);
          this.autopurgeTimers[index] = undefined;
        }
        deleted = true;
        if (this.size === 1) {
          this.#privateClear(reason);
        } else {
          this.removeItemSize(index);
          const v = this.valList[index];
          if (this.isBackgroundFetch(v)) {
            v.__abortController.abort(new Error("deleted"));
          } else if (this.hasDispose || this.hasDisposeAfter) {
            if (this.hasDispose) {
              this.dispose?.(v as V, k, reason);
            }
            if (this.hasDisposeAfter) {
              this.disposed?.push([v as V, k, reason]);
            }
          }
          this.keyMap.delete(k);
          this.keyList[index] = undefined;
          this.valList[index] = undefined;
          if (index === this.tail) {
            this.tail = this.prev[index] as number;
          } else if (index === this.head) {
            this.head = this.next[index] as number;
          } else {
            const pi = this.prev[index] as number;
            this.next[pi] = this.next[index] as number;
            const ni = this.next[index] as number;
            this.prev[ni] = this.prev[index] as number;
          }
          this.size--;
          this.free.push(index);
        }
      }
    }
    if (this.hasDisposeAfter && this.disposed?.length) {
      const dt = this.disposed;
      let task: DisposeTask<K, V> | undefined;
      while ((task = dt?.shift())) {
        this.disposeAfter?.(...task);
      }
    }
    return deleted;
  }

  /**
   * Clear the cache entirely, throwing away all values.
   */
  clear() {
    return this.#privateClear("delete");
  }

  #privateClear(reason: DisposeReason) {
    for (const index of this.rindexes({ allowStale: true })) {
      const v = this.valList[index];
      if (this.isBackgroundFetch(v)) {
        v.__abortController.abort(new Error("deleted"));
      } else {
        const k = this.keyList[index];
        if (this.hasDispose) {
          this.dispose?.(v as V, k as K, reason);
        }
        if (this.hasDisposeAfter) {
          this.disposed?.push([v as V, k as K, reason]);
        }
      }
    }

    this.keyMap.clear();
    this.valList.fill(undefined);
    this.keyList.fill(undefined);
    if (this.ttls && this.starts) {
      this.ttls.fill(0);
      this.starts.fill(0);
      for (const t of this.autopurgeTimers ?? []) {
        if (t !== undefined) clearTimeout(t);
      }
      this.autopurgeTimers?.fill(undefined);
    }
    if (this.sizes) {
      this.sizes.fill(0);
    }
    this.head = 0 as number;
    this.tail = 0 as number;
    this.free.length = 0;
    this.calculatedSize = 0;
    this.size = 0;
    if (this.hasDisposeAfter && this.disposed) {
      const dt = this.disposed;
      let task: DisposeTask<K, V> | undefined;
      while ((task = dt?.shift())) {
        this.disposeAfter?.(...task);
      }
    }
  }
}
