import type { OptionsBase, Status } from "./base.js";

export interface MemoOptions<K, V, FC = unknown> extends Pick<
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
  /**
   * Set to true to force a re-load of the existing data, even if it
   * is not yet stale.
   */
  forceRefresh?: boolean;
  /**
   * Context provided to the {@link OptionsBase.memoMethod} as
   * the {@link MemoizerOptions.context} param.
   *
   * If the FC type is specified as unknown (the default),
   * undefined or void, then this is optional.  Otherwise, it will
   * be required.
   */
  context?: FC;
  status?: Status<V>;
}

export interface MemoOptionsNoContext<K, V> extends MemoOptions<
  K,
  V,
  undefined
> {
  context?: undefined;
}

export interface MemoOptionsWithContext<K, V, FC> extends MemoOptions<
  K,
  V,
  FC
> {
  context: FC;
}
