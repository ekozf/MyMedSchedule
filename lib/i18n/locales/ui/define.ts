/**
 * Helper for UI string fragments. `en` is the source of truth (complete); `nl` / `tr` may be
 * partial and fall back to English per key (merged with `mergeLocale` in ./index.ts).
 *
 * Plurals use i18n-js objects: `{ one: '…', other: '…' }` (optionally `zero`), used as
 * `i18n.t('ui.common.units.pills', { count })`. Interpolation: `'{{name}} taken'`.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export interface UiFragment<T> {
  en: T;
  nl: DeepPartial<T>;
  tr: DeepPartial<T>;
}

export function defineFragment<const T extends Record<string, unknown>>(fragment: {
  en: T;
  nl: DeepPartial<Widen<T>>;
  tr: DeepPartial<Widen<T>>;
}): UiFragment<Widen<T>> {
  return fragment as UiFragment<Widen<T>>;
}
