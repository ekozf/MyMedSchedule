import { View, Modal, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react-native';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import { 
  createIntakeLog, 
  getMedicationById, 
  updateMedicationInventory,
  getIntakeLogsByMedication 
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
      
      const todayLogs = logs.filter(log => {
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
      action === 'partial' && partialAmount
        ? parseFloat(partialAmount)
        : dose.dosageAmount;

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
            unit: medication.dosageUnit 
          }) + '\n\n' + i18n.t('intakeLog.currentDailyCount', { 
            count: dailyCount, 
            unit: medication.dosageUnit 
          }),
          [
            { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => setShowMaxDoseWarning(false) },
            { text: i18n.t('intakeLog.continueAnyway'), onPress: () => proceedWithLogging(dosageAmount) }
          ]
        );
        return;
      }
    }

    // Check inventory warning
    if (medication && action === 'taken' && medication.inventoryCount < dosageAmount) {
      Alert.alert(
        i18n.t('intakeLog.inventoryWarning'),
        i18n.t('intakeLog.inventoryInsufficient', { 
          count: medication.inventoryCount, 
          unit: medication.dosageUnit 
        }),
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          { text: i18n.t('intakeLog.continueAnyway'), onPress: () => proceedWithLogging(dosageAmount) }
        ]
      );
      return;
    }

    await proceedWithLogging(dosageAmount);
  };

  const proceedWithLogging = async (dosageAmount: number) => {
    if (!activeProfile) return;

    setIsLoading(true);
    try {
      const now = new Date();
      const hoursLate = differenceInHours(now, dose.time);

      // Create intake log
      await createIntakeLog({
        medicationId: dose.medicationId,
        profileId: activeProfile.id,
        scheduledTime: dose.time,
        actualTime: now,
        action,
        dosageAmount,
        notes: notes || undefined,
      });

      // Auto-decrement inventory if taken or partial
      if (medication && (action === 'taken' || action === 'partial')) {
        const newCount = Math.max(0, medication.inventoryCount - dosageAmount);
        await updateMedicationInventory(dose.medicationId, newCount);
        
        // Reload medications to update UI
        if (activeProfile) {
          await loadMedications(activeProfile.id);
        }
      }

      // Check if dose was taken late (>2 hours)
      if (action === 'taken' && hoursLate > 2) {
        Alert.alert(
          i18n.t('intakeLog.lateDoseTitle'),
          i18n.t('intakeLog.lateDoseMessage', { hours: hoursLate }),
          [
            { 
              text: i18n.t('intakeLog.keepSchedule'), 
              style: 'cancel' 
            },
            { 
              text: i18n.t('intakeLog.rescheduleNext'), 
              onPress: () => {
                // TODO: Implement schedule adjustment logic
                // This would need to shift all future doses
                console.log('Reschedule requested - not yet implemented');
              }
            }
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
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-center items-center bg-black/50"
        onPress={onClose}
      >
        <Pressable
          className="bg-background w-11/12 max-w-md rounded-2xl p-6"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-foreground">
              {i18n.t('intakeLog.logIntake')}
            </Text>
            <Pressable onPress={onClose}>
              <X size={24} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Medication Info */}
          <View className="mb-6 p-4 bg-muted rounded-lg">
            <Text className="text-lg font-semibold text-foreground mb-1">
              {dose.medicationName}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {dose.dosageAmount} {dose.dosageUnit}
            </Text>
            
            {/* Inventory warning */}
            {medication && medication.inventoryCount < 5 && medication.inventoryCount > 0 && (
              <View className="flex-row items-center gap-2 mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />
                <Text className="text-xs text-yellow-600 dark:text-yellow-400 flex-1">
                  {i18n.t('medications.lowInventory')}: {medication.inventoryCount} {medication.dosageUnit}
                </Text>
              </View>
            )}
            
            {/* Daily count info */}
            {medication?.maxDailyDose && dailyCount > 0 && (
              <View className="flex-row items-center justify-between mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Text className="text-xs text-blue-600 dark:text-blue-400">
                  {i18n.t('intakeLog.currentDailyCount', { count: dailyCount, unit: medication.dosageUnit })}
                </Text>
                <Text className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  Max: {medication.maxDailyDose} {medication.dosageUnit}
                </Text>
              </View>
            )}
          </View>

          {/* Action Selection */}
          <Text className="text-sm font-medium text-foreground mb-3">
            {i18n.t('intakeLog.markAsTaken')}
          </Text>
          <View className="flex-row gap-2 mb-6">
            <Button
              variant={action === 'taken' ? 'default' : 'outline'}
              onPress={() => setAction('taken')}
              className="flex-1"
            >
              <Text>{i18n.t('history.actions.taken')}</Text>
            </Button>
            <Button
              variant={action === 'skipped' ? 'default' : 'outline'}
              onPress={() => setAction('skipped')}
              className="flex-1"
            >
              <Text>{i18n.t('history.actions.skipped')}</Text>
            </Button>
            <Button
              variant={action === 'partial' ? 'default' : 'outline'}
              onPress={() => setAction('partial')}
              className="flex-1"
            >
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
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? i18n.t('common.loading') : i18n.t('common.save')}
            </Text>
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
