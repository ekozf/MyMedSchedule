/**
 * Top bar for onboarding steps: optional back button, a quiet 4-step progress indicator in the
 * middle, optional right slot (e.g. the language chip on Welcome).
 *
 * @example
 * <OnboardingHeader step={1} onBack={router.back} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { IconButton, useTheme } from '@/components/ds';

export const ONBOARDING_STEPS = 4;

export interface OnboardingProgressProps {
  /** 0-based index of the current step. */
  step: number;
  total?: number;
}

/** Small capsules: done/current are accent, the current one is wider. */
export function OnboardingProgress({ step, total = ONBOARDING_STEPS }: OnboardingProgressProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={i18n.t('ui.onboarding.progress', { step: step + 1, total })}
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === step ? 22 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i <= step ? colors.accent : colors.inkTertiary,
            opacity: i <= step ? 1 : 0.45,
          }}
        />
      ))}
    </View>
  );
}

export interface OnboardingHeaderProps {
  /** Progress step (0-based). Omit to hide the indicator. */
  step?: number;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function OnboardingHeader({ step, onBack, right }: OnboardingHeaderProps) {
  return (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingTop: 4 }}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        {onBack ? (
          <IconButton
            icon={ChevronLeft}
            variant="glass"
            accessibilityLabel={i18n.t('ui.common.a11y.back')}
            onPress={onBack}
          />
        ) : null}
      </View>
      {step !== undefined ? <OnboardingProgress step={step} /> : null}
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}
