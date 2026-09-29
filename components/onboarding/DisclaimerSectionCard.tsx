/**
 * One disclaimer section: big tinted icon, overline, short title and every item as an icon row.
 * `compact` (view-only list) uses a smaller hero.
 *
 * @example
 * <DisclaimerSectionCard section={DISCLAIMER_SECTIONS[0]} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { Card, Icon, Text, statusColors, useTheme, withAlpha } from '@/components/ds';
import type { DisclaimerSection } from './disclaimer-content';

export interface DisclaimerSectionCardProps {
  section: DisclaimerSection;
  compact?: boolean;
}

export function DisclaimerSectionCard({ section, compact = false }: DisclaimerSectionCardProps) {
  const { colors } = useTheme();
  const sc = statusColors(colors, section.tone);
  const hero = compact ? 52 : 72;
  const base = `ui.onboarding.disclaimer.sections.${section.key}`;

  return (
    <Card style={{ padding: 4 }}>
      <View style={{ gap: compact ? 12 : 16 }}>
        <View
          style={{
            flexDirection: compact ? 'row' : 'column',
            alignItems: compact ? 'center' : 'flex-start',
            gap: compact ? 14 : 14,
          }}>
          <View
            style={{
              width: hero,
              height: hero,
              borderRadius: hero / 2,
              backgroundColor: sc.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon as={section.icon} size={compact ? 26 : 36} color={sc.fg} />
          </View>
          <View style={{ flex: compact ? 1 : undefined, gap: 2 }}>
            <Text variant="caption" color={sc.fg}>
              {i18n.t(`${base}.overline`)}
            </Text>
            <Text variant={compact ? 'title3' : 'title2'} accessibilityRole="header">
              {i18n.t(`${base}.title`)}
            </Text>
          </View>
        </View>

        <View style={{ gap: 14 }}>
          {section.items.map((item) => (
            <View
              key={item.textKey}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: withAlpha(sc.fg, 0.12),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon as={item.icon} size={17} color={sc.fg} />
              </View>
              <Text variant="callout" style={{ flex: 1, paddingTop: 5 }}>
                {i18n.t(item.textKey)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}
