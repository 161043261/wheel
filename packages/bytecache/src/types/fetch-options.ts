import type { FetcherFetchOptions, Status } from "./base.js";

export interface FetchOptions<K, V, FC> extends FetcherFetchOptions<K, V, FC> {
  /**
   * Set to true to force a re-load of the existing data, even if it
   * is not yet stale.
   */
  forceRefresh?: boolean;
  /**
   * Context provided to the {@link OptionsBase.fetchMethod} as
   * the {@link FetcherOptions.context} param.
   *
   * If the FC type is specified as unknown (the default),
   * undefined or void, then this is optional.  Otherwise, it will
   * be required.
   */
  context?: FC;
  signal?: AbortSignal;
  status?: Status<V>;
}

export interface FetchOptionsNoContext<K, V> extends FetchOptions<
  K,
  V,
  undefined
> {
  context?: undefined;
}

export interface FetchOptionsWithContext<K, V, FC> extends FetchOptions<
  K,
  V,
  FC
> {
  context: FC;
}

export type BackgroundFetch<V> = Promise<V | undefined> & {
  __returned: BackgroundFetch<V> | undefined;
  __abortController: AbortController;
  __staleWhileFetching: V | undefined;
};
