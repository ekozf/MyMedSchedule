/**
 * Language picker: three large rows, each language in its own name, check on the current one.
 * The parent applies the choice (typically from `onDismissed`, because changing the locale
 * remounts the app's screens).
 *
 * @example
 * <LanguageSheet visible={open} value="en" onSelect={choose} onClose={() => setOpen(false)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Icon, PressableScale, Sheet, Text, useTheme } from '@/components/ds';

export type AppLanguage = 'en' | 'tr' | 'nl';
export const APP_LANGUAGES: AppLanguage[] = ['en', 'tr', 'nl'];

export function languageName(lang: string): string {
  return i18n.t(`ui.you.language.names.${lang}`, { defaultValue: lang });
}

export function isAppLanguage(value: string): value is AppLanguage {
  return (APP_LANGUAGES as string[]).includes(value);
}

export interface LanguageSheetProps {
  visible: boolean;
  value: string;
  onSelect: (lang: AppLanguage) => void;
  onClose: () => void;
  onDismissed?: () => void;
}

export function LanguageSheet({
  visible,
  value,
  onSelect,
  onClose,
  onDismissed,
}: LanguageSheetProps) {
  const { colors } = useTheme();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title={i18n.t('ui.you.language.title')}
      subtitle={i18n.t('ui.you.language.subtitle')}>
      <View style={{ gap: 10, paddingBottom: 8 }} accessibilityRole="radiogroup">
        {APP_LANGUAGES.map((lang) => {
          const selected = lang === value;
          const name = languageName(lang);
          return (
            <PressableScale
              key={lang}
              haptic="tap"
              onPress={() => onSelect(lang)}
              accessibilityRole="radio"
              accessibilityLabel={name}
              accessibilityState={{ checked: selected }}
              accessibilityLanguage={lang}
              style={{
                minHeight: 64,
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: selected ? colors.accentSoft : colors.surfaceSunken,
              }}>
              <Text variant="title3" style={{ flex: 1 }} tone={selected ? 'accent' : 'primary'}>
                {name}
              </Text>
              {selected ? (
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon as={Check} size={18} strokeWidth={3} color={colors.onAccent} />
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}
