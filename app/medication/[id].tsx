import { View, ScrollView, Image, Alert, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getMedicationById,
  updateMedication,
  deleteMedication,
  getIntakeLogsByMedication,
} from '@/lib/db/operations';
import { getNextDose, getScheduleDescription } from '@/lib/schedule/calculator';
import {
  cancelAllNotificationsForMedication,
  scheduleNotificationsForMedication,
  scheduleRefillReminder,
} from '@/lib/notifications/scheduler';
import { format, differenceInDays } from 'date-fns';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import {
  Edit,
  Trash2,
  Clock,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pill,
  History,
  ChevronLeft,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import type { Medication, IntakeLog } from '@/types';
import { InventoryManager } from '@/components/medication/InventoryManager';
import { PrnDoseLogDialog } from '@/components/medication/PrnDoseLogDialog';
import { getRunningLowStatus } from '@/lib/medications/refill';
import { Icon } from '@/components/ui/icon';

export default function MedicationDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loadMedications, activeProfile } = useStore();
  const [medication, setMedication] = useState<Medication | null>(null);
  const [lastLog, setLastLog] = useState<IntakeLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [inventoryDialogVisible, setInventoryDialogVisible] = useState(false);
  const [prnLogDialogVisible, setPrnLogDialogVisible] = useState(false);

  const runningLow = medication ? getRunningLowStatus(medication) : null;

  useEffect(() => {
    loadMedicationData();
  }, [id]);

  async function loadMedicationData() {
    if (!id) return;

    try {
      setIsLoading(true);
      const [med, logs] = await Promise.all([getMedicationById(id), getIntakeLogsByMedication(id)]);

      setMedication(med);

      // Get most recent log
      if (logs.length > 0) {
        const sorted = logs.sort(
          (a, b) => new Date(b.actualTime).getTime() - new Date(a.actualTime).getTime()
        );
        setLastLog(sorted[0]);
      }
    } catch (error) {
      console.error('Failed to load medication:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('medications.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleActive() {
    if (!medication) return;

    const title = medication.isActive
      ? i18n.t('medications.markInactiveTitle')
      : i18n.t('medications.markActiveTitle');
    const message = medication.isActive
      ? i18n.t('medications.markInactiveMessage', { name: medication.name })
      : i18n.t('medications.markActiveMessage', { name: medication.name });
    const confirmText = medication.isActive
      ? i18n.t('medications.markInactiveConfirm')
      : i18n.t('medications.markActiveConfirm');

    Alert.alert(title, message, [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: confirmText,
        style: medication.isActive ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setIsUpdating(true);
            const newActiveState = !medication.isActive;
            const updatedMed = await updateMedication(medication.id, { isActive: newActiveState });

            // Handle notifications
            if (newActiveState && updatedMed && !updatedMed.isPrn) {
              // Reactivating - schedule notifications
              await scheduleNotificationsForMedication(updatedMed);
              await scheduleRefillReminder(updatedMed);
            } else {
              // Deactivating - cancel notifications
              await cancelAllNotificationsForMedication(medication.id);
            }

            await loadMedicationData();
            await loadMedications(activeProfile!.id);
          } catch (error) {
            Alert.alert(i18n.t('common.error'), i18n.t('medications.updateError'));
          } finally {
            setIsUpdating(false);
          }
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!medication) return;

    Alert.alert(
      i18n.t('medications.deleteTitle'),
      i18n.t('medications.deleteMessage', { name: medication.name }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('medications.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancel notifications before deleting
              await cancelAllNotificationsForMedication(medication.id);
              await deleteMedication(medication.id);
              await loadMedications(activeProfile!.id);
              router.back();
            } catch (error) {
              Alert.alert(i18n.t('common.error'), i18n.t('medications.deleteError'));
            }
          },
        },
      ]
    );
  }

  function handleEdit() {
    router.push(`/medication/edit/${id}`);
  }

  function handleViewHistory() {
    // Navigate to history filtered by this medication
    router.push({
      pathname: '/(tabs)/history',
      params: { medicationId: id },
    });
  }

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-muted-foreground">{i18n.t('common.loading')}</Text>
      </View>
    );
  }

  if (!medication) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background p-4"
        style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-lg text-foreground">{i18n.t('medications.loadError')}</Text>
        <Button onPress={() => router.back()} className="mt-4">
          <Text>{i18n.t('common.back')}</Text>
        </Button>
      </View>
    );
  }

  const nextDose = medication.isActive ? getNextDose(medication) : null;
  const scheduleDesc = getScheduleDescription(medication);
  const dateFnsLocale = getDateFnsLocale();
  const isLowInventory = medication.inventoryCount < 5 && medication.inventoryCount > 0;
  const isExpired = medication.expirationDate && new Date(medication.expirationDate) < new Date();
  const daysUntilExpiration = medication.expirationDate
    ? differenceInDays(new Date(medication.expirationDate), new Date())
    : null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Back Button */}
        <View className="pl-4" style={{ paddingTop: insets.top + 16 }}>
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-1 active:opacity-70">
            <ChevronLeft size={24} className="text-foreground" />
            <Text className="text-base text-foreground">{i18n.t('common.back')}</Text>
          </Pressable>
        </View>

        {/* Header Card */}
        <Card className="m-4">
          <CardContent className="p-4">
            <View className="flex-row gap-4">
              {/* Medication Image */}
              {medication.imageUri ? (
                <Image source={{ uri: medication.imageUri }} className="h-24 w-24 rounded-lg" />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-lg bg-muted">
                  <Pill size={48} className="text-muted-foreground" />
                </View>
              )}

              {/* Medication Info */}
              <View className="flex-1">
                <View className="mb-1 flex-row flex-wrap items-center gap-2">
                  <Text className="flex-shrink text-xl font-bold text-foreground">
                    {medication.name}
                  </Text>
                  {medication.isPrn && (
                    <Badge label={i18n.t('medications.prn')} variant="secondary" />
                  )}
                  {!medication.isActive && (
                    <Badge label={i18n.t('medications.inactive')} variant="destructive" />
                  )}
                </View>

                <Text className="mb-2 text-lg text-muted-foreground">
                  {medication.dosageAmount} {i18n.t(`medications.units.${medication.dosageUnit}`)}
                </Text>

                {/* Status Badges */}
                <View className="flex-row flex-wrap gap-2">
                  {medication.isActive && (
                    <Badge label={i18n.t('medications.active')} variant="default" />
                  )}
                  {isExpired && (
                    <Badge label={i18n.t('medications.expired')} variant="destructive" />
                  )}
                  {isLowInventory && !isExpired && (
                    <Badge label={i18n.t('medications.lowInventory')} variant="warning" />
                  )}
                </View>
              </View>
            </View>

            {/* Notes */}
            {medication.notes && (
              <View className="mt-4 rounded-lg bg-muted p-3">
                <Text className="text-sm text-foreground">{medication.notes}</Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Schedule Information */}
        <Card className="mx-4 mb-4">
          <CardHeader>
            <CardTitle>{i18n.t('medications.scheduleInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <Clock size={16} className="text-muted-foreground" />
                <Text className="text-foreground">{scheduleDesc}</Text>
              </View>

              {nextDose && medication.isActive && !medication.isPrn && (
                <View className="mt-2 rounded-lg bg-muted/50 p-3">
                  <Text className="mb-1 font-medium text-foreground">
                    {i18n.t('medications.nextDose')}
                  </Text>
                  <Text className="text-lg font-semibold text-foreground">
                    {format(nextDose.time, 'PP • p', { locale: dateFnsLocale })}
                  </Text>
                </View>
              )}

              {lastLog && (
                <View className="mt-2 rounded-lg bg-muted/50 p-3">
                  <Text className="mb-1 font-medium text-foreground">
                    {i18n.t('medications.lastTaken')}
                  </Text>
                  <Text className="text-muted-foreground">
                    {format(new Date(lastLog.actualTime), 'PP • p', { locale: dateFnsLocale })}
                  </Text>
                </View>
              )}

              {!lastLog && medication.isActive && (
                <View className="mt-2 rounded-lg bg-muted/50 p-3">
                  <Text className="text-muted-foreground">{i18n.t('medications.neverTaken')}</Text>
                </View>
              )}
            </View>
          </CardContent>
        </Card>

        {/* PRN Quick Log */}
        {medication.isPrn && medication.isActive && (
          <Card className="mx-4 mb-4">
            <CardHeader>
              <CardTitle>{i18n.t('intakeLog.logPrnDose')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="mb-3 text-sm text-muted-foreground">
                {i18n.t('schedule.description.prn')}
              </Text>
              <Button onPress={() => setPrnLogDialogVisible(true)} className="flex-row gap-2">
                <Text className="font-medium text-primary-foreground">
                  {i18n.t('intakeLog.logIntake')}
                </Text>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Inventory Information */}
        <Card className="mx-4 mb-4">
          <CardHeader>
            <CardTitle>{i18n.t('medications.inventoryInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              {runningLow?.isRunningLow && (
                <View className="rounded-lg bg-muted/50 p-3">
                  <View className="mb-1 flex-row items-center gap-2">
                    <Badge
                      label={i18n.t('medications.runningLowWithDoses', {
                        doses: runningLow.remainingDoses,
                      })}
                      variant="warning"
                    />
                  </View>
                  <Text className="text-sm text-foreground">
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

              <View className="flex-row items-center gap-2">
                <Package size={16} className="text-muted-foreground" />
                <Text className="text-foreground">
                  {i18n.t('medications.inventory', {
                    count: medication.inventoryCount,
                    unit: medication.dosageUnit,
                  })}
                </Text>
              </View>

              {medication.packageSize && (
                <Text className="text-sm text-muted-foreground">
                  {i18n.t('medications.packageSizeLabel')}: {medication.packageSize}{' '}
                  {i18n.t(`medications.units.${medication.dosageUnit}`)}
                </Text>
              )}

              {medication.refillReminderType && medication.refillReminderValue && (
                <View className="mt-2 rounded-lg bg-muted/50 p-3">
                  <Text className="text-muted-foreground">
                    {i18n.t('medications.refillReminderLabel')}:{' '}
                    {medication.refillReminderType === 'days'
                      ? i18n.t('medications.refillWhenDaysLeft', {
                          days: medication.refillReminderValue,
                        })
                      : i18n.t('medications.refillWhenDosesLeft', {
                          doses: medication.refillReminderValue,
                        })}
                  </Text>
                </View>
              )}

              <Button
                variant="outline"
                onPress={() => setInventoryDialogVisible(true)}
                className="mt-2 flex-row gap-2">
                <Package size={16} className="text-foreground" />
                <Text className="font-medium text-foreground">
                  {i18n.t('inventory.adjustInventory')}
                </Text>
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Expiration & Safety */}
        {(medication.expirationDate ||
          medication.maxDailyDose ||
          medication.minHoursBetweenDoses ||
          medication.bypassDnd) && (
          <Card className="mx-4 mb-4">
            <CardHeader>
              <CardTitle>{i18n.t('medications.advancedSettings')}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                {medication.expirationDate && (
                  <View className="rounded-lg bg-muted/50 p-3">
                    <View className="mb-1 flex-row items-center gap-2">
                      {isExpired ? (
                        <AlertTriangle size={16} className="text-destructive" />
                      ) : (
                        <CheckCircle2 size={16} className="text-muted-foreground" />
                      )}
                      <Text className="font-medium text-foreground">
                        {i18n.t('medications.expirationDateLabel')}
                      </Text>
                    </View>
                    <Text
                      className={`${isExpired ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                      {format(new Date(medication.expirationDate), 'PP', { locale: dateFnsLocale })}
                    </Text>
                    {daysUntilExpiration !== null && (
                      <Text className="mt-1 text-muted-foreground">
                        {daysUntilExpiration > 0
                          ? i18n.t('medications.expiresIn', { days: daysUntilExpiration })
                          : i18n.t('medications.expiredDaysAgo', {
                              days: Math.abs(daysUntilExpiration),
                            })}
                      </Text>
                    )}
                  </View>
                )}

                {medication.maxDailyDose && (
                  <View className="flex-row items-center gap-2">
                    <AlertTriangle size={16} className="text-destructive" />
                    <Text className="flex-1 text-foreground">
                      {i18n.t('medications.maxDailyDoseLabel')}: {medication.maxDailyDose}{' '}
                      {i18n.t(`medications.units.${medication.dosageUnit}`)}
                    </Text>
                  </View>
                )}

                {medication.minHoursBetweenDoses && (
                  <View className="flex-row items-center gap-2">
                    <Clock size={16} className="text-muted-foreground" />
                    <Text className="flex-1 text-foreground">
                      {i18n.t('medications.minHoursBetweenLabel')}:{' '}
                      {medication.minHoursBetweenDoses}h
                    </Text>
                  </View>
                )}

                {medication.bypassDnd && (
                  <View className="flex-row items-center gap-2">
                    <AlertTriangle size={16} className="text-destructive" />
                    <Text className="flex-1 text-foreground">
                      {i18n.t('medications.bypassDndLabel')}
                    </Text>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <View className="mb-8 gap-3 p-4">
          <Button onPress={handleEdit} className="flex-row gap-2">
            <Icon as={Edit} size={20} className="text-primary-foreground" />
            <Text className="font-medium text-primary-foreground">
              {i18n.t('medications.editMedication')}
            </Text>
          </Button>

          <Button onPress={handleViewHistory} variant="outline" className="flex-row gap-2">
            <History size={20} className="text-foreground" />
            <Text className="font-medium text-foreground">{i18n.t('medications.viewHistory')}</Text>
          </Button>

          <Button
            onPress={handleToggleActive}
            variant="outline"
            disabled={isUpdating}
            className="flex-row gap-2">
            {medication.isActive ? (
              <XCircle size={20} className="text-foreground" />
            ) : (
              <CheckCircle2 size={20} className="text-foreground" />
            )}
            <Text className="font-medium text-foreground">
              {medication.isActive
                ? i18n.t('medications.markAsInactive')
                : i18n.t('medications.markAsActive')}
            </Text>
          </Button>

          <Button onPress={handleDelete} variant="destructive" className="flex-row gap-2">
            <Trash2 size={20} className="text-destructive-foreground" />
            <Text className="font-medium text-destructive-foreground">
              {i18n.t('medications.deleteMedication')}
            </Text>
          </Button>
        </View>
      </ScrollView>

      <InventoryManager
        visible={inventoryDialogVisible}
        medication={medication}
        onClose={() => setInventoryDialogVisible(false)}
        onSuccess={loadMedicationData}
      />

      <PrnDoseLogDialog
        visible={prnLogDialogVisible}
        medication={medication}
        onClose={() => setPrnLogDialogVisible(false)}
        onSuccess={loadMedicationData}
      />
    </View>
  );
}
