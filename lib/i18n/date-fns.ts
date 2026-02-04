import { getCurrentLocale } from '@/lib/i18n';
import { enUS } from 'date-fns/locale/en-US';
import { nl } from 'date-fns/locale/nl';
import { tr } from 'date-fns/locale/tr';

export function getDateFnsLocale() {
  const locale = getCurrentLocale();
  if (locale === 'nl') return nl;
  if (locale === 'tr') return tr;
  return enUS;
}

