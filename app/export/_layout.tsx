import { Stack } from 'expo-router';

/** Export is a single modal screen (presented as a modal by the root stack). */
export default function ExportLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
