import type { OptionsBase, Status } from "./base.js";

export interface Entry<V> {
  value: V;
  ttl?: number;
  size?: number;
  start?: number;
}

export interface GetOptions<K, V, FC> extends Pick<
  OptionsBase<K, V, FC>,
  "allowStale" | "updateAgeOnGet" | "noDeleteOnStaleGet"
> {
  status?: Status<V>;
}

export interface SetOptions<K, V, FC> extends Pick<
  OptionsBase<K, V, FC>,
  "sizeCalculation" | "ttl" | "noDisposeOnSet" | "noUpdateTTL"
> {
  /**
   * If size tracking is enabled, then setting an explicit size
   * in the {@link LRUCache#set} call will prevent calling the
   * {@link OptionsBase.sizeCalculation} function.
   */
  size?: number;
  /**
   * If TTL tracking is enabled, then setting an explicit start
   * time in the {@link LRUCache#set} call will override the
   * default time from `performance.now()` or `Date.now()`.
   *
   * Note that it must be a valid value for whichever time-tracking
   * method is in use.
   */
  start?: number;
  status?: Status<V>;
}

export interface HasOptions<K, V, FC> extends Pick<
  OptionsBase<K, V, FC>,
  "updateAgeOnHas"
> {
  status?: Status<V>;
}

export interface PeekOptions<K, V, FC> extends Pick<
  OptionsBase<K, V, FC>,
  "allowStale"
> {}
