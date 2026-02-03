import { View, Modal, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { X, AlertTriangle, Clock } from 'lucide-react-native';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import { 
  createIntakeLog, 
  getMedicationById, 
  updateMedicationInventory,
  setNextDoseOverrideTime
} from '@/lib/db/operations';
import { cancelNotificationForDose, scheduleNotificationsForMedication, cancelNotificationsForMedication } from '@/lib/notifications/scheduler';
import { useStore } from '@/store';
import i18n from '@/lib/i18n';
import { format, differenceInMinutes, differenceInHours, addHours } from 'date-fns';

export interface DoseActionDialogProps {
  visible: boolean;
  dose: ScheduledDose | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DoseActionDialog({ visible, dose, onClose, onSuccess }: DoseActionDialogProps) {
  const { activeProfile, loadMedications } = useStore();
  const [action, setAction] = useState<'taken' | 'skipped' | 'partial'>('taken');
  const [partialAmount, setPartialAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [medication, setMedication] = useState<any>(null);
  const [showReschedulePrompt, setShowReschedulePrompt] = useState(false);
  const [pendingLogData, setPendingLogData] = useState<any>(null);

  useEffect(() => {
    if (dose && visible) {
      loadMedicationData();
      setAction('taken');
      setPartialAmount('');
      setNotes('');
      setShowReschedulePrompt(false);
      setPendingLogData(null);
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

  if (!dose) return null;

  const now = new Date();
  const minutesEarly = differenceInMinutes(dose.time, now);
  const hoursLate = differenceInHours(now, dose.time);
  const isEarly = minutesEarly > 0 && minutesEarly <= 120;
  const isLate = hoursLate > 2;

  const handleLogTakenNow = async () => {
    if (!activeProfile) return;

    setIsLoading(true);
    try {
      const dosageAmount = action === 'partial' && partialAmount
        ? parseFloat(partialAmount)
        : dose.dosageAmount;

      // Validate partial amount
      if (action === 'partial' && (!partialAmount || isNaN(dosageAmount) || dosageAmount <= 0)) {
        Alert.alert(i18n.t('common.error'), i18n.t('errors.invalidInput'));
        setIsLoading(false);
        return;
      }

      // Create the log
      await createIntakeLog({
        medicationId: dose.medicationId,
        profileId: activeProfile.id,
        scheduledTime: dose.time,
        actualTime: now,
        action,
        dosageAmount,
        notes: notes || undefined,
      });

      // Update inventory if taken or partial
      if (medication && (action === 'taken' || action === 'partial')) {
        const newCount = Math.max(0, medication.inventoryCount - dosageAmount);
        await updateMedicationInventory(dose.medicationId, newCount);
        await loadMedications(activeProfile.id);
      }

      // LTE-003: If taken early, cancel the scheduled reminder
      if (isEarly && action === 'taken') {
        await cancelNotificationForDose(dose.medicationId, dose.time.toISOString());
      }

      // LTE-001/002: If taken late, show reschedule prompt
      if (isLate && action === 'taken') {
        setPendingLogData({ dosageAmount, notes });
        setShowReschedulePrompt(true);
        setIsLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to log intake:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogAtScheduledTime = async () => {
    if (!activeProfile) return;

    setIsLoading(true);
    try {
      const dosageAmount = action === 'partial' && partialAmount
        ? parseFloat(partialAmount)
        : dose.dosageAmount;

      // Validate partial amount
      if (action === 'partial' && (!partialAmount || isNaN(dosageAmount) || dosageAmount <= 0)) {
        Alert.alert(i18n.t('common.error'), i18n.t('errors.invalidInput'));
        setIsLoading(false);
        return;
      }

      await createIntakeLog({
        medicationId: dose.medicationId,
        profileId: activeProfile.id,
        scheduledTime: dose.time,
        actualTime: dose.time,
        action,
        dosageAmount,
        notes: notes || undefined,
      });

      // Update inventory if taken or partial
      if (medication && (action === 'taken' || action === 'partial')) {
        const newCount = Math.max(0, medication.inventoryCount - dosageAmount);
        await updateMedicationInventory(dose.medicationId, newCount);
        await loadMedications(activeProfile.id);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to log intake:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescheduleNextDose = async () => {
    if (!medication) return;

    setIsLoading(true);
    try {
      const overrideTime = addHours(dose.time, hoursLate);
      await setNextDoseOverrideTime(dose.medicationId, overrideTime);
      
      // Reschedule notifications
      await cancelNotificationsForMedication(dose.medicationId);
      await scheduleNotificationsForMedication(medication);

      setShowReschedulePrompt(false);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to reschedule:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeepSchedule = () => {
    setShowReschedulePrompt(false);
    onSuccess();
    onClose();
  };

  const getStatusBanner = () => {
    if (isLate) {
      return (
        <View className="mb-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg flex-row items-center gap-2">
          <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
          <Text className="text-sm text-red-600 dark:text-red-400 flex-1">
            {i18n.t('intakeLog.lateDoseMessage', { hours: Math.floor(hoursLate) })}
          </Text>
        </View>
      );
    }
    if (isEarly) {
      return (
        <View className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex-row items-center gap-2">
          <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
          <Text className="text-sm text-yellow-600 dark:text-yellow-400 flex-1">
            {i18n.t('intakeLog.earlyDoseMessage', { minutes: minutesEarly })}
          </Text>
        </View>
      );
    }
    return null;
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
              {dose.medicationName}
            </Text>
            <Pressable onPress={onClose}>
              <X size={24} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Medication Info */}
          <View className="mb-6 p-4 bg-muted rounded-lg">
            <Text className="text-lg font-semibold text-foreground mb-1">
              {format(dose.time, 'MMM d, yyyy • HH:mm')}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {dose.dosageAmount} {dose.dosageUnit}
            </Text>
            {dose.notes && (
              <Text className="text-xs text-muted-foreground italic mt-2">
                {dose.notes}
              </Text>
            )}
          </View>

          {/* Status Banner */}
          {getStatusBanner()}

          {/* Reschedule Prompt (shown after late logging) */}
          {showReschedulePrompt && (
            <View className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Text className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-2">
                {i18n.t('intakeLog.lateDoseTitle')}
              </Text>
              <Text className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                {i18n.t('intakeLog.reschedulePrompt')}
              </Text>
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  onPress={handleKeepSchedule}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Text>{i18n.t('intakeLog.keepSchedule')}</Text>
                </Button>
                <Button
                  onPress={handleRescheduleNextDose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Text className="text-primary-foreground font-semibold">
                    {i18n.t('intakeLog.rescheduleNext')}
                  </Text>
                </Button>
              </View>
            </View>
          )}

          {!showReschedulePrompt && (
            <>
              {/* Action Selection */}
              <Text className="text-sm font-medium text-foreground mb-3">
                {i18n.t('intakeLog.selectAction')}
              </Text>
              <View className="flex-row gap-2 mb-4">
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
                <View className="mb-4">
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

              {/* Action Buttons */}
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  onPress={handleLogAtScheduledTime}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Text>{i18n.t('intakeLog.tookAtScheduledTime')}</Text>
                </Button>
                <Button
                  onPress={handleLogTakenNow}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Text className="text-primary-foreground font-semibold">
                    {isLoading ? i18n.t('common.loading') : i18n.t('intakeLog.takingNowEarly')}
                  </Text>
                </Button>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
