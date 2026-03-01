// LRU 缓存中记录被移除的原因
// evict: 记录由于缓存容量限制被驱逐
// set: 记录被新值覆盖
// delete: 记录被显式删除
// expire: 记录 TTL 过期
// fetch: 记录被 fetchMethod 更新
export type DisposeReason = "evict" | "set" | "delete" | "expire" | "fetch";

export type DisposeTask<K, V> = [value: V, key: K, reason: DisposeReason];

export type Disposer<K, V> = (value: V, key: K, reason: DisposeReason) => void;

export type InsertReason = "add" | "update" | "replace";

export type Inserter<K, V> = (value: V, key: K, reason: InsertReason) => void;

export type SizeCalculator<K, V> = (value: V, key: K) => number;

export interface Status<V> {
  /**
   * The status of a set() operation.
   *
   * - add: the item was not found in the cache, and was added
   * - update: the item was in the cache, with the same value provided
   * - replace: the item was in the cache, and replaced
   * - miss: the item was not added to the cache for some reason
   */
  set?: "add" | "update" | "replace" | "miss";

  /**
   * the ttl stored for the item, or undefined if ttls are not used.
   */
  ttl?: number;

  /**
   * the start time for the item, or undefined if ttls are not used.
   */
  start?: number;

  /**
   * The timestamp used for TTL calculation
   */
  now?: number;

  /**
   * the remaining ttl for the item, or undefined if ttls are not used.
   */
  remainingTTL?: number;

  /**
   * The calculated size for the item, if sizes are used.
   */
  entrySize?: number;

  /**
   * The total calculated size of the cache, if sizes are used.
   */
  totalCalculatedSize?: number;

  /**
   * A flag indicating that the item was not stored, due to exceeding the
   * {@link OptionsBase.maxEntrySize}
   */
  maxEntrySizeExceeded?: true;

  /**
   * The old value, specified in the case of `set:'update'` or
   * `set:'replace'`
   */
  oldValue?: V;

  /**
   * The results of a {@link LRUCache#has} operation
   *
   * - hit: the item was found in the cache
   * - stale: the item was found in the cache, but is stale
   * - miss: the item was not found in the cache
   */
  has?: "hit" | "stale" | "miss";

  /**
   * The status of a {@link LRUCache#fetch} operation.
   * Note that this can change as the underlying fetch() moves through
   * various states.
   *
   * - inflight: there is another fetch() for this key which is in process
   * - get: there is no {@link OptionsBase.fetchMethod}, so
   *   {@link LRUCache#get} was called.
   * - miss: the item is not in cache, and will be fetched.
   * - hit: the item is in the cache, and was resolved immediately.
   * - stale: the item is in the cache, but stale.
   * - refresh: the item is in the cache, and not stale, but
   *   {@link FetchOptions.forceRefresh} was specified.
   */
  fetch?: "get" | "inflight" | "miss" | "hit" | "stale" | "refresh";

  /**
   * The {@link OptionsBase.fetchMethod} was called
   */
  fetchDispatched?: true;

  /**
   * The cached value was updated after a successful call to
   * {@link OptionsBase.fetchMethod}
   */
  fetchUpdated?: true;

  /**
   * The reason for a fetch() rejection.  Either the error raised by the
   * {@link OptionsBase.fetchMethod}, or the reason for an
   * AbortSignal.
   */
  fetchError?: Error;

  /**
   * The fetch received an abort signal
   */
  fetchAborted?: true;

  /**
   * The abort signal received was ignored, and the fetch was allowed to
   * continue.
   */
  fetchAbortIgnored?: true;

  /**
   * The fetchMethod promise resolved successfully
   */
  fetchResolved?: true;

  /**
   * The fetchMethod promise was rejected
   */
  fetchRejected?: true;

  /**
   * The status of a {@link LRUCache#get} operation.
   *
   * - fetching: The item is currently being fetched.  If a previous value
   *   is present and allowed, that will be returned.
   * - stale: The item is in the cache, and is stale.
   * - hit: the item is in the cache
   * - miss: the item is not in the cache
   */
  get?: "stale" | "hit" | "miss";

  /**
   * A fetch or get operation returned a stale value.
   */
  returnedStale?: true;
}

export interface OptionsBase<K, V, FC> {
  /**
   * The maximum number of items to store in the cache before evicting
   * old entries. This is read-only on the {@link LRUCache} instance,
   * and may not be overridden.
   *
   * If set, then storage space will be pre-allocated at construction
   * time, and the cache will perform significantly faster.
   *
   * Note that significantly fewer items may be stored, if
   * {@link OptionsBase.maxSize} and/or {@link OptionsBase.ttl} are also
   * set.
   *
   * **It is strongly recommended to set a `max` to prevent unbounded growth
   * of the cache.**
   */
  max?: number;

  /**
   * Max time in milliseconds for items to live in cache before they are
   * considered stale.  Note that stale items are NOT preemptively removed by
   * default, and MAY live in the cache, contributing to its LRU max, long
   * after they have expired, unless {@link OptionsBase.ttlAutopurge} is
   * set.
   *
   * If set to `0` (the default value), then that means "do not track
   * TTL", not "expire immediately".
   *
   * Also, as this cache is optimized for LRU/MRU operations, some of
   * the staleness/TTL checks will reduce performance, as they will incur
   * overhead by deleting items.
   *
   * This is not primarily a TTL cache, and does not make strong TTL
   * guarantees. There is no pre-emptive pruning of expired items, but you
   * _may_ set a TTL on the cache, and it will treat expired items as missing
   * when they are fetched, and delete them.
   *
   * Optional, but must be a non-negative integer in ms if specified.
   *
   * This may be overridden by passing an options object to `cache.set()`.
   *
   * At least one of `max`, `maxSize`, or `TTL` is required. This must be a
   * positive integer if set.
   *
   * Even if ttl tracking is enabled, **it is strongly recommended to set a
   * `max` to prevent unbounded growth of the cache.**
   *
   * If ttl tracking is enabled, and `max` and `maxSize` are not set,
   * and `ttlAutopurge` is not set, then a warning will be emitted
   * cautioning about the potential for unbounded memory consumption.
   * (The TypeScript definitions will also discourage this.)
   */
  ttl?: number;

  /**
   * Minimum amount of time in ms in which to check for staleness.
   * Defaults to 1, which means that the current time is checked
   * at most once per millisecond.
   *
   * Set to 0 to check the current time every time staleness is tested.
   * (This reduces performance, and is theoretically unnecessary.)
   *
   * Setting this to a higher value will improve performance somewhat
   * while using ttl tracking, albeit at the expense of keeping stale
   * items around a bit longer than their TTLs would indicate.
   *
   * @default 1
   */
  ttlResolution?: number;

  /**
   * Preemptively remove stale items from the cache.
   *
   * Note that this may *significantly* degrade performance, especially if
   * the cache is storing a large number of items. It is almost always best
   * to just leave the stale items in the cache, and let them fall out as new
   * items are added.
   *
   * Note that this means that {@link OptionsBase.allowStale} is a bit
   * pointless, as stale items will be deleted almost as soon as they
   * expire.
   *
   * Use with caution!
   */
  ttlAutopurge?: boolean;

  /**
   * When using time-expiring entries with `ttl`, setting this to `true` will
   * make each item's age reset to 0 whenever it is retrieved from cache with
   * {@link LRUCache#get}, causing it to not expire. (It can still fall out
   * of cache based on recency of use, of course.)
   *
   * Has no effect if {@link OptionsBase.ttl} is not set.
   *
   * This may be overridden by passing an options object to `cache.get()`.
   */
  updateAgeOnGet?: boolean;

  /**
   * When using time-expiring entries with `ttl`, setting this to `true` will
   * make each item's age reset to 0 whenever its presence in the cache is
   * checked with {@link LRUCache#has}, causing it to not expire. (It can
   * still fall out of cache based on recency of use, of course.)
   *
   * Has no effect if {@link OptionsBase.ttl} is not set.
   */
  updateAgeOnHas?: boolean;

  /**
   * Allow {@link LRUCache#get} and {@link LRUCache#fetch} calls to return
   * stale data, if available.
   *
   * By default, if you set `ttl`, stale items will only be deleted from the
   * cache when you `get(key)`. That is, it's not preemptively pruning items,
   * unless {@link OptionsBase.ttlAutopurge} is set.
   *
   * If you set `allowStale:true`, it'll return the stale value *as well as*
   * deleting it. If you don't set this, then it'll return `undefined` when
   * you try to get a stale entry.
   *
   * Note that when a stale entry is fetched, _even if it is returned due to
   * `allowStale` being set_, it is removed from the cache immediately. You
   * can suppress this behavior by setting
   * {@link OptionsBase.noDeleteOnStaleGet}, either in the constructor, or in
   * the options provided to {@link LRUCache#get}.
   *
   * This may be overridden by passing an options object to `cache.get()`.
   * The `cache.has()` method will always return `false` for stale items.
   *
   * Only relevant if a ttl is set.
   */
  allowStale?: boolean;

  /**
   * Function that is called on items when they are dropped from the
   * cache, as `dispose(value, key, reason)`.
   *
   * This can be handy if you want to close file descriptors or do
   * other cleanup tasks when items are no longer stored in the cache.
   *
   * **NOTE**: It is called _before_ the item has been fully removed
   * from the cache, so if you want to put it right back in, you need
   * to wait until the next tick. If you try to add it back in during
   * the `dispose()` function call, it will break things in subtle and
   * weird ways.
   *
   * Unlike several other options, this may _not_ be overridden by
   * passing an option to `set()`, for performance reasons.
   *
   * The `reason` will be one of the following strings, corresponding
   * to the reason for the item's deletion:
   *
   * - `evict` Item was evicted to make space for a new addition
   * - `set` Item was overwritten by a new value
   * - `expire` Item expired its TTL
   * - `fetch` Item was deleted due to a failed or aborted fetch, or a
   *   fetchMethod returning `undefined.
   * - `delete` Item was removed by explicit `cache.delete(key)`,
   *   `cache.clear()`, or `cache.set(key, undefined)`.
   */
  dispose?: Disposer<K, V>;

  /**
   * Function that is called when new items are inserted into the cache,
   * as `onInsert(value, key, reason)`.
   *
   * This can be useful if you need to perform actions when an item is
   * added, such as logging or tracking insertions.
   *
   * Unlike some other options, this may _not_ be overridden by passing
   * an option to `set()`, for performance and consistency reasons.
   */
  onInsert?: Inserter<K, V>;

  /**
   * The same as {@link OptionsBase.dispose}, but called *after* the entry
   * is completely removed and the cache is once again in a clean state.
   *
   * It is safe to add an item right back into the cache at this point.
   * However, note that it is *very* easy to inadvertently create infinite
   * recursion this way.
   */
  disposeAfter?: Disposer<K, V>;

  /**
   * Set to true to suppress calling the
   * {@link OptionsBase.dispose} function if the entry key is
   * still accessible within the cache.
   *
   * This may be overridden by passing an options object to
   * {@link LRUCache#set}.
   *
   * Only relevant if `dispose` or `disposeAfter` are set.
   */
  noDisposeOnSet?: boolean;

  /**
   * Boolean flag to tell the cache to not update the TTL when setting a new
   * value for an existing key (ie, when updating a value rather than
   * inserting a new value).  Note that the TTL value is _always_ set (if
   * provided) when adding a new entry into the cache.
   *
   * Has no effect if a {@link OptionsBase.ttl} is not set.
   *
   * May be passed as an option to {@link LRUCache#set}.
   */
  noUpdateTTL?: boolean;

  /**
   * Set to a positive integer to track the sizes of items added to the
   * cache, and automatically evict items in order to stay below this size.
   * Note that this may result in fewer than `max` items being stored.
   *
   * Attempting to add an item to the cache whose calculated size is greater
   * that this amount will be a no-op. The item will not be cached, and no
   * other items will be evicted.
   *
   * Optional, must be a positive integer if provided.
   *
   * Sets `maxEntrySize` to the same value, unless a different value is
   * provided for `maxEntrySize`.
   *
   * At least one of `max`, `maxSize`, or `TTL` is required. This must be a
   * positive integer if set.
   *
   * Even if size tracking is enabled, **it is strongly recommended to set a
   * `max` to prevent unbounded growth of the cache.**
   *
   * Note also that size tracking can negatively impact performance,
   * though for most cases, only minimally.
   */
  maxSize?: number;

  /**
   * The maximum allowed size for any single item in the cache.
   *
   * If a larger item is passed to {@link LRUCache#set} or returned by a
   * {@link OptionsBase.fetchMethod} or {@link OptionsBase.memoMethod}, then
   * it will not be stored in the cache.
   *
   * Attempting to add an item whose calculated size is greater than
   * this amount will not cache the item or evict any old items, but
   * WILL delete an existing value if one is already present.
   *
   * Optional, must be a positive integer if provided. Defaults to
   * the value of `maxSize` if provided.
   */
  maxEntrySize?: number;

  /**
   * A function that returns a number indicating the item's size.
   *
   * Requires {@link OptionsBase.maxSize} to be set.
   *
   * If not provided, and {@link OptionsBase.maxSize} or
   * {@link OptionsBase.maxEntrySize} are set, then all
   * {@link LRUCache#set} calls **must** provide an explicit
   * {@link SetOptions.size} or sizeCalculation param.
   */
  sizeCalculation?: SizeCalculator<K, V>;

  /**
   * Method that provides the implementation for {@link LRUCache#fetch}
   *
   * ```ts
   * fetchMethod(key, staleValue, { signal, options, context })
   * ```
   *
   * If `fetchMethod` is not provided, then `cache.fetch(key)` is equivalent
   * to `Promise.resolve(cache.get(key))`.
   *
   * If at any time, `signal.aborted` is set to `true`, or if the
   * `signal.onabort` method is called, or if it emits an `'abort'` event
   * which you can listen to with `addEventListener`, then that means that
   * the fetch should be abandoned. This may be passed along to async
   * functions aware of AbortController/AbortSignal behavior.
   *
   * The `fetchMethod` should **only** return `undefined` or a Promise
   * resolving to `undefined` if the AbortController signaled an `abort`
   * event. In all other cases, it should return or resolve to a value
   * suitable for adding to the cache.
   *
   * The `options` object is a union of the options that may be provided to
   * `set()` and `get()`. If they are modified, then that will result in
   * modifying the settings to `cache.set()` when the value is resolved, and
   * in the case of
   * {@link OptionsBase.noDeleteOnFetchRejection} and
   * {@link OptionsBase.allowStaleOnFetchRejection}, the handling of
   * `fetchMethod` failures.
   *
   * For example, a DNS cache may update the TTL based on the value returned
   * from a remote DNS server by changing `options.ttl` in the `fetchMethod`.
   */
  fetchMethod?: Fetcher<K, V, FC>;

  /**
   * Method that provides the implementation for {@link LRUCache#memo}
   */
  memoMethod?: Memoizer<K, V, FC>;

  /**
   * Set to true to suppress the deletion of stale data when a
   * {@link OptionsBase.fetchMethod} returns a rejected promise.
   */
  noDeleteOnFetchRejection?: boolean;

  /**
   * Do not delete stale items when they are retrieved with
   * {@link LRUCache#get}.
   *
   * Note that the `get` return value will still be `undefined`
   * unless {@link OptionsBase.allowStale} is true.
   *
   * When using time-expiring entries with `ttl`, by default stale
   * items will be removed from the cache when the key is accessed
   * with `cache.get()`.
   *
   * Setting this option will cause stale items to remain in the cache, until
   * they are explicitly deleted with `cache.delete(key)`, or retrieved with
   * `noDeleteOnStaleGet` set to `false`.
   *
   * This may be overridden by passing an options object to `cache.get()`.
   *
   * Only relevant if a ttl is used.
   */
  noDeleteOnStaleGet?: boolean;

  /**
   * Set to true to allow returning stale data when a
   * {@link OptionsBase.fetchMethod} throws an error or returns a rejected
   * promise.
   *
   * This differs from using {@link OptionsBase.allowStale} in that stale
   * data will ONLY be returned in the case that the {@link LRUCache#fetch}
   * fails, not any other times.
   *
   * If a `fetchMethod` fails, and there is no stale value available, the
   * `fetch()` will resolve to `undefined`. Ie, all `fetchMethod` errors are
   * suppressed.
   *
   * Implies `noDeleteOnFetchRejection`.
   *
   * This may be set in calls to `fetch()`, or defaulted on the constructor,
   * or overridden by modifying the options object in the `fetchMethod`.
   */
  allowStaleOnFetchRejection?: boolean;

  /**
   * Set to true to return a stale value from the cache when the
   * `AbortSignal` passed to the {@link OptionsBase.fetchMethod} dispatches
   * an `'abort'` event, whether user-triggered, or due to internal cache
   * behavior.
   *
   * Unless {@link OptionsBase.ignoreFetchAbort} is also set, the underlying
   * {@link OptionsBase.fetchMethod} will still be considered canceled, and
   * any value it returns will be ignored and not cached.
   *
   * Caveat: since fetches are aborted when a new value is explicitly
   * set in the cache, this can lead to fetch returning a stale value,
   * since that was the fallback value _at the moment the `fetch()` was
   * initiated_, even though the new updated value is now present in
   * the cache.
   *
   * For example:
   *
   * ```ts
   * const cache = new LRUCache<string, any>({
   *   ttl: 100,
   *   fetchMethod: async (url, oldValue, { signal }) =>  {
   *     const res = await fetch(url, { signal })
   *     return await res.json()
   *   }
   * })
   * cache.set('https://example.com/', { some: 'data' })
   * // 100ms go by...
   * const result = cache.fetch('https://example.com/')
   * cache.set('https://example.com/', { other: 'thing' })
   * console.log(await result) // { some: 'data' }
   * console.log(cache.get('https://example.com/')) // { other: 'thing' }
   * ```
   */
  allowStaleOnFetchAbort?: boolean;

  /**
   * Set to true to ignore the `abort` event emitted by the `AbortSignal`
   * object passed to {@link OptionsBase.fetchMethod}, and still cache the
   * resulting resolution value, as long as it is not `undefined`.
   *
   * When used on its own, this means aborted {@link LRUCache#fetch} calls
   * are not immediately resolved or rejected when they are aborted, and
   * instead take the full time to await.
   *
   * When used with {@link OptionsBase.allowStaleOnFetchAbort}, aborted
   * {@link LRUCache#fetch} calls will resolve immediately to their stale
   * cached value or `undefined`, and will continue to process and eventually
   * update the cache when they resolve, as long as the resulting value is
   * not `undefined`, thus supporting a "return stale on timeout while
   * refreshing" mechanism by passing `AbortSignal.timeout(n)` as the signal.
   *
   * For example:
   *
   * ```ts
   * const c = new LRUCache({
   *   ttl: 100,
   *   ignoreFetchAbort: true,
   *   allowStaleOnFetchAbort: true,
   *   fetchMethod: async (key, oldValue, { signal }) => {
   *     // note: do NOT pass the signal to fetch()!
   *     // let's say this fetch can take a long time.
   *     const res = await fetch(`https://slow-backend-server/${key}`)
   *     return await res.json()
   *   },
   * })
   *
   * // this will return the stale value after 100ms, while still
   * // updating in the background for next time.
   * const val = await c.fetch('key', { signal: AbortSignal.timeout(100) })
   * ```
   *
   * **Note**: regardless of this setting, an `abort` event _is still
   * emitted on the `AbortSignal` object_, so may result in invalid results
   * when passed to other underlying APIs that use AbortSignals.
   *
   * This may be overridden in the {@link OptionsBase.fetchMethod} or the
   * call to {@link LRUCache#fetch}.
   */
  ignoreFetchAbort?: boolean;
}

export interface MemoizerMemoOptions<K, V, FC = unknown> extends Pick<
  OptionsBase<K, V, FC>,
  | "allowStale"
  | "updateAgeOnGet"
  | "noDeleteOnStaleGet"
  | "sizeCalculation"
  | "ttl"
  | "noDisposeOnSet"
  | "noUpdateTTL"
> {
  status?: Status<V>;
  size?: number;
  start?: number;
}

export interface MemoizerOptions<K, V, FC = unknown> {
  options: MemoizerMemoOptions<K, V, FC>;
  /**
   * Object provided in the {@link MemoOptions.context} option to
   * {@link LRUCache#memo}
   */
  context: FC;
}

export type Memoizer<K, V, FC = unknown> = (
  key: K,
  staleValue: V | undefined,
  options: MemoizerOptions<K, V, FC>,
) => V;

export interface FetcherFetchOptions<K, V, FC = unknown> extends Pick<
  OptionsBase<K, V, FC>,
  | "allowStale"
  | "updateAgeOnGet"
  | "noDeleteOnStaleGet"
  | "sizeCalculation"
  | "ttl"
  | "noDisposeOnSet"
  | "noUpdateTTL"
  | "noDeleteOnFetchRejection"
  | "allowStaleOnFetchRejection"
  | "ignoreFetchAbort"
  | "allowStaleOnFetchAbort"
> {
  status?: Status<V>;
  size?: number;
}

export interface FetcherOptions<K, V, FC = unknown> {
  signal: AbortSignal;
  options: FetcherFetchOptions<K, V, FC>;
  /**
   * Object provided in the {@link FetchOptions.context} option to
   * {@link LRUCache#fetch}
   */
  context: FC;
}

export type Fetcher<K, V, FC = unknown> = (
  key: K,
  staleValue: V | undefined,
  options: FetcherOptions<K, V, FC>,
) => Promise<V | undefined | void> | V | undefined | void;
