import { Stack } from 'expo-router';

/**
 * Transparent modal group for log sheets (`/log/as-needed`, `/log/past`). Each screen renders
 * a `<Sheet visible onClose={router.back}>` over the previous screen.
 */
export default function LogLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'transparentModal',
        animation: 'fade',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
