/**
 * Launch state while the app loads its data: breathing app mark, name and a quiet spinner.
 *
 * @example
 * if (isLoadingAppState) return <BrandedLoading />;
 */
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import i18n from '@/lib/i18n';
import { GradientBackground, Text, useTheme } from '@/components/ds';
import { AppMark } from './AppMark';

export function BrandedLoading() {
  const { colors } = useTheme();
  const appName = i18n.t('ui.onboarding.appName');
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={i18n.t('ui.onboarding.loading.a11y', { appName })}>
      <GradientBackground />
      <AppMark size={104} breathing />
      {/* Delay the name + spinner so a fast launch shows only the calm mark. */}
      <Animated.View
        entering={FadeIn.duration(400).delay(500)}
        style={{ alignItems: 'center', gap: 16 }}>
        <Text variant="title2" tone="secondary">
          {appName}
        </Text>
        <ActivityIndicator color={colors.inkTertiary} />
      </Animated.View>
    </View>
  );
}
