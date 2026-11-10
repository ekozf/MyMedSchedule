/**
 * Onboarding step 2, "Before you start" (one consent page), and the full "Good to know" text as
 * a single scrolling read-only page (`?viewOnly=true`, closes with router.back()), opened from
 * You → About or from the consent page's "Read the full text" (`&fullText=true`). The acknowledgement
 * record (version, device info, timestamp from the DB) is unchanged.
 */
import * as React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useStore } from '@/store';
import { createDisclaimerAcknowledgment } from '@/lib/db/operations';
import { DisclaimerView, ONBOARDING_ROUTES } from '@/components/onboarding';

const DISCLAIMER_VERSION = '1.0.0';

export default function DisclaimerScreen() {
  const params = useLocalSearchParams<{ viewOnly?: string; fullText?: string }>();
  const viewOnly = params.viewOnly === 'true';
  const setDisclaimerAcknowledged = useStore((s) => s.setDisclaimerAcknowledged);
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
        appVersion: Constants.expoConfig?.version,
      });
      await createDisclaimerAcknowledgment({ version: DISCLAIMER_VERSION, deviceInfo });
    } catch (error) {
      // Still allow to continue in case of error (as before).
      console.error('Failed to save disclaimer acknowledgment:', error);
    }
    setDisclaimerAcknowledged(true);
    router.replace(ONBOARDING_ROUTES.authSetup);
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
      onContinue={handleContinue}
      continuing={saving}
      onExit={exit}
      onReadFull={() => router.push(ONBOARDING_ROUTES.disclaimerFullText)}
    />
  );
}
