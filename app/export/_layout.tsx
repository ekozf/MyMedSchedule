import { Stack } from 'expo-router';

export default function ExportLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        presentation: 'modal',
      }}
    />
  );
}
