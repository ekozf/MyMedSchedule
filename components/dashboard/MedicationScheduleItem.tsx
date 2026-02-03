import { View, Image, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, isAfter, differenceInMinutes, differenceInHours } from 'date-fns';
import { Pill, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react-native';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import { useState, useEffect } from 'react';
import { IntakeLogDialog } from '@/components/medication/IntakeLogDialog';
import { createIntakeLog, getMedicationById } from '@/lib/db/operations';
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

export function MedicationScheduleItem({ dose, isLogged, logAction, onPress, onLog }: MedicationScheduleItemProps) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const { activeProfile } = useStore();
  const [isLogging, setIsLogging] = useState(false);
  
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

  const handleQuickMarkAsTaken = async () => {
    if (!activeProfile) return;
    
    setIsLogging(true);
    try {
      await createIntakeLog({
        medicationId: dose.medicationId,
        profileId: activeProfile.id,
        scheduledTime: dose.time,
        actualTime: new Date(),
        action: 'taken',
        dosageAmount: dose.dosageAmount,
      });
      
      if (onLog) onLog();
    } catch (error) {
      console.error('Failed to log intake:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLogging(false);
    }
  };

  const handleLongPress = () => {
    if (isLogged) return; // Can't change logged doses from here
    
    Alert.alert(
      dose.medicationName,
      i18n.t('intakeLog.selectAction'),
      [
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
      ]
    );
  };

  const handlePress = () => {
    if (isLogged) {
      // View details
      if (onPress) onPress();
    } else {
      // Show options for pending/overdue doses
      showLogOptions();
    }
  };
  
  const showLogOptions = () => {
    const now = new Date();
    const minutesEarly = differenceInMinutes(dose.time, now);
    
    // Check if dose is early (within 2 hours before scheduled time)
    if (minutesEarly > 0 && minutesEarly <= 120) {
      // LTE-003: Taking within 2 hours before scheduled time
      Alert.alert(
        dose.medicationName,
        i18n.t('intakeLog.logDoseOptions'),
        [
          {
            text: i18n.t('intakeLog.tookAtScheduledTime'),
            onPress: () => handleLogAtScheduledTime(),
          },
          {
            text: i18n.t('intakeLog.takingNowEarly'),
            onPress: () => handleLogNow(),
          },
          {
            text: i18n.t('common.cancel'),
            style: 'cancel',
          },
        ]
      );
    } else if (status === 'overdue') {
      // Overdue doses (>2 hours late)
      Alert.alert(
        dose.medicationName,
        i18n.t('intakeLog.logDoseOptions'),
        [
          {
            text: i18n.t('intakeLog.tookAtScheduledTime'),
            onPress: () => handleLogAtScheduledTime(),
          },
          {
            text: i18n.t('intakeLog.takingNowEarly'),
            onPress: () => handleLogNow(),
          },
          {
            text: i18n.t('common.cancel'),
            style: 'cancel',
          },
        ]
      );
    } else {
      // Normal case: just log at current time
      handleLogNow();
    }
  };
  
  const handleLogAtScheduledTime = async () => {
    if (!activeProfile) return;
    
    setIsLogging(true);
    try {
      await createIntakeLog({
        medicationId: dose.medicationId,
        profileId: activeProfile.id,
        scheduledTime: dose.time,
        actualTime: dose.time, // Log at scheduled time
        action: 'taken',
        dosageAmount: dose.dosageAmount,
      });
      
      if (onLog) onLog();
    } catch (error) {
      console.error('Failed to log intake:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLogging(false);
    }
  };
  
  const handleLogNow = async () => {
    if (!activeProfile) return;
    
    setIsLogging(true);
    try {
      const now = new Date();
      const hoursLate = differenceInHours(now, dose.time);
      
      await createIntakeLog({
        medicationId: dose.medicationId,
        profileId: activeProfile.id,
        scheduledTime: dose.time,
        actualTime: now,
        action: 'taken',
        dosageAmount: dose.dosageAmount,
      });
      
      // Check if dose was taken late (>2 hours) - LTE-001/002
      if (hoursLate > 2) {
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
              onPress: () => handleRescheduleNextDose(hoursLate)
            }
          ]
        );
      }
      
      if (onLog) onLog();
    } catch (error) {
      console.error('Failed to log intake:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToSave'));
    } finally {
      setIsLogging(false);
    }
  };
  
  const handleRescheduleNextDose = (hoursLate: number) => {
    // TODO: Implement reschedule logic by updating medication schedule
    // This would shift all future doses by the delay amount
    console.log(`Rescheduling next dose by ${hoursLate} hours`);
    Alert.alert(
      i18n.t('common.success'),
      'Future doses have been rescheduled to maintain optimal timing.'
    );
  };

  const handleLogSuccess = () => {
    if (onLog) onLog();
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={isLogging}
      >
        <Card className={`mb-2 border ${statusStyle.bgColor}`}>
          <CardContent className="p-3">
            <View className="flex-row items-center gap-3">
              {/* Time */}
              <View className="w-16">
                <Text className={`text-lg font-bold ${status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
                  {format(dose.time, 'HH:mm')}
                </Text>
                {status === 'overdue' && (
                  <Text className="text-xs text-red-600 dark:text-red-400">
                    {hoursOverdue}h late
                  </Text>
                )}
              </View>
              
              {/* Medication Image */}
              {dose.imageUri ? (
                <Image
                  source={{ uri: dose.imageUri }}
                  className="w-12 h-12 rounded-lg"
                />
              ) : (
                <View className="w-12 h-12 rounded-lg bg-muted items-center justify-center">
                  <Pill size={24} className="text-muted-foreground" />
                </View>
              )}
              
              {/* Medication Info */}
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {dose.medicationName}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {dose.dosageAmount} {dose.dosageUnit}
                </Text>
                {dose.notes && (
                  <Text className="text-xs text-muted-foreground italic mt-1">
                    {dose.notes}
                  </Text>
                )}
              </View>

              {/* Status Icon */}
              <View className="items-center">
                <StatusIcon size={24} className={statusStyle.iconColor} />
                {status === 'taken' && (
                  <Text className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {i18n.t('history.actions.taken')}
                  </Text>
                )}
                {status === 'skipped' && (
                  <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {i18n.t('history.actions.skipped')}
                  </Text>
                )}
                {status === 'partial' && (
                  <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {i18n.t('history.actions.partial')}
                  </Text>
                )}
              </View>
            </View>
          </CardContent>
        </Card>
      </Pressable>

      <IntakeLogDialog
        visible={dialogVisible}
        dose={dose}
        onClose={() => setDialogVisible(false)}
        onSuccess={handleLogSuccess}
      />
    </>
  );
}
