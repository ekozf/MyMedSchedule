import { Stack } from 'expo-router';
import i18n from '@/lib/i18n';

export default function MedicationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: i18n.t('common.back'),
      }}
    >
      <Stack.Screen
        name="add"
        options={{
          title: i18n.t('screens.addMedication'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: i18n.t('screens.medicationDetails'),
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: i18n.t('screens.editMedication'),
        }}
      />
    </Stack>
  );
}
