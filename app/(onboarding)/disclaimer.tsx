/**
 * Onboarding step 2 — "Good to know" (disclaimer), and the read-only disclaimer from You
 * (`?viewOnly=true`, closes with router.back()).
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
  const params = useLocalSearchParams<{ viewOnly?: string }>();
  const viewOnly = params.viewOnly === 'true';
  const setDisclaimerAcknowledged = useStore((s) => s.setDisclaimerAcknowledged);
  const [saving, setSaving] = React.useState(false);

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
    return <DisclaimerView viewOnly onClose={() => router.back()} />;
  }

  return (
    <DisclaimerView
      onContinue={handleContinue}
      continuing={saving}
      onExit={() => router.replace(ONBOARDING_ROUTES.welcome)}
    />
  );
}
