/**
 * Full-screen "Airy sky" gradient (bgTop → bgMid → bgBottom). Absolutely fills its parent.
 *
 * @example
 * <View style={{ flex: 1 }}>
 *   <GradientBackground />
 *   {content}
 * </View>
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';

export function GradientBackground({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[colors.bgTop, colors.bgMid, colors.bgBottom]}
      locations={[0, 0.45, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}
