/**
 * Onboarding step 2, "Before you start" (one consent page), and the full "Good to know" text as
 * a single scrolling read-only page (`?viewOnly=true`, closes with router.back()), opened from
 * You → About or from the consent page's "Read the full text" (`&fullText=true`).
 * `?mode=updated`: existing users whose agreement is for an older DISCLAIMER_VERSION ("We updated
 * this", what changed, agree again), shown after unlocking; Continue goes on to Today.
 * The acknowledgement record (version, device info, timestamp from the DB) is unchanged.
 */
import * as React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useStore } from '@/store';
import { createDisclaimerAcknowledgment } from '@/lib/db/operations';
import {
  DISCLAIMER_VERSION,
  DisclaimerView,
  ONBOARDING_ROUTES,
  hrefForLaunchRoute,
  launchRoute,
} from '@/components/onboarding';

/** The installed app's version ("1.2.0"), as the store shows it. */
function appVersion(): string | undefined {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? undefined;
}

export default function DisclaimerScreen() {
  const params = useLocalSearchParams<{ viewOnly?: string; fullText?: string; mode?: string }>();
  const viewOnly = params.viewOnly === 'true';
  const updated = params.mode === 'updated';
  const setDisclaimerAcknowledged = useStore((s) => s.setDisclaimerAcknowledged);
  const setDisclaimerUpToDate = useStore((s) => s.setDisclaimerUpToDate);
  const [saving, setSaving] = React.useState(false);

  const exit = React.useCallback(() => router.replace(ONBOARDING_ROUTES.welcome), []);

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const deviceInfo = JSON.stringify({
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        appVersion: appVersion(),
      });
      await createDisclaimerAcknowledgment({ version: DISCLAIMER_VERSION, deviceInfo });
    } catch (error) {
      // Still allow to continue in case of error (as before).
      console.error('Failed to save disclaimer acknowledgment:', error);
    }
    setDisclaimerAcknowledged(true);
    setDisclaimerUpToDate(true);
    if (updated) {
      const { hasCompletedOnboarding, isAuthenticated, activeProfile } = useStore.getState();
      router.replace(
        hrefForLaunchRoute(
          launchRoute({
            hasCompletedOnboarding,
            isAuthenticated,
            hasProfile: !!activeProfile,
            disclaimerUpToDate: true,
          })
        )
      );
    } else {
      router.replace(ONBOARDING_ROUTES.authSetup);
    }
    setSaving(false);
  };

  if (viewOnly) {
    return (
      <DisclaimerView
        viewOnly
        fullText={params.fullText === 'true'}
        onClose={() => router.back()}
      />
    );
  }

  return (
    <DisclaimerView
      updated={updated}
      onContinue={handleContinue}
      continuing={saving}
      onExit={updated ? undefined : exit}
      onReadFull={() => router.push(ONBOARDING_ROUTES.disclaimerFullText)}
    />
  );
}
