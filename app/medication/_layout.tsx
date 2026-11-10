import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme';
import i18n from '@/lib/i18n';

export default function MedicationLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Screen
        name="add"
        options={{
          title: i18n.t('screens.addMedication'),
          // Full page (docs/DESIGN.md §5.4). Still a modal, so the flow hosts its own overlays.
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: i18n.t('screens.medicationDetails'),
        }}
      />
      <Stack.Screen
        name="edit/[id]/index"
        options={{
          title: i18n.t('screens.editMedication'),
        }}
      />
      <Stack.Screen
        name="edit/[id]/[section]"
        options={{
          title: i18n.t('screens.editMedication'),
        }}
      />
    </Stack>
  );
}
