import { View, Modal, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { X, AlertTriangle, Clock } from 'lucide-react-native';
import { getNextDose, type ScheduledDose } from '@/lib/schedule/calculator';
import {
  createIntakeLog,
  getMedicationById,
  updateMedicationInventory,
  setNextDoseOverrideTime,
} from '@/lib/db/operations';
import {
  cancelNotificationForDose,
  ensureNext3DoseNotificationsForMedication,
  scheduleNotificationsForMedication,
} from '@/lib/notifications/scheduler';
import { useStore } from '@/store';
import i18n from '@/lib/i18n';
import { format, differenceInMinutes, differenceInHours, isAfter } from 'date-fns';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { LateDoseOverlapWarningDialog } from '@/components/dashboard/LateDoseOverlapWarningDialog';
import { RescheduleNextDoseDialog } from '@/components/dashboard/RescheduleNextDoseDialog';

export interface DoseActionDialogProps {
  visible: boolean;
  dose: ScheduledDose | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DoseActionDialog({ visible, dose, onClose, onSuccess }: DoseActionDialogProps) {
  const dateFnsLocale = getDateFnsLocale();
  const { activeProfile, loadMedications } = useStore();
  const [action, setAction] = useState<'taken' | 'skipped' | 'partial'>('taken');
  const [partialAmount, setPartialAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [medication, setMedication] = useState<any>(null);
  const [isLateOverlapWarningOpen, setIsLateOverlapWarningOpen] = useState(false);
  const [lateOverlapMinutesUntilNext, setLateOverlapMinutesUntilNext] = useState<number | null>(
    null
  );
  const [lateOverlapNextDoseTime, setLateOverlapNextDoseTime] = useState<Date | null>(null);
  const [isRescheduleNextOpen, setIsRescheduleNextOpen] = useState(false);

  useEffect(() => {
    if (dose && visible) {
      loadMedicationData();
      setAction('taken');
      setPartialAmount('');
      setNotes('');
      setIsLateOverlapWarningOpen(false);
      setLateOverlapMinutesUntilNext(null);
      setLateOverlapNextDoseTime(null);
      setIsRescheduleNextOpen(false);
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
  const isLate = isAfter(now, dose.time);

  function getDosageAmountOrNull(): number | null {
    if (action !== 'partial') return dose.dosageAmount;
    if (!partialAmount) return null;
    const parsed = parseFloat(partialAmount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  async function logTakenNowWithoutLateWarning(): Promise<void> {
    if (!activeProfile) return;

    const dosageAmount = getDosageAmountOrNull();
    if (dosageAmount === null) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.invalidInput'));
      return;
    }

    setIsLoading(true);
    try {
      const actualTime = new Date();

      await createIntakeLog({
        medicationId: dose.medicationId,
        profileId: activeProfile.id,
        scheduledTime: dose.time,
        actualTime,
        action,
        dosageAmount,
        notes: notes || undefined,
      });

      if (medication && (action === 'taken' || action === 'partial')) {
        const newCount = Math.max(0, medication.inventoryCount - dosageAmount);
        await updateMedicationInventory(dose.medicationId, newCount);
        await loadMedications(activeProfile.id);
      }

      if (isEarly && action === 'taken') {
        await cancelNotificationForDose(dose.medicationId, dose.time.toISOString());
      }

      await ensureNext3DoseNotificationsForMedication(dose.medicationId);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to log intake:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLoading(false);
    }
  }

  function computeLateOverlapWarning(): { nextDoseTime: Date; minutesUntilNext: number } | null {
    if (!medication) return null;
    if (!isLate) return null;
    if (action !== 'taken' && action !== 'partial') return null;

    const medNoOverride = { ...medication, nextDoseOverrideTime: undefined };
    const nextDose = getNextDose(medNoOverride, dose.time);
    if (!nextDose) return null;

    const minutesUntilNext = differenceInMinutes(nextDose.time, now);
    if (minutesUntilNext < 0) return null;
    if (minutesUntilNext > 120) return null;

    return { nextDoseTime: nextDose.time, minutesUntilNext };
  }

  const handleLogTakenNow = async () => {
    if (!activeProfile) return;

    const dosageAmount = getDosageAmountOrNull();
    if (dosageAmount === null) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.invalidInput'));
      return;
    }

    const lateOverlap = computeLateOverlapWarning();
    if (lateOverlap) {
      setLateOverlapNextDoseTime(lateOverlap.nextDoseTime);
      setLateOverlapMinutesUntilNext(lateOverlap.minutesUntilNext);
      setIsLateOverlapWarningOpen(true);
      return;
    }

    await logTakenNowWithoutLateWarning();
  };

  const handleLogAtScheduledTime = async () => {
    if (!activeProfile) return;

    setIsLoading(true);
    try {
      const dosageAmount =
        action === 'partial' && partialAmount ? parseFloat(partialAmount) : dose.dosageAmount;

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

      await ensureNext3DoseNotificationsForMedication(dose.medicationId);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to log intake:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeepSchedule = async () => {
    setIsLateOverlapWarningOpen(false);
    await logTakenNowWithoutLateWarning();
  };

  const handleStartRescheduleNext = () => {
    setIsLateOverlapWarningOpen(false);
    setIsRescheduleNextOpen(true);
  };

  const handleConfirmRescheduleNext = async (selectedTime: Date) => {
    if (!activeProfile) return;
    if (!medication) return;

    setIsLoading(true);
    try {
      // Apply override for the next dose only
      const updated = await setNextDoseOverrideTime(dose.medicationId, selectedTime);

      // Reset + prime dose notifications (next-3) for this medication
      if (updated) {
        await scheduleNotificationsForMedication(updated);
        await ensureNext3DoseNotificationsForMedication(updated.id);
      }

      setIsRescheduleNextOpen(false);
      // Finally, log this dose as taken now (bypass warning since user is already handling it)
      await logTakenNowWithoutLateWarning();
    } catch (error) {
      console.error('Failed to reschedule next dose:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBanner = () => {
    if (isLate) {
      return (
        <View className="mb-4 flex-row items-center gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950">
          <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
          <Text className="flex-1 text-sm text-red-600 dark:text-red-400">
            {i18n.t('intakeLog.lateDoseMessage', { hours: Math.floor(hoursLate) })}
          </Text>
        </View>
      );
    }
    if (isEarly) {
      return (
        <View className="mb-4 flex-row items-center gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950">
          <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
          <Text className="flex-1 text-sm text-yellow-600 dark:text-yellow-400">
            {i18n.t('intakeLog.earlyDoseMessage', { minutes: minutesEarly })}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable className="flex-1 items-center justify-center bg-black/50" onPress={onClose}>
          <Pressable
            className="w-11/12 max-w-md rounded-2xl bg-background p-6"
            onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-foreground">{dose.medicationName}</Text>
              <Pressable onPress={onClose}>
                <X size={24} className="text-muted-foreground" />
              </Pressable>
            </View>

            {/* Medication Info */}
            <View className="mb-6 rounded-lg bg-muted p-4">
              <Text className="text-PPp', { locale: dateFnsLocale }t-foreground mb-1">
                {format(dose.time, 'MMM d, yyyy • HH:mm')}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {dose.dosageAmount} {i18n.t(`medications.units.${dose.dosageUnit}`)}
              </Text>
              {dose.notes && (
                <Text className="mt-2 text-xs italic text-muted-foreground">{dose.notes}</Text>
              )}
            </View>

            {/* Status Banner */}
            {getStatusBanner()}
            {!isLateOverlapWarningOpen && !isRescheduleNextOpen && (
              <>
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

                {/* Partial Amount Input */}
                {action === 'partial' && (
                  <View className="mb-4">
                    <Input
                      label={i18n.t('intakeLog.amountTaken')}
                      value={partialAmount}
                      onChangeText={setPartialAmount}
                      placeholder={i18n.t('intakeLog.partialAmountPlaceholder', {
                        example: dose.dosageAmount / 2,
                      })}
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
                <View className="gap-2">
                  <Button
                    variant="outline"
                    onPress={handleLogAtScheduledTime}
                    className="w-full"
                    disabled={isLoading}>
                    <Text className="text-center">{i18n.t('intakeLog.tookAtScheduledTime')}</Text>
                  </Button>
                  <Button onPress={handleLogTakenNow} className="w-full" disabled={isLoading}>
                    <Text className="font-semibold text-primary-foreground">
                      {isLoading ? i18n.t('common.loading') : i18n.t('intakeLog.takingNowEarly')}
                    </Text>
                  </Button>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {lateOverlapNextDoseTime && lateOverlapMinutesUntilNext !== null && (
        <LateDoseOverlapWarningDialog
          open={isLateOverlapWarningOpen}
          onOpenChange={setIsLateOverlapWarningOpen}
          medicationName={dose.medicationName}
          nextDoseTime={lateOverlapNextDoseTime}
          minutesUntilNext={lateOverlapMinutesUntilNext}
          onKeepSchedule={handleKeepSchedule}
          onRescheduleNext={handleStartRescheduleNext}
          isLoading={isLoading}
        />
      )}

      <RescheduleNextDoseDialog
        open={isRescheduleNextOpen}
        onOpenChange={setIsRescheduleNextOpen}
        now={now}
        onConfirm={handleConfirmRescheduleNext}
        onCancel={() => {
          setIsRescheduleNextOpen(false);
        }}
        isLoading={isLoading}
      />
    </>
  );
}
