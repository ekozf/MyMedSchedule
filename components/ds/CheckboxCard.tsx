/**
 * Checkbox on a `field` card ("I understand and agree"). 30 px box; checked = accent fill with a
 * check. Selected card gets the 2 px accent border on `bg`.
 *
 * @example
 * <CheckboxCard label="I understand and agree" checked={agreed} onChange={setAgreed} />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { radii, useTheme } from '@/lib/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Icon } from './Icon';

export interface CheckboxCardProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CheckboxCard({
  label,
  description,
  checked,
  onChange,
  disabled,
  style,
}: CheckboxCardProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={[label, description].filter(Boolean).join(', ')}
      accessibilityState={{ checked, disabled: !!disabled }}
      style={[
        {
          minHeight: 76,
          borderRadius: radii.card,
          backgroundColor: checked ? colors.bg : colors.field,
          borderWidth: 2,
          borderColor: checked ? colors.accent : 'transparent',
          paddingHorizontal: 18,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          borderWidth: checked ? 2 : 2.5,
          borderColor: checked ? colors.accent : colors.line2,
          backgroundColor: checked ? colors.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {checked ? <Icon as={Check} size={20} color={colors.onAccent} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline">{label}</Text>
        {description ? (
          <Text variant="footnote" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}
