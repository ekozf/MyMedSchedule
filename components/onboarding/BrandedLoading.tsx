/**
 * Launch state while the app loads its data: flat `bg`, and only after a short delay the app name
 * and a quiet spinner (a fast launch shows nothing but the background).
 *
 * @example
 * if (isLoadingAppState) return <BrandedLoading />;
 */
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import i18n from '@/lib/i18n';
import { Text, useTheme } from '@/components/ds';

export function BrandedLoading() {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const appName = i18n.t('ui.onboarding.appName');
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
      }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={i18n.t('ui.onboarding.loading.a11y', { appName })}>
      <Animated.View
        entering={FadeIn.duration(reduceMotion ? 1 : 300).delay(500)}
        style={{ alignItems: 'center', gap: 16 }}>
        <Text variant="title2" tone="secondary">
          {appName}
        </Text>
        <ActivityIndicator color={colors.ink2} />
      </Animated.View>
    </View>
  );
}
