import { View, Modal, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react-native';
import { updateIntakeLog, updateMedicationInventory } from '@/lib/db/operations';
import { useStore } from '@/store';
import i18n from '@/lib/i18n';
import type { IntakeLog, Medication } from '@/types';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';

export interface EditLogDialogProps {
  visible: boolean;
  log: IntakeLog | null;
  medications: Medication[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditLogDialog({
  visible,
  log,
  medications,
  onClose,
  onSuccess,
}: EditLogDialogProps) {
  const dateFnsLocale = getDateFnsLocale();
  const { activeProfile, loadMedications } = useStore();
  const [action, setAction] = useState<'taken' | 'skipped' | 'partial'>('taken');
  const [dosageAmount, setDosageAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (log && visible) {
      setAction(log.action);
      setDosageAmount(log.dosageAmount.toString());
      setNotes(log.notes || '');
    }
  }, [log, visible]);

  if (!log) return null;

  const medication = medications.find((m) => m.id === log.medicationId);

  const handleSubmit = async () => {
    if (!activeProfile || !medication) return;

    const newDosageAmount = parseFloat(dosageAmount);
    if (!dosageAmount || isNaN(newDosageAmount) || newDosageAmount <= 0) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.invalidInput'));
      return;
    }

    setIsLoading(true);
    try {
      // Calculate inventory adjustment needed
      const oldAction = log.action;
      const oldAmount = log.dosageAmount;
      const newAction = action;
      const newAmount = newDosageAmount;

      // Restore old inventory impact
      let inventoryAdjustment = 0;
      if (oldAction === 'taken' || oldAction === 'partial') {
        inventoryAdjustment += oldAmount; // Add back what was taken
      }

      // Apply new inventory impact
      if (newAction === 'taken' || newAction === 'partial') {
        inventoryAdjustment -= newAmount; // Remove new amount
      }

      // Update inventory if needed
      if (inventoryAdjustment !== 0) {
        const newCount = Math.max(0, medication.inventoryCount + inventoryAdjustment);
        await updateMedicationInventory(medication.id, newCount);
        await loadMedications(activeProfile.id);
      }

      // Update the log (keeping original timestamp)
      await updateIntakeLog(log.id, {
        action,
        dosageAmount: newDosageAmount,
        notes: notes || undefined,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update log:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50" onPress={onClose}>
        <Pressable
          className="w-11/12 max-w-md rounded-2xl bg-background p-6"
          onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-foreground">
              {i18n.t('intakeLog.editLog')}
            </Text>
            <Pressable onPress={onClose}>
              <X size={24} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Medication Info */}
          <View className="mb-6 rounded-lg bg-muted p-4">
            <Text className="mb-1 text-lg font-semibold text-foreground">
              {medication?.name || 'Unknown'}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {i18n.t('history.logged')}:{' '}
              {format(new Date(log.actualTime), 'PPp', { locale: dateFnsLocale })}
            </Text>
          </View>

          {/* Action Selection */}
          <Text className="mb-3 text-sm font-medium text-foreground">
            {i18n.t('intakeLog.selectAction')}
          </Text>
          <View className="mb-4 flex-row gap-2">
            <Button
              variant={action === 'taken' ? 'default' : 'outline'}
              onPress={() => setAction('taken')}
              className="flex-1">
              <Text>{i18n.t('history.actions.taken')}</Text>
            </Button>
            <Button
              variant={action === 'skipped' ? 'default' : 'outline'}
              onPress={() => setAction('skipped')}
              className="flex-1">
              <Text>{i18n.t('history.actions.skipped')}</Text>
            </Button>
            <Button
              variant={action === 'partial' ? 'default' : 'outline'}
              onPress={() => setAction('partial')}
              className="flex-1">
              <Text>{i18n.t('history.actions.partial')}</Text>
            </Button>
          </View>

          {/* Dosage Amount */}
          <View className="mb-4">
            <Input
              label={i18n.t('intakeLog.amountTaken')}
              value={dosageAmount}
              onChangeText={setDosageAmount}
              placeholder={medication?.dosageAmount.toString()}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Input
              label={i18n.t('intakeLog.addNotes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={i18n.t('intakeLog.notesPlaceholder')}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <Button onPress={handleSubmit} disabled={isLoading}>
            <Text className="font-semibold text-primary-foreground">
              {isLoading ? i18n.t('common.loading') : i18n.t('common.save')}
            </Text>
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
