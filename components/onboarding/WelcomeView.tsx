/**
 * Onboarding step 1, Welcome (spec §5.1): compact language chip top right (globe + language
 * name), then the title and one sentence, then a small 2×2 pill box below them (captioned
 * "Example", footnote ink2) (the only
 * picture: 96-tall tiles at 85% opacity, not pressable, announced as one image) and "Get started"
 * at the bottom.
 *
 * @example
 * <WelcomeView languageLabel="English" onLanguagePress={openSheet} onGetStarted={next} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { Globe } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Button, Compartment, Icon, PressableScale, Screen, Text, useTheme } from '@/components/ds';
import { useTimeFormat } from '@/lib/ui/format';

export interface WelcomeViewProps {
  /** Current language in its own name ("English", "Türkçe", …). */
  languageLabel: string;
  onLanguagePress: () => void;
  onGetStarted: () => void;
}

export function WelcomeView({ languageLabel, onLanguagePress, onGetStarted }: WelcomeViewProps) {
  return (
    <Screen
      header={
        <View
          style={{
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingTop: 4,
          }}>
          <LanguageChip label={languageLabel} onPress={onLanguagePress} />
        </View>
      }
      footer={<Button label={i18n.t('ui.onboarding.welcome.getStarted')} onPress={onGetStarted} />}
      contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, gap: 28, paddingVertical: 12 }}>
        <View style={{ gap: 12 }}>
          <Text variant="title1">{i18n.t('ui.onboarding.welcome.title')}</Text>
          <Text variant="body" tone="secondary">
            {i18n.t('ui.onboarding.welcome.body')}
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          <Text variant="footnote" tone="secondary" importantForAccessibility="no">
            {i18n.t('ui.onboarding.welcome.example')}
          </Text>
          <PillBoxPicture />
        </View>
      </View>
    </Screen>
  );
}

const TILE = 96;

/**
 * Four compartments in the four states: Morning done (2/2, All taken), Midday now (1 to take,
 * Due at 13:00), Evening default (2 to take, From 20:00), Night empty. Decorative, one label.
 */
function PillBoxPicture() {
  const { formatTime } = useTimeFormat();
  const tile = TILE;
  const c = (k: string) => i18n.t(`ui.compartments.${k}`);
  const t = (k: string, o?: Record<string, string>) => i18n.t(`ui.today.tray.${k}`, o);
  const at = (h: number) => {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d;
  };
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={i18n.t('ui.onboarding.welcome.pictureA11y')}
      style={{ opacity: 0.85 }}>
      <View importantForAccessibility="no-hide-descendants" style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Compartment
            label={c('morning')}
            state="done"
            taken={2}
            total={2}
            sub={t('allTaken')}
            minHeight={tile}
            style={{ flex: 1 }}
          />
          <Compartment
            label={c('midday')}
            state="now"
            taken={0}
            total={1}
            sub={t('dueAt', { time: formatTime(at(13)) })}
            minHeight={tile}
            style={{ flex: 1 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Compartment
            label={c('evening')}
            state="default"
            taken={0}
            total={2}
            sub={t('from', { time: formatTime(at(20)) })}
            minHeight={tile}
            style={{ flex: 1 }}
          />
          <Compartment
            label={c('night')}
            state="empty"
            emptyText={c('emptyNight')}
            minHeight={tile}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

/** Compact "🌐 English" pill that opens the language sheet. 48 tall (touch target). */
export function LanguageChip({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={i18n.t('ui.onboarding.welcome.languageA11y', { language: label })}
      style={{
        minHeight: 48,
        paddingHorizontal: 14,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.field,
      }}>
      <Icon as={Globe} size={20} tone="secondary" />
      <Text variant="callout" weight="700">
        {label}
      </Text>
    </PressableScale>
  );
}
