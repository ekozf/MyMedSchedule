import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme';

/**
 * Log routes. `/log/past` is a full page pushed with the platform's default transition.
 * (As-needed doses are logged with an in-place sheet on Today and the medicine page.)
 */
export default function LogLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Screen name="past" />
    </Stack>
  );
}
