/**
 * Tiny static progress ring (week-strip day capsules). Unlike `ProgressRing` it takes explicit
 * colours so it can sit on a filled accent capsule.
 *
 * @example
 * <MiniRing size={34} progress={2 / 3} color={colors.success} track={colors.separator}>
 *   <Text variant="headline">28</Text>
 * </MiniRing>
 */
import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export interface MiniRingProps {
  size: number;
  strokeWidth?: number;
  /** 0..1; null hides the ring (track included). */
  progress: number | null;
  color: string;
  track: string;
  children?: React.ReactNode;
}

export function MiniRing({
  size,
  strokeWidth = 2.5,
  progress,
  color,
  track,
  children,
}: MiniRingProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = progress === null ? 0 : Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {progress !== null ? (
        <Svg
          width={size}
          height={size}
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={track}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {p > 0 ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${c} ${c}`}
              strokeDashoffset={c * (1 - p)}
            />
          ) : null}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
