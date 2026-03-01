import type { OptionsBase } from "./base.js";

export interface OptionsMaxLimit<K, V, FC> extends OptionsBase<K, V, FC> {
  max: number;
}

export interface OptionsSizeLimit<K, V, FC> extends OptionsBase<K, V, FC> {
  maxSize: number;
}

export interface OptionsTTLLimit<K, V, FC> extends OptionsBase<K, V, FC> {
  ttl: number;
  ttlAutopurge: boolean;
}

export type Options<K, V, FC> =
  | OptionsMaxLimit<K, V, FC>
  | OptionsSizeLimit<K, V, FC>
  | OptionsTTLLimit<K, V, FC>;
