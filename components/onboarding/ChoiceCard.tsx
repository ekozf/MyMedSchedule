/**
 * Large choice card (Protect step): icon tile, title, description, optional badges, chevron or a
 * spinner while busy. `plain` renders a quiet, card-less row (e.g. "Not now").
 *
 * @example
 * <ChoiceCard icon={ScanFace} title="Face ID" description="Quick and private." badges={[{ label: 'Recommended', tone: 'success' }]} onPress={setupBio} />
 * <ChoiceCard plain icon={ShieldOff} title="Not now" description="…" onPress={skip} />
 */
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import {
  Card,
  Icon,
  PressableScale,
  StatusChip,
  Text,
  statusColors,
  useTheme,
  type StatusTone,
} from '@/components/ds';

export interface ChoiceCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  badges?: { label: string; tone: StatusTone; icon?: LucideIcon }[];
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  plain?: boolean;
  /** Icon tile colour family. Default 'accent'. */
  tone?: StatusTone;
}

export function ChoiceCard({
  icon,
  title,
  description,
  badges,
  onPress,
  busy = false,
  disabled = false,
  plain = false,
  tone = 'accent',
}: ChoiceCardProps) {
  const { colors } = useTheme();
  const sc = statusColors(colors, tone);
  const label = [title, ...(badges ?? []).map((b) => b.label), description]
    .filter(Boolean)
    .join(', ');

  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View
        style={{
          width: plain ? 44 : 56,
          height: plain ? 44 : 56,
          borderRadius: plain ? 22 : 18,
          backgroundColor: plain ? colors.surfaceSunken : sc.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon as={icon} size={plain ? 22 : 28} color={plain ? colors.inkSecondary : sc.fg} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        {badges?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {badges.map((b) => (
              <StatusChip key={b.label} label={b.label} tone={b.tone} icon={b.icon} />
            ))}
          </View>
        ) : null}
        <Text variant={plain ? 'headline' : 'title3'} tone={plain ? 'secondary' : 'primary'}>
          {title}
        </Text>
        {description ? (
          <Text variant="subhead" tone={plain ? 'tertiary' : 'secondary'}>
            {description}
          </Text>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Icon as={ChevronRight} size={20} tone="tertiary" />
      )}
    </View>
  );

  const a11y = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    accessibilityState: { disabled: disabled || busy, busy },
  };

  if (plain) {
    return (
      <PressableScale
        onPress={onPress}
        disabled={disabled || busy}
        {...a11y}
        style={{
          minHeight: 64,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 20,
          justifyContent: 'center',
          opacity: disabled ? 0.45 : 1,
        }}>
        {body}
      </PressableScale>
    );
  }
  return (
    <Card
      onPress={onPress}
      disabled={disabled || busy}
      {...a11y}
      style={{ opacity: disabled ? 0.45 : 1, minHeight: 88, justifyContent: 'center' }}>
      {body}
    </Card>
  );
}
