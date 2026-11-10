import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme';

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
