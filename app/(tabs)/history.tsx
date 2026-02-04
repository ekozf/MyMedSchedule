import { View, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getIntakeLogsByProfile,
  getMedicationsByProfile,
  deleteIntakeLog,
  updateMedicationInventory,
  getMedicationById,
} from '@/lib/db/operations';
import type { IntakeLog, Medication } from '@/types';
import { format, subDays } from 'date-fns';
import { Calendar, Edit3, Trash2, Plus } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { EditLogDialog } from '@/components/medication/EditLogDialog';
import { RetroactiveLogDialog } from '@/components/medication/RetroactiveLogDialog';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { useLocalSearchParams } from 'expo-router';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const dateFnsLocale = getDateFnsLocale();
  const { activeProfile, loadMedications } = useStore();
  const { medicationId } = useLocalSearchParams<{ medicationId?: string | string[] }>();
  const medicationIdParam = Array.isArray(medicationId) ? medicationId[0] : medicationId;
  const [logs, setLogs] = useState<IntakeLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<IntakeLog[]>([]);
  const [selectedMedication, setSelectedMedication] = useState<string>(medicationIdParam || 'all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');
  const [refreshing, setRefreshing] = useState(false);
  const [editingLog, setEditingLog] = useState<IntakeLog | null>(null);
  const [showRetroactiveDialog, setShowRetroactiveDialog] = useState(false);

  // Load data on first mount
  useEffect(() => {
    loadData();
  }, [activeProfile]);

  // Refresh data when screen comes into focus (e.g., after logging intake from dashboard)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeProfile])
  );

  useEffect(() => {
    applyFilters();
  }, [logs, selectedMedication, selectedAction, dateRange]);

  useEffect(() => {
    if (medicationIdParam) {
      setSelectedMedication(medicationIdParam);
    }
  }, [medicationIdParam]);

  const loadData = async (showRefreshing = false) => {
    if (!activeProfile) return;

    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      const [fetchedLogs, fetchedMeds] = await Promise.all([
        getIntakeLogsByProfile(activeProfile.id),
        getMedicationsByProfile(activeProfile.id, false),
      ]);

      setLogs(fetchedLogs);
      setMedications(fetchedMeds);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    loadData(true);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Filter by date range
    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const cutoffDate = subDays(new Date(), days);
      filtered = filtered.filter((log) => new Date(log.actualTime) >= cutoffDate);
    }

    // Filter by medication
    if (selectedMedication !== 'all') {
      filtered = filtered.filter((log) => log.medicationId === selectedMedication);
    }

    // Filter by action
    if (selectedAction !== 'all') {
      filtered = filtered.filter((log) => log.action === selectedAction);
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.actualTime).getTime() - new Date(a.actualTime).getTime());

    setFilteredLogs(filtered);
  };

  const getMedicationName = (medicationId: string) => {
    const med = medications.find((m) => m.id === medicationId);
    return med?.name || i18n.t('history.unknownMedication');
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'taken':
        return <Badge label={i18n.t('history.actions.taken')} variant="default" />;
      case 'skipped':
        return <Badge label={i18n.t('history.actions.skipped')} variant="secondary" />;
      case 'partial':
        return <Badge label={i18n.t('history.actions.partial')} variant="warning" />;
      default:
        return null;
    }
  };

  const handleDeleteLog = async (log: IntakeLog) => {
    Alert.alert(i18n.t('intakeLog.deleteLog'), i18n.t('intakeLog.deleteDescription'), [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            // Restore inventory if it was a taken or partial dose
            if (log.action === 'taken' || log.action === 'partial') {
              const medication = await getMedicationById(log.medicationId);
              if (medication) {
                const newCount = medication.inventoryCount + log.dosageAmount;
                await updateMedicationInventory(log.medicationId, newCount);

                // Reload medications
                if (activeProfile) {
                  await loadMedications(activeProfile.id);
                }
              }
            }

            await deleteIntakeLog(log.id);
            await loadData();
          } catch (error) {
            console.error('Failed to delete log:', error);
            Alert.alert(i18n.t('common.error'), i18n.t('errors.failedToDelete'));
          }
        },
      },
    ]);
  };

  const handleEditLog = (log: IntakeLog) => {
    setEditingLog(log);
  };

  const medicationOptions = [
    { label: i18n.t('history.allMedications'), value: 'all' },
    ...medications.map((med) => ({ label: med.name, value: med.id })),
  ];

  const actionOptions = [
    { label: i18n.t('history.allActions'), value: 'all' },
    { label: i18n.t('history.actions.taken'), value: 'taken' },
    { label: i18n.t('history.actions.skipped'), value: 'skipped' },
    { label: i18n.t('history.actions.partial'), value: 'partial' },
  ];

  const dateRangeOptions = [
    { label: i18n.t('history.last7Days'), value: '7' },
    { label: i18n.t('history.last30Days'), value: '30' },
    { label: i18n.t('history.last90Days'), value: '90' },
    { label: i18n.t('history.allTime'), value: 'all' },
  ];

  if (logs.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background p-4"
        style={{ paddingTop: insets.top + 16 }}>
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Calendar size={40} className="text-muted-foreground" />
        </View>
        <Text className="mb-2 text-lg font-semibold text-foreground">
          {i18n.t('history.noHistory')}
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          {i18n.t('history.startLoggingPrompt')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border p-4" style={{ paddingTop: insets.top + 16 }}>
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">{i18n.t('history.title')}</Text>
          <Button
            onPress={() => setShowRetroactiveDialog(true)}
            size="sm"
            className="flex-row gap-2">
            <Plus size={16} className="text-primary-foreground" />
            <Text className="font-medium text-primary-foreground">
              {i18n.t('intakeLog.logRetroactive')}
            </Text>
          </Button>
        </View>

        {/* Filters */}
        <View className="gap-3">
          <Select
            options={dateRangeOptions}
            value={dateRange}
            onValueChange={setDateRange}
            placeholder={i18n.t('history.selectDateRange')}
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Select
                options={medicationOptions}
                value={selectedMedication}
                onValueChange={setSelectedMedication}
                placeholder={i18n.t('history.filterByMedication')}
              />
            </View>
            <View className="flex-1">
              <Select
                options={actionOptions}
                value={selectedAction}
                onValueChange={setSelectedAction}
                placeholder={i18n.t('history.filterByAction')}
              />
            </View>
          </View>
        </View>
      </View>

      {/* History List */}
      <ScrollView
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {filteredLogs.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Text className="text-muted-foreground">{i18n.t('history.noLogsMatch')}</Text>
          </View>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="mb-3">
              <CardContent className="p-4">
                <View className="mb-2 flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="mb-1 text-lg font-semibold text-foreground">
                      {getMedicationName(log.medicationId)}
                    </Text>
                    <Text className="text-muted-foreground">
                      {format(new Date(log.actualTime), 'PP • p', { locale: dateFnsLocale })}
                    </Text>
                    {log.scheduledTime && (
                      <Text className="mt-1 text-muted-foreground">
                        {i18n.t('history.scheduledFor')}:{' '}
                        {format(new Date(log.scheduledTime), 'PP • p', { locale: dateFnsLocale })}
                      </Text>
                    )}
                  </View>
                  {getActionBadge(log.action)}
                </View>

                {log.dosageAmount > 0 && (
                  <Text className="mb-1 text-muted-foreground">
                    {i18n.t('history.amount')}: {log.dosageAmount}
                  </Text>
                )}

                {log.notes && (
                  <Text className="mt-2 italic text-muted-foreground">{log.notes}</Text>
                )}

                {/* Action Buttons */}
                <View className="mt-3 flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => handleEditLog(log)}
                    className="flex-1 flex-row gap-2">
                    <Edit3 size={14} className="text-foreground" />
                    <Text>{i18n.t('common.edit')}</Text>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => handleDeleteLog(log)}
                    className="flex-1 flex-row gap-2">
                    <Trash2 size={14} className="text-destructive" />
                    <Text className="text-destructive">{i18n.t('common.delete')}</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))
        )}
      </ScrollView>

      <EditLogDialog
        visible={editingLog !== null}
        log={editingLog}
        medications={medications}
        onClose={() => setEditingLog(null)}
        onSuccess={() => {
          setEditingLog(null);
          loadData();
        }}
      />

      <RetroactiveLogDialog
        visible={showRetroactiveDialog}
        medications={medications.filter((m) => m.isActive)}
        onClose={() => setShowRetroactiveDialog(false)}
        onSuccess={() => {
          setShowRetroactiveDialog(false);
          loadData();
        }}
      />
    </View>
  );
}
