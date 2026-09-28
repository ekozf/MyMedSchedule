/**
 * "As needed" shortcuts at the end of Today: one glass pill per active as-needed medicine.
 * Hidden when there are none.
 *
 * @example
 * <AsNeededSection medications={prnMeds} onLog={(id) => router.push({ pathname: '/log/as-needed', params: { medicationId: id } })} />
 */
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HandHeart, Plus } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Icon, MedTile, PressableScale, SectionHeader, Text, useTheme } from '@/components/ds';
import { formatDose } from '@/lib/ui/format';
import { GUTTER } from '@/lib/ui/layout';
import type { Medication } from '@/types';

export interface AsNeededSectionProps {
  medications: Pick<Medication, 'id' | 'name' | 'imageUri' | 'dosageAmount' | 'dosageUnit'>[];
  onLog: (medicationId: string) => void;
}

export function AsNeededSection({ medications, onLog }: AsNeededSectionProps) {
  const { colors, isDark } = useTheme();
  if (medications.length === 0) return null;
  return (
    <View>
      <SectionHeader icon={HandHeart} title={i18n.t('ui.today.asNeeded.title')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -GUTTER }}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 10, paddingVertical: 4 }}>
        {medications.map((m) => (
          <PressableScale
            key={m.id}
            onPress={() => onLog(m.id)}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('ui.today.asNeeded.a11y', { name: m.name })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 64,
              maxWidth: 280,
              paddingLeft: 8,
              paddingRight: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: colors.surface,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: colors.stroke,
              ...(isDark
                ? null
                : {
                    shadowColor: colors.shadow,
                    shadowOpacity: 0.06,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 6 },
                  }),
            }}>
            <MedTile name={m.name} imageUri={m.imageUri} size="sm" style={{ borderRadius: 20 }} />
            <View style={{ flexShrink: 1 }}>
              <Text variant="headline" numberOfLines={1}>
                {m.name}
              </Text>
              <Text variant="footnote" tone="secondary" numberOfLines={1}>
                {formatDose(m.dosageAmount, m.dosageUnit)}
              </Text>
            </View>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon as={Plus} size={18} tone="accent" strokeWidth={2.5} />
            </View>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}
