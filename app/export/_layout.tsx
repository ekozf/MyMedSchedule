import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme';

/** Export is a single modal screen (presented as a modal by the root stack). */
export default function ExportLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
