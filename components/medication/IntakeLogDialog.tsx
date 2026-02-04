import { View, Modal, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react-native';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import {
  createIntakeLogAndUpdateInventory,
  InventoryInsufficientError,
  getMedicationById,
  getIntakeLogsByMedication,
} from '@/lib/db/operations';
import { useStore } from '@/store';
import i18n from '@/lib/i18n';
import { startOfDay, endOfDay, differenceInHours } from 'date-fns';

export interface IntakeLogDialogProps {
  visible: boolean;
  dose: ScheduledDose | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function IntakeLogDialog({ visible, dose, onClose, onSuccess }: IntakeLogDialogProps) {
  const { activeProfile, loadMedications } = useStore();
  const [action, setAction] = useState<'taken' | 'skipped' | 'partial'>('taken');
  const [partialAmount, setPartialAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [medication, setMedication] = useState<any>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [showMaxDoseWarning, setShowMaxDoseWarning] = useState(false);

  useEffect(() => {
    if (dose && visible) {
      loadMedicationData();
      checkDailyCount();
    }
  }, [dose, visible]);

  const loadMedicationData = async () => {
    if (!dose) return;
    try {
      const med = await getMedicationById(dose.medicationId);
      setMedication(med);
    } catch (error) {
      console.error('Failed to load medication:', error);
    }
  };

  const checkDailyCount = async () => {
    if (!dose) return;
    try {
      const logs = await getIntakeLogsByMedication(dose.medicationId);
      const today = new Date();
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);

      const todayLogs = logs.filter((log) => {
        const logTime = new Date(log.actualTime);
        return logTime >= dayStart && logTime <= dayEnd && log.action === 'taken';
      });

      const totalToday = todayLogs.reduce((sum, log) => sum + log.dosageAmount, 0);
      setDailyCount(totalToday);
    } catch (error) {
      console.error('Failed to check daily count:', error);
    }
  };

  if (!dose) return null;

  const handleSubmit = async () => {
    if (!activeProfile) return;

    const dosageAmount =
      action === 'partial' && partialAmount ? parseFloat(partialAmount) : dose.dosageAmount;

    // Validate partial amount
    if (action === 'partial' && (!partialAmount || isNaN(dosageAmount) || dosageAmount <= 0)) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.invalidInput'));
      return;
    }

    // Check max daily dose warning
    if (medication?.maxDailyDose && action === 'taken') {
      const newTotal = dailyCount + dosageAmount;
      if (newTotal > medication.maxDailyDose && !showMaxDoseWarning) {
        setShowMaxDoseWarning(true);
        Alert.alert(
          i18n.t('intakeLog.maxDoseWarning'),
          i18n.t('intakeLog.maxDoseExceeded', {
            max: medication.maxDailyDose,
            unit: i18n.t(`medications.units.${medication.dosageUnit}`),
          }) +
            '\n\n' +
            i18n.t('intakeLog.currentDailyCount', {
              count: dailyCount,
              unit: i18n.t(`medications.units.${medication.dosageUnit}`),
            }),
          [
            {
              text: i18n.t('common.cancel'),
              style: 'cancel',
              onPress: () => setShowMaxDoseWarning(false),
            },
            {
              text: i18n.t('intakeLog.continueAnyway'),
              onPress: () => proceedWithLogging(dosageAmount),
            },
          ]
        );
        return;
      }
    }

    await proceedWithLogging(dosageAmount);
  };

  const proceedWithLogging = async (dosageAmount: number) => {
    if (!activeProfile) return;

    setIsLoading(true);
    try {
      const now = new Date();
      const hoursLate = differenceInHours(now, dose.time);

      await createIntakeLogAndUpdateInventory({
        medicationId: dose.medicationId,
        profileId: activeProfile.id,
        scheduledTime: dose.time,
        actualTime: now,
        action,
        dosageAmount,
        notes: notes || undefined,
      });

      // Reload medications to update UI (inventory may have changed)
      await loadMedications(activeProfile.id);

      // Check if dose was taken late (>2 hours)
      if (action === 'taken' && hoursLate > 2) {
        Alert.alert(
          i18n.t('intakeLog.lateDoseTitle'),
          i18n.t('intakeLog.lateDoseMessage', { hours: hoursLate }),
          [
            {
              text: i18n.t('intakeLog.keepSchedule'),
              style: 'cancel',
            },
            {
              text: i18n.t('intakeLog.rescheduleNext'),
              onPress: () => {
                // TODO: Implement schedule adjustment logic
                // This would need to shift all future doses
                console.log('Reschedule requested - not yet implemented');
              },
            },
          ]
        );
      }

      // Reset form
      setAction('taken');
      setPartialAmount('');
      setNotes('');
      setShowMaxDoseWarning(false);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to log intake:', error);
      if (
        error instanceof InventoryInsufficientError ||
        (error as any)?.name === 'InventoryInsufficientError'
      ) {
        Alert.alert(
          i18n.t('intakeLog.inventoryWarning'),
          i18n.t('intakeLog.inventoryInsufficient', {
            count: medication?.inventoryCount ?? 0,
            unit: medication ? i18n.t(`medications.units.${medication.dosageUnit}`) : '',
          })
        );
      } else {
        Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
      }
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
              {i18n.t('intakeLog.logIntake')}
            </Text>
            <Pressable onPress={onClose}>
              <X size={24} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Medication Info */}
          <View className="mb-6 rounded-lg bg-muted p-4">
            <Text className="mb-1 text-lg font-semibold text-foreground">
              {dose.medicationName}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {dose.dosageAmount} {i18n.t(`medications.units.${dose.dosageUnit}`)}
            </Text>

            {/* Inventory warning */}
            {medication && medication.inventoryCount < 5 && medication.inventoryCount > 0 && (
              <View className="mt-2 flex-row items-center gap-2 rounded-lg bg-yellow-50 p-2 dark:bg-yellow-950">
                <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />
                <Text className="flex-1 text-xs text-yellow-600 dark:text-yellow-400">
                  {i18n.t('medications.lowInventory')}: {medication.inventoryCount}{' '}
                  {i18n.t(`medications.units.${medication.dosageUnit}`)}
                </Text>
              </View>
            )}

            {/* Daily count info */}
            {medication?.maxDailyDose && dailyCount > 0 && (
              <View className="mt-2 flex-row items-center justify-between rounded-lg bg-blue-50 p-2 dark:bg-blue-950">
                <Text className="text-xs text-blue-600 dark:text-blue-400">
                  {i18n.t('intakeLog.currentDailyCount', {
                    count: dailyCount,
                    unit: i18n.t(`medications.units.${medication.dosageUnit}`),
                  })}
                </Text>
                <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Max: {medication.maxDailyDose}{' '}
                  {i18n.t(`medications.units.${medication.dosageUnit}`)}
                </Text>
              </View>
            )}
          </View>

          {/* Action Selection */}
          <Text className="mb-3 text-sm font-medium text-foreground">
            {i18n.t('intakeLog.markAsTaken')}
          </Text>
          <View className="mb-6 flex-row gap-2">
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

          {/* Partial Amount Input */}
          {action === 'partial' && (
            <View className="mb-6">
              <Input
                label={i18n.t('intakeLog.amountTaken')}
                value={partialAmount}
                onChangeText={setPartialAmount}
                placeholder={`e.g., ${dose.dosageAmount / 2}`}
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Notes Input */}
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
