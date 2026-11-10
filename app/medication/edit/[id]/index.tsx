import { useLocalSearchParams } from 'expo-router';
import { EditMedicineScreen } from '@/components/editor/EditMedicineForm';

/** Edit a medicine: a summary list whose rows open one page each. See components/editor. */
export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditMedicineScreen id={id} />;
}
