/**
 * UI string fragments for the redesign. Each fragment file is owned by one feature so parallel work
 * doesn't conflict. Strings are available as `i18n.t('ui.<fragment>.<key>')`.
 *
 * To add a fragment: create `./<name>.ts` with `defineFragment({ en, nl, tr })` and list it below.
 */
import { mergeLocale } from '../merge';
import common from './common';
import editor from './editor';
import journal from './journal';
import medicines from './medicines';
import onboarding from './onboarding';
import safety from './safety';
import shell from './shell';
import today from './today';
import you from './you';

const fragments = { common, shell, safety, today, medicines, editor, journal, you, onboarding };

type Fragments = typeof fragments;
type Lang = 'en' | 'nl' | 'tr';

function pick<L extends Lang>(lang: L): { [K in keyof Fragments]: Fragments[K][L] } {
  const out = {} as { [K in keyof Fragments]: Fragments[K][L] };
  for (const key of Object.keys(fragments) as (keyof Fragments)[]) {
    (out as Record<string, unknown>)[key] = fragments[key][lang];
  }
  return out;
}

export const uiEn = pick('en');
export type UiStrings = typeof uiEn;

/** Dutch UI strings, English-filled where a translation is missing. */
export const uiNl = mergeLocale(uiEn, pick('nl') as Record<string, unknown>) as UiStrings;
/** Turkish UI strings, English-filled where a translation is missing. */
export const uiTr = mergeLocale(uiEn, pick('tr') as Record<string, unknown>) as UiStrings;
