import { View, Image, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, isAfter, differenceInMinutes, differenceInHours } from 'date-fns';
import { Pill, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react-native';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import { useState, useEffect } from 'react';
import { DoseActionDialog } from '@/components/dashboard/DoseActionDialog';
import { useStore } from '@/store';
import i18n from '@/lib/i18n';

export interface MedicationScheduleItemProps {
  dose: ScheduledDose;
  isLogged?: boolean;
  logAction?: 'taken' | 'skipped' | 'partial';
  onPress?: () => void;
  onLog?: () => void;
}

type DoseStatus = 'upcoming' | 'due' | 'overdue' | 'taken' | 'skipped' | 'partial';

export function MedicationScheduleItem({
  dose,
  isLogged,
  logAction,
  onPress,
  onLog,
}: MedicationScheduleItemProps) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const { activeProfile } = useStore();

  // Determine status
  const now = new Date();
  const minutesUntilDose = differenceInMinutes(dose.time, now);
  const hoursOverdue = isAfter(now, dose.time) ? differenceInHours(now, dose.time) : 0;

  let status: DoseStatus = 'upcoming';
  if (isLogged && logAction === 'taken') {
    status = 'taken';
  } else if (isLogged && logAction === 'skipped') {
    status = 'skipped';
  } else if (isLogged && logAction === 'partial') {
    status = 'partial';
  } else if (hoursOverdue >= 2) {
    status = 'overdue';
  } else if (minutesUntilDose <= 15 && minutesUntilDose >= 0) {
    status = 'due';
  }

  // Get status styling
  const getStatusStyle = () => {
    switch (status) {
      case 'taken':
        return {
          bgColor: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
          iconColor: 'text-green-600 dark:text-green-400',
          icon: CheckCircle2,
        };
      case 'overdue':
        return {
          bgColor: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400',
          icon: AlertCircle,
        };
      case 'due':
        return {
          bgColor: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          icon: Clock,
        };
      case 'skipped':
        return {
          bgColor: 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800',
          iconColor: 'text-gray-600 dark:text-gray-400',
          icon: XCircle,
        };
      case 'partial':
        return {
          bgColor: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
          icon: CheckCircle2,
        };
      default: // upcoming
        return {
          bgColor: 'bg-background border-border',
          iconColor: 'text-muted-foreground',
          icon: Clock,
        };
    }
  };

  const statusStyle = getStatusStyle();
  const StatusIcon = statusStyle.icon;

  const handleQuickMarkAsTaken = () => {
    // Open dialog for quick action too
    setDialogVisible(true);
  };

  const handleLongPress = () => {
    if (isLogged) return; // Can't change logged doses from here

    Alert.alert(dose.medicationName, i18n.t('intakeLog.selectAction'), [
      {
        text: i18n.t('intakeLog.markAsTaken'),
        onPress: handleQuickMarkAsTaken,
      },
      {
        text: i18n.t('intakeLog.markAsSkipped'),
        onPress: () => setDialogVisible(true),
      },
      {
        text: i18n.t('intakeLog.logPartialDose'),
        onPress: () => setDialogVisible(true),
      },
      {
        text: i18n.t('common.cancel'),
        style: 'cancel',
      },
    ]);
  };

  const handlePress = () => {
    if (isLogged) {
      // View details
      if (onPress) onPress();
    } else {
      // Open the dose action dialog
      setDialogVisible(true);
    }
  };

  const handleDialogSuccess = () => {
    setDialogVisible(false);
    if (onLog) onLog();
  };

  return (
    <>
      <Pressable onPress={handlePress} onLongPress={handleLongPress}>
        <Card className={`mb-2 border ${statusStyle.bgColor}`}>
          <CardContent className="p-3">
            <View className="flex-row items-center gap-3">
              {/* Time */}
              <View className="w-16">
                <Text
                  className={`text-lg font-bold ${status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
                  {format(dose.time, 'HH:mm')}
                </Text>
                {status === 'overdue' && (
                  <Text className="text-xs text-red-600 dark:text-red-400">
                    {i18n.t('intakeLog.lateDoseMessageShort', { hours: hoursOverdue })}
                  </Text>
                )}
              </View>

              {/* Medication Image */}
              {dose.imageUri ? (
                <Image source={{ uri: dose.imageUri }} className="h-12 w-12 rounded-lg" />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Pill size={24} className="text-muted-foreground" />
                </View>
              )}

              {/* Medication Info */}
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {dose.medicationName}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {dose.dosageAmount} {i18n.t(`medications.units.${dose.dosageUnit}`)}
                </Text>
                {dose.notes && (
                  <Text className="mt-1 text-xs italic text-muted-foreground">{dose.notes}</Text>
                )}
              </View>

              {/* Status Icon */}
              <View className="items-center">
                <StatusIcon size={24} className={statusStyle.iconColor} />
                {status === 'taken' && (
                  <Text className="mt-1 text-xs text-green-600 dark:text-green-400">
                    {i18n.t('history.actions.taken')}
                  </Text>
                )}
                {status === 'skipped' && (
                  <Text className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {i18n.t('history.actions.skipped')}
                  </Text>
                )}
                {status === 'partial' && (
                  <Text className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    {i18n.t('history.actions.partial')}
                  </Text>
                )}
              </View>
            </View>
          </CardContent>
        </Card>
      </Pressable>

      <DoseActionDialog
        visible={dialogVisible}
        dose={dose}
        onClose={() => setDialogVisible(false)}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}
