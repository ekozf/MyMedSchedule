import { useLocalSearchParams } from 'expo-router';
import { EditMedicineScreen } from '@/components/editor/EditMedicineForm';

/** Edit a medicine: one grouped page with the same section editors as the add flow. */
export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditMedicineScreen id={id} />;
}
