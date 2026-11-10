/**
 * Onboarding step 1 — Welcome (first-run entry, see app/index.tsx).
 * The language chip applies `setLocale` after its sheet has closed: the root navigator remounts on
 * a locale change and rehydrates this same route, so the user stays on Welcome.
 */
import * as React from 'react';
import { router } from 'expo-router';
import { getCurrentLocale, setLocale } from '@/lib/i18n';
import {
  LanguageSheet,
  ONBOARDING_ROUTES,
  WelcomeView,
  languageName,
  toAppLocale,
  type AppLocale,
} from '@/components/onboarding';

export default function WelcomeScreen() {
  const current = toAppLocale(getCurrentLocale());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const pending = React.useRef<AppLocale | null>(null);

  const applyLanguage = () => {
    const next = pending.current;
    pending.current = null;
    if (next && next !== current) setLocale(next);
  };

  return (
    <>
      <WelcomeView
        languageLabel={languageName(current)}
        onLanguagePress={() => setSheetOpen(true)}
        // Replace keeps the onboarding stack one screen deep, so a back swipe from a later step
        // can't land on an earlier one. "Good to know" has its own back button to return here.
        onGetStarted={() => router.replace(ONBOARDING_ROUTES.disclaimer)}
      />
      <LanguageSheet
        visible={sheetOpen}
        current={current}
        onSelect={(l) => {
          pending.current = l;
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
        onDismissed={applyLanguage}
      />
    </>
  );
}
