/**
 * Onboarding step 1 — Welcome: breathing app mark, name, one-line promise, three value points,
 * a language chip (top right) and a big "Get started".
 *
 * @example
 * <WelcomeView languageLabel="English" onLanguagePress={openSheet} onGetStarted={next} />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  BellRing,
  ChevronDown,
  Globe,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Button, Card, Icon, PressableScale, Screen, Text, useTheme } from '@/components/ds';
import { AppMark } from './AppMark';
import { OnboardingHeader } from './OnboardingHeader';
import { useEnter } from './motion';

export interface WelcomeViewProps {
  /** Current language in its own name ("English", "Türkçe", …). */
  languageLabel: string;
  onLanguagePress: () => void;
  onGetStarted: () => void;
}

const POINTS: { key: 'reminders' | 'local' | 'family'; icon: LucideIcon }[] = [
  { key: 'reminders', icon: BellRing },
  { key: 'local', icon: Smartphone },
  { key: 'family', icon: Users },
];

export function WelcomeView({ languageLabel, onLanguagePress, onGetStarted }: WelcomeViewProps) {
  const { colors } = useTheme();
  const enter = useEnter(120);

  return (
    <Screen
      header={
        <OnboardingHeader
          step={0}
          right={<LanguageChip label={languageLabel} onPress={onLanguagePress} />}
        />
      }
      footer={
        <Button
          label={i18n.t('ui.onboarding.welcome.getStarted')}
          size="lg"
          fullWidth
          onPress={onGetStarted}
        />
      }
      contentContainerStyle={{ justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 12 }}>
        <Animated.View entering={enter(0)}>
          <AppMark size={128} breathing />
        </Animated.View>
        <Animated.View entering={enter(1)} style={{ alignItems: 'center', marginTop: 12, gap: 8 }}>
          <Text variant="largeTitle" align="center">
            {i18n.t('ui.onboarding.appName')}
          </Text>
          <Text variant="title3" tone="secondary" align="center" weight="500">
            {i18n.t('ui.onboarding.welcome.promise')}
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={enter(2)} style={{ marginTop: 20 }}>
        <Card>
          <View style={{ gap: 14 }}>
            {POINTS.map((p) => (
              <View
                key={p.key}
                accessible
                accessibilityRole="text"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon as={p.icon} size={20} tone="accent" />
                </View>
                <Text variant="headline" weight="500" style={{ flex: 1 }}>
                  {i18n.t(`ui.onboarding.welcome.points.${p.key}`)}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Animated.View>
    </Screen>
  );
}

/** "🌐 English ▾" pill that opens the language sheet. */
export function LanguageChip({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      haptic="tap"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={i18n.t('ui.onboarding.welcome.languageA11y', { language: label })}
      hitSlop={4}
      style={{
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.stroke,
      }}>
      <Icon as={Globe} size={16} tone="secondary" />
      <Text variant="subhead" weight="600">
        {label}
      </Text>
      <Icon as={ChevronDown} size={16} tone="secondary" />
    </PressableScale>
  );
}
