/**
 * The four "Good to know" topics (spec §5.1), in order. Texts live in
 * `ui.onboarding.disclaimer.pages.<key>` (title, one-sentence `summary` for the consent page,
 * and the full paragraphs). See the locale file for which
 * legal point of the old disclaimer each paragraph carries.
 *
 * @example
 * DISCLAIMER_PAGES.map((p) => disclaimerTitle(p)) // ["Your data stays with you", …]
 */
import i18n from '@/lib/i18n';

export type DisclaimerPageKey = 'privacy' | 'medical' | 'technical' | 'responsibility';

export interface DisclaimerPage {
  key: DisclaimerPageKey;
  paragraphs: string[];
}

export const DISCLAIMER_PAGES: DisclaimerPage[] = [
  { key: 'privacy', paragraphs: ['p1', 'p2', 'p3', 'p4'] },
  { key: 'medical', paragraphs: ['p1', 'p2', 'p3', 'p4'] },
  { key: 'technical', paragraphs: ['p1', 'p2', 'p3', 'p4'] },
  { key: 'responsibility', paragraphs: ['p1', 'p2', 'p3'] },
];

/**
 * What changed in the current DISCLAIMER_VERSION, for the "We updated this" page
 * (`ui.onboarding.disclaimer.changes.<key>`). Replace the list with each bump.
 */
export const DISCLAIMER_CHANGES = ['privacy', 'limits', 'alarms'] as const;
export type DisclaimerChangeKey = (typeof DISCLAIMER_CHANGES)[number];

export function disclaimerChange(key: DisclaimerChangeKey): string {
  return i18n.t(`ui.onboarding.disclaimer.changes.${key}`);
}

export function disclaimerTitle(page: DisclaimerPage): string {
  return i18n.t(`ui.onboarding.disclaimer.pages.${page.key}.title`);
}

/** One plain sentence for the consent page. */
export function disclaimerSummary(page: DisclaimerPage): string {
  return i18n.t(`ui.onboarding.disclaimer.pages.${page.key}.summary`);
}

export function disclaimerParagraphs(page: DisclaimerPage): string[] {
  return page.paragraphs.map((p) => i18n.t(`ui.onboarding.disclaimer.pages.${page.key}.${p}`));
}
