import { useLocalSearchParams } from 'expo-router';
import { EditSectionScreen } from '@/components/editor/EditMedicineForm';
import { isSectionId } from '@/components/editor/SectionPage';

/** One page of the edit list ("Schedule", "Supply", "Note"…) with its own Save. */
export default function EditMedicationSectionScreen() {
  const { id, section } = useLocalSearchParams<{ id: string; section: string }>();
  return <EditSectionScreen id={id} section={isSectionId(section) ? section : 'name'} />;
}
