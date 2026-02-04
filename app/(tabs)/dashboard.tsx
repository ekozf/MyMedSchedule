import { View, ScrollView, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import { DayPicker } from '@/components/dashboard/DayPicker';
import { MedicationScheduleItem } from '@/components/dashboard/MedicationScheduleItem';
import { ProfileSwitcher } from '@/components/profile/ProfileSwitcher';
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store';
import { getAllDosesForDate } from '@/lib/schedule/calculator';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { Calendar } from 'lucide-react-native';
import { getIntakeLogsByProfile } from '@/lib/db/operations';
import type { IntakeLog } from '@/types';
import i18n from '@/lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { medications, activeProfile, loadMedications } = useStore();
  // Initialize with today at start of day for consistent comparisons
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [doses, setDoses] = useState<any[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<IntakeLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadIntakeLogs = useCallback(async () => {
    if (!activeProfile) return;
    try {
      const logs = await getIntakeLogsByProfile(activeProfile.id);
      // Filter logs for selected date
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);
      const filteredLogs = logs.filter((log) => {
        const logTime = new Date(log.actualTime);
        return logTime >= dayStart && logTime <= dayEnd;
      });
      setIntakeLogs(filteredLogs);
    } catch (error) {
      console.error('Failed to load intake logs:', error);
    }
  }, [activeProfile, selectedDate]);

  useEffect(() => {
    if (medications.length > 0) {
      const scheduledDoses = getAllDosesForDate(medications, selectedDate);
      setDoses(scheduledDoses);
    } else {
      setDoses([]);
    }
  }, [medications, selectedDate]);

  useEffect(() => {
    loadIntakeLogs();
  }, [loadIntakeLogs]);

  // Refresh data when screen comes into focus (e.g., after logging intake from notification)
  useFocusEffect(
    useCallback(() => {
      if (activeProfile) {
        loadMedications(activeProfile.id);
        loadIntakeLogs();
      }
    }, [activeProfile, loadMedications, loadIntakeLogs])
  );

  const getDoseLogInfo = (
    dose: any
  ): { isLogged: boolean; action?: 'taken' | 'skipped' | 'partial' } => {
    const log = intakeLogs.find(
      (log) =>
        log.medicationId === dose.medicationId &&
        log.scheduledTime?.toISOString() === dose.time.toISOString()
    );

    if (log) {
      return { isLogged: true, action: log.action };
    }

    return { isLogged: false };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload medications from database
      if (activeProfile) {
        await loadMedications(activeProfile.id);
      }
      // Reload intake logs
      await loadIntakeLogs();
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const dateLabel = isToday(selectedDate)
    ? i18n.t('dashboard.today')
    : format(selectedDate, 'EEEE, MMMM d');

  return (
    <View className="flex-1 bg-background">
      {/* Header with Profile Switcher */}
      <View className="border-b border-border px-4 pb-2" style={{ paddingTop: insets.top + 16 }}>
        <ProfileSwitcher />
      </View>

      {/* Day Picker */}
      <DayPicker selectedDate={selectedDate} onDateChange={setSelectedDate} />

      {/* Schedule Content */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View className="p-4">
          <Text className="mb-4 text-xl font-bold text-foreground">{dateLabel}</Text>

          {doses.length === 0 ? (
            <View className="items-center justify-center py-12">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Calendar size={40} className="text-muted-foreground" />
              </View>
              <Text className="mb-2 text-lg font-semibold text-foreground">
                {i18n.t('dashboard.noMedicationsScheduled')}
              </Text>
              <Text className="text-center text-sm text-muted-foreground">
                {medications.length === 0
                  ? i18n.t('dashboard.addMedicationsPrompt')
                  : i18n.t('dashboard.noDosesScheduled')}
              </Text>
            </View>
          ) : (
            <>
              <Text className="mb-4 text-sm text-muted-foreground">
                {i18n.t('dashboard.dosesScheduled', { count: doses.length })}
              </Text>

              {doses.map((dose, index) => {
                const logInfo = getDoseLogInfo(dose);
                return (
                  <MedicationScheduleItem
                    key={`${dose.medicationId}-${index}`}
                    dose={dose}
                    isLogged={logInfo.isLogged}
                    logAction={logInfo.action}
                    onLog={loadIntakeLogs}
                  />
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
