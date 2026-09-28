import { Redirect, Stack } from 'expo-router';

/** Design previews (gallery + per-feature mock screens). Development builds only. */
export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}
    />
  );
}
