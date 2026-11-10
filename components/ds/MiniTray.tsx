/**
 * Small pill box (docs/DESIGN.md §4): four 72-tall tiles showing which compartments a medicine
 * uses, with its time(s) inside. Used tiles are `done` fill, unused ones dashed `line2`.
 * `tone="scheduled"` shows planned (not taken) compartments neutrally: `field` fill, accent text
 * and a 2 px accent border, so green keeps meaning "taken" (medicine page, add-flow review).
 *
 * @example
 * <MiniTray slots={[
 *   { label: 'Morning', times: ['08:00'] },
 *   { label: 'Midday' },
 *   { label: 'Evening', times: ['20:00'] },
 *   { label: 'Night' },
 * ]} />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { radii, useTheme } from '@/lib/theme';
import { Text } from './Text';

export interface MiniTraySlot {
  label: string;
  /** Formatted times in this compartment. Empty/undefined = not used. */
  times?: string[];
}

export interface MiniTrayProps {
  slots: MiniTraySlot[];
  /** `done` (default): green fill. `scheduled`: field fill + accent border/text. */
  tone?: 'done' | 'scheduled';
  style?: StyleProp<ViewStyle>;
}

export function MiniTray({ slots, tone = 'done', style }: MiniTrayProps) {
  const { colors } = useTheme();
  const scheduled = tone === 'scheduled';
  const usedFill = scheduled ? colors.field : colors.done;
  const usedInk = scheduled ? colors.accent : colors.doneInk;
  const usedBorder = scheduled ? colors.accent : 'transparent';
  return (
    <View style={[{ flexDirection: 'row', gap: 8 }, style]}>
      {slots.map((slot) => {
        const used = !!slot.times && slot.times.length > 0;
        return (
          <View
            key={slot.label}
            accessible
            accessibilityLabel={[slot.label, used ? slot.times!.join(', ') : null]
              .filter(Boolean)
              .join(', ')}
            style={{
              flex: 1,
              minHeight: 72,
              borderRadius: radii.tile,
              padding: 8,
              justifyContent: 'space-between',
              backgroundColor: used ? usedFill : 'transparent',
              borderWidth: 2,
              borderStyle: used ? 'solid' : 'dashed',
              borderColor: used ? usedBorder : colors.line2,
            }}>
            <Text variant="caption" color={used ? usedInk : colors.ink2}>
              {slot.label}
            </Text>
            {used ? (
              <Text variant="subhead" weight="700" tabular color={usedInk}>
                {slot.times!.join('\n')}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
