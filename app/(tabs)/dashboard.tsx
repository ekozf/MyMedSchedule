import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { DayPicker } from '@/components/dashboard/DayPicker';
import { MedicationScheduleItem } from '@/components/dashboard/MedicationScheduleItem';
import { ProfileSwitcher } from '@/components/profile/ProfileSwitcher';
import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { getAllDosesForDate } from '@/lib/schedule/calculator';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { Calendar } from 'lucide-react-native';
import { getIntakeLogsByProfile } from '@/lib/db/operations';
import type { IntakeLog } from '@/types';
import i18n from '@/lib/i18n';

export default function DashboardScreen() {
  const { medications, activeProfile } = useStore();
  // Initialize with today at start of day for consistent comparisons
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [doses, setDoses] = useState<any[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<IntakeLog[]>([]);
  
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
  }, [activeProfile, selectedDate]);

  const loadIntakeLogs = async () => {
    if (!activeProfile) return;
    try {
      const logs = await getIntakeLogsByProfile(activeProfile.id);
      // Filter logs for selected date
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);
      const filteredLogs = logs.filter(log => {
        const logTime = new Date(log.actualTime);
        return logTime >= dayStart && logTime <= dayEnd;
      });
      setIntakeLogs(filteredLogs);
    } catch (error) {
      console.error('Failed to load intake logs:', error);
    }
  };

  const isDoseLogged = (dose: any) => {
    return intakeLogs.some(log => 
      log.medicationId === dose.medicationId &&
      log.scheduledTime === dose.time.toISOString()
    );
  };
  
  const dateLabel = isToday(selectedDate)
    ? i18n.t('dashboard.today')
    : format(selectedDate, 'EEEE, MMMM d');
  
  return (
    <View className="flex-1 bg-background">
      {/* Header with Profile Switcher */}
      <View className="px-4 pt-4 pb-2 border-b border-border">
        <ProfileSwitcher />
      </View>
      
      {/* Day Picker */}
      <DayPicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
      
      {/* Schedule Content */}
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-xl font-bold text-foreground mb-4">
            {dateLabel}
          </Text>
          
          {doses.length === 0 ? (
            <View className="items-center justify-center py-12">
              <View className="w-20 h-20 rounded-full bg-muted items-center justify-center mb-4">
                <Calendar size={40} className="text-muted-foreground" />
              </View>
              <Text className="text-lg font-semibold text-foreground mb-2">
                {i18n.t('dashboard.noMedicationsScheduled')}
              </Text>
              <Text className="text-sm text-muted-foreground text-center">
                {medications.length === 0
                  ? i18n.t('dashboard.addMedicationsPrompt')
                  : i18n.t('dashboard.noDosesScheduled')}
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-sm text-muted-foreground mb-4">
                {i18n.t('dashboard.dosesScheduled', { count: doses.length })}
              </Text>
              
              {doses.map((dose, index) => (
                <MedicationScheduleItem
                  key={`${dose.medicationId}-${index}`}
                  dose={dose}
                  isLogged={isDoseLogged(dose)}
                  onLog={loadIntakeLogs}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
