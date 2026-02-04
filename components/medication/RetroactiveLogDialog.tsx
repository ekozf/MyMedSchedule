import { View, Modal, Pressable, Alert, ScrollView, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useState } from 'react';
import { X } from 'lucide-react-native';
import { createIntakeLog, updateMedicationInventory } from '@/lib/db/operations';
import { useStore } from '@/store';
import i18n from '@/lib/i18n';
import type { Medication } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';

export interface RetroactiveLogDialogProps {
  visible: boolean;
  medications: Medication[];
  onClose: () => void;
  onSuccess: () => void;
}

export function RetroactiveLogDialog({
  visible,
  medications,
  onClose,
  onSuccess,
}: RetroactiveLogDialogProps) {
  const dateFnsLocale = getDateFnsLocale();
  const { activeProfile, loadMedications } = useStore();
  const [medicationId, setMedicationId] = useState('');
  const [action, setAction] = useState<'taken' | 'skipped' | 'partial'>('taken');
  const [dosageAmount, setDosageAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [actualTime, setActualTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const selectedMedication = medications.find((m) => m.id === medicationId);

  const medicationOptions = medications.map((med) => ({
    label: med.name,
    value: med.id,
  }));

  const handleSubmit = async () => {
    if (!activeProfile || !selectedMedication) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.requiredField'));
      return;
    }

    const amount = dosageAmount ? parseFloat(dosageAmount) : selectedMedication.dosageAmount;
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.invalidInput'));
      return;
    }

    // Check if actualTime is in the future
    if (actualTime > new Date()) {
      Alert.alert(i18n.t('common.error'), i18n.t('intakeLog.cannotLogFuture'));
      return;
    }

    setIsLoading(true);
    try {
      // Create the log
      await createIntakeLog({
        medicationId: selectedMedication.id,
        profileId: activeProfile.id,
        scheduledTime: undefined, // No scheduled time for retroactive logs
        actualTime,
        action,
        dosageAmount: amount,
        notes: notes || undefined,
      });

      // Update inventory if taken or partial
      if (action === 'taken' || action === 'partial') {
        const newCount = Math.max(0, selectedMedication.inventoryCount - amount);
        await updateMedicationInventory(selectedMedication.id, newCount);
        await loadMedications(activeProfile.id);
      }

      // Reset form
      setMedicationId('');
      setAction('taken');
      setDosageAmount('');
      setNotes('');
      setActualTime(new Date());

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create log:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[85%] rounded-t-3xl bg-background">
          <ScrollView className="p-6">
            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-foreground">
                  {i18n.t('intakeLog.logRetroactive')}
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
                  {i18n.t('intakeLog.retroactiveDescription')}
                </Text>
              </View>
              <Pressable onPress={onClose}>
                <X size={24} className="text-muted-foreground" />
              </Pressable>
            </View>

            {/* Medication Selection */}
            <View className="mb-4">
              <Select
                label={i18n.t('medications.nameLabel')}
                options={medicationOptions}
                value={medicationId}
                onValueChange={(value) => {
                  setMedicationId(value);
                  // Auto-fill dosage amount
                  const med = medications.find((m) => m.id === value);
                  if (med) {
                    setDosageAmount(med.dosageAmount.toString());
                  }
                }}
                placeholder={i18n.t('intakeLog.selectMedicationPlaceholder')}
              />
            </View>

            {selectedMedication && (
              <>
                {/* Time Selection */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-foreground">
                    {i18n.t('intakeLog.timeLabel')}
                  </Text>
                  <Button variant="outline" onPress={() => setShowTimePicker(true)}>
                    <Text>{format(actualTime, 'PPp', { locale: dateFnsLocale })}</Text>
                  </Button>
                  {showTimePicker && (
                    <DateTimePicker
                      value={actualTime}
                      mode="datetime"
                      onChange={(event, date) => {
                        if (Platform.OS === 'android') {
                          setShowTimePicker(false);
                          if (event.type === 'dismissed') {
                            return;
                          }
                          if (date) {
                            setActualTime(date);
                          }
                          return;
                        }
                        // iOS
                        if (date) {
                          setActualTime(date);
                        }
                      }}
                    />
                  )}
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
                    placeholder={selectedMedication.dosageAmount.toString()}
                    keyboardType="decimal-pad"
                  />
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {i18n.t('intakeLog.standardDoseNote', {
                      amount: selectedMedication.dosageAmount,
                      unit: i18n.t(`medications.units.${selectedMedication.dosageUnit}`),
                    })}
                  </Text>
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
                <Button onPress={handleSubmit} disabled={isLoading} className="mb-4">
                  <Text className="font-semibold text-primary-foreground">
                    {isLoading ? i18n.t('common.loading') : i18n.t('intakeLog.logIntake')}
                  </Text>
                </Button>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
