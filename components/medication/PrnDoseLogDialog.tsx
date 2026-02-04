import { View, Modal, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react-native';
import type { Medication } from '@/types';
import { createIntakeLogAndUpdateInventory, InventoryInsufficientError } from '@/lib/db/operations';
import { useStore } from '@/store';
import i18n from '@/lib/i18n';
import { getRunningLowStatus } from '@/lib/medications/refill';
import { validateDose } from '@/lib/validation/dose-validation';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';

export interface PrnDoseLogDialogProps {
  visible: boolean;
  medication: Medication | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PrnDoseLogDialog({
  visible,
  medication,
  onClose,
  onSuccess,
}: PrnDoseLogDialogProps) {
  const { activeProfile, loadMedications } = useStore();
  const [doseCount, setDoseCount] = useState('1');
  const [isLoading, setIsLoading] = useState(false);

  const runningLow = medication ? getRunningLowStatus(medication) : null;

  useEffect(() => {
    if (!visible) return;
    setDoseCount('1');
  }, [visible, medication?.id]);

  const parsedDoseCount = useMemo(() => {
    const parsed = parseFloat(doseCount);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [doseCount]);

  const totalAmount = useMemo(() => {
    if (!medication) return null;
    if (!Number.isFinite(parsedDoseCount) || parsedDoseCount <= 0) return null;
    return parsedDoseCount * medication.dosageAmount;
  }, [medication, parsedDoseCount]);

  const handleSubmit = async () => {
    if (!activeProfile || !medication) return;

    if (!Number.isFinite(parsedDoseCount) || parsedDoseCount <= 0) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.invalidInput'));
      return;
    }

    const amount = parsedDoseCount * medication.dosageAmount;

    // Validate dose before proceeding
    const now = new Date();
    const validation = await validateDose(medication, amount, now);

    if (validation.hasWarnings) {
      const warnings: string[] = [];

      if (!validation.maxDailyDoseValidation.isValid) {
        const details = validation.maxDailyDoseValidation.details!;
        warnings.push(
          i18n.t('intakeLog.maxDailyDoseWarningTitle') +
            '\n\n' +
            i18n.t('intakeLog.maxDailyDoseDetails', {
              current: details.currentDailyTotal?.toFixed(1),
              new: details.newTotal?.toFixed(1),
              max: details.maxAllowed,
              unit: i18n.t(`medications.units.${medication.dosageUnit}`),
            })
        );
      }

      if (!validation.minHoursValidation.isValid) {
        const details = validation.minHoursValidation.details!;
        const timeStr = details.lastDoseTime
          ? format(details.lastDoseTime, 'p', { locale: getDateFnsLocale() })
          : '';
        warnings.push(
          i18n.t('intakeLog.minHoursWarningTitle') +
            '\n\n' +
            i18n.t('intakeLog.minHoursDetailsWithTime', {
              time: timeStr,
              hours: details.hoursSinceLastDose?.toFixed(1),
              minHours: details.minHoursRequired,
            })
        );
      }

      // Show warning alert and wait for user decision
      return new Promise<void>((resolve) => {
        Alert.alert(i18n.t('intakeLog.doseValidationWarning'), warnings.join('\n\n'), [
          {
            text: i18n.t('common.cancel'),
            style: 'cancel',
            onPress: () => resolve(),
          },
          {
            text: i18n.t('intakeLog.continueAnywayConfirm'),
            style: 'destructive',
            onPress: async () => {
              await proceedWithLogging(amount);
              resolve();
            },
          },
        ]);
      });
    }

    await proceedWithLogging(amount);
  };

  const proceedWithLogging = async (amount: number) => {
    if (!activeProfile || !medication) return;

    setIsLoading(true);
    try {
      await createIntakeLogAndUpdateInventory({
        medicationId: medication.id,
        profileId: activeProfile.id,
        scheduledTime: undefined,
        actualTime: new Date(),
        action: 'taken',
        dosageAmount: amount,
      });
      await loadMedications(activeProfile.id);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to log PRN intake:', error);
      if (
        error instanceof InventoryInsufficientError ||
        (error as any)?.name === 'InventoryInsufficientError'
      ) {
        Alert.alert(
          i18n.t('intakeLog.inventoryWarning'),
          i18n.t('intakeLog.inventoryInsufficient', {
            count: medication.inventoryCount,
            unit: i18n.t(`medications.units.${medication.dosageUnit}`),
          })
        );
      } else {
        Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!medication) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50" onPress={onClose}>
        <Pressable
          className="w-11/12 max-w-md rounded-2xl bg-background p-6"
          onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-foreground">
              {i18n.t('intakeLog.logPrnDose')}
            </Text>
            <Pressable onPress={onClose}>
              <X size={24} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Medication Info */}
          <View className="mb-4 rounded-lg bg-muted p-4">
            <Text className="mb-1 text-lg font-semibold text-foreground">{medication.name}</Text>
            <Text className="text-sm text-muted-foreground">
              {i18n.t('intakeLog.standardDoseNote', {
                amount: medication.dosageAmount,
                unit: i18n.t(`medications.units.${medication.dosageUnit}`),
              })}
            </Text>

            {runningLow?.isRunningLow && (
              <View className="mt-2 flex-row items-center gap-2 rounded-lg bg-muted/50 p-2">
                <Text className="flex-1 text-xs text-foreground">
                  {runningLow.basis === 'days'
                    ? i18n.t('medications.runningLowMessageDays', {
                        days: runningLow.remainingDays ?? runningLow.threshold,
                        doses: runningLow.remainingDoses,
                      })
                    : i18n.t('medications.runningLowMessageDoses', {
                        doses: runningLow.remainingDoses,
                      })}{' '}
                  {i18n.t('medications.getNewPack')}
                </Text>
              </View>
            )}
          </View>

          {/* Dose Count */}
          <View className="mb-3">
            <Input
              label={i18n.t('intakeLog.doseCountLabel')}
              value={doseCount}
              onChangeText={setDoseCount}
              placeholder={i18n.t('intakeLog.doseCountPlaceholder')}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Total */}
          <View className="mb-6 rounded-lg bg-muted/50 p-3">
            <Text className="text-sm text-muted-foreground">
              {i18n.t('intakeLog.totalAmount')}:{' '}
              <Text className="font-semibold text-foreground">
                {totalAmount !== null ? totalAmount : '--'}{' '}
                {i18n.t(`medications.units.${medication.dosageUnit}`)}
              </Text>
            </Text>
          </View>

          <Button onPress={handleSubmit} disabled={isLoading}>
            <Text className="font-semibold text-primary-foreground">
              {isLoading ? i18n.t('common.loading') : i18n.t('intakeLog.logIntake')}
            </Text>
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
