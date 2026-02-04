import { View, ScrollView, Alert, Switch, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchedulePicker } from '@/components/medication/SchedulePicker';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMedicationById, updateMedication } from '@/lib/db/operations';
import { validateScheduleConfig } from '@/lib/validation/medication';
import {
  scheduleNotificationsForMedication,
  cancelNotificationsForMedication,
  scheduleRefillReminder,
} from '@/lib/notifications/scheduler';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import type { Medication } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';

const getDosageUnitOptions = () => [
  { label: `${i18n.t('medications.units.g')} (g)`, value: 'grams' },
  { label: `${i18n.t('medications.units.mg')} (mg)`, value: 'milligrams' },
  { label: `${i18n.t('medications.units.ml')} (ml)`, value: 'milliliters' },
  { label: i18n.t('medications.units.pills'), value: 'pills' },
  { label: i18n.t('medications.units.puffs'), value: 'puffs' },
  { label: i18n.t('medications.units.drops'), value: 'drops' },
  { label: i18n.t('medications.units.patches'), value: 'patches' },
  { label: i18n.t('medications.units.units'), value: 'units' },
];

const getScheduleTypeOptions = () => [
  { label: i18n.t('medications.scheduleTypes.once_daily'), value: 'once_daily' },
  { label: i18n.t('medications.scheduleTypes.multiple_daily'), value: 'multiple_daily' },
  { label: i18n.t('medications.scheduleTypes.every_x_days'), value: 'every_x_days' },
  { label: i18n.t('medications.scheduleTypes.specific_weekdays'), value: 'specific_weekdays' },
  { label: i18n.t('medications.scheduleTypes.xth_weekday'), value: 'xth_weekday' },
  { label: i18n.t('medications.scheduleTypes.cycle'), value: 'cycle' },
  { label: i18n.t('medications.scheduleTypes.every_x_hours'), value: 'every_x_hours' },
  { label: i18n.t('medications.scheduleTypes.tapering'), value: 'tapering' },
  { label: i18n.t('medications.scheduleTypes.prn'), value: 'prn' },
];

const getRefillReminderTypeOptions = () => [
  { label: i18n.t('medications.refillReminderTypes.none'), value: 'none' },
  { label: i18n.t('medications.refillReminderTypes.days'), value: 'days' },
  { label: i18n.t('medications.refillReminderTypes.doses'), value: 'doses' },
];

export default function EditMedicationScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeProfile, loadMedications } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Basic fields
  const [name, setName] = useState('');
  const [dosageAmount, setDosageAmount] = useState('');
  const [dosageUnit, setDosageUnit] = useState('pills');
  const [imageUri, setImageUri] = useState<string>();
  const [notes, setNotes] = useState('');

  // Schedule
  const [scheduleType, setScheduleType] = useState('once_daily');
  const [scheduleConfig, setScheduleConfig] = useState<any>({});

  // Inventory
  const [inventoryCount, setInventoryCount] = useState('0');
  const [packageSize, setPackageSize] = useState('');

  // Advanced settings
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);
  const [expirationReminderDays, setExpirationReminderDays] = useState('');
  const [refillReminderType, setRefillReminderType] = useState<
    'days' | 'doses' | 'none' | undefined
  >();
  const [refillReminderValue, setRefillReminderValue] = useState('');
  const [maxDailyDose, setMaxDailyDose] = useState('');
  const [minHoursBetweenDoses, setMinHoursBetweenDoses] = useState('');
  const [bypassDnd, setBypassDnd] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dateFnsLocale = getDateFnsLocale();

  useEffect(() => {
    loadMedicationData();
  }, [id]);

  async function loadMedicationData() {
    if (!id) return;

    try {
      setIsLoading(true);
      const med = await getMedicationById(id);

      if (!med) {
        Alert.alert(i18n.t('common.error'), i18n.t('medications.loadError'));
        router.back();
        return;
      }

      // Populate form fields
      setName(med.name);
      setDosageAmount(med.dosageAmount.toString());
      setDosageUnit(med.dosageUnit);
      setImageUri(med.imageUri);
      setNotes(med.notes || '');
      setScheduleType(med.scheduleType);
      setScheduleConfig(JSON.parse(med.scheduleConfig));
      setInventoryCount(med.inventoryCount.toString());
      setPackageSize(med.packageSize?.toString() || '');
      setExpirationDate(med.expirationDate);
      setExpirationReminderDays(''); // Would need to be stored separately
      setRefillReminderType(med.refillReminderType ?? 'none');
      setRefillReminderValue(med.refillReminderValue?.toString() || '');
      setMaxDailyDose(med.maxDailyDose?.toString() || '');
      setMinHoursBetweenDoses(med.minHoursBetweenDoses?.toString() || '');
      setBypassDnd(med.bypassDnd);
    } catch (error) {
      console.error('Failed to load medication:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('medications.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = i18n.t('errors.requiredField');
    }

    const dosage = parseFloat(dosageAmount);
    if (!dosageAmount || isNaN(dosage) || dosage <= 0) {
      newErrors.dosageAmount = i18n.t('validation.mustBePositive');
    }

    // Validate schedule config
    const scheduleValidation = validateScheduleConfig(scheduleType, scheduleConfig);
    if (!scheduleValidation.success) {
      newErrors.schedule = scheduleValidation.error || i18n.t('errors.invalidInput');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    if (!activeProfile || !id) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedMed = await updateMedication(id, {
        name: name.trim(),
        imageUri,
        notes: notes.trim() || undefined,
        dosageAmount: parseFloat(dosageAmount),
        dosageUnit,
        scheduleType,
        scheduleConfig,
        inventoryCount: parseFloat(inventoryCount) || 0,
        packageSize: packageSize ? parseFloat(packageSize) : undefined,
        expirationDate: expirationDate,
        refillReminderType:
          refillReminderType === 'none'
            ? null
            : refillReminderType
              ? refillReminderType
              : undefined,
        refillReminderValue:
          refillReminderType === 'none'
            ? null
            : refillReminderType && refillReminderValue
              ? parseFloat(refillReminderValue)
              : undefined,
        maxDailyDose: maxDailyDose ? parseFloat(maxDailyDose) : undefined,
        minHoursBetweenDoses: minHoursBetweenDoses ? parseFloat(minHoursBetweenDoses) : undefined,
        bypassDnd,
        isPrn: scheduleType === 'prn',
      });

      // Reschedule notifications
      if (updatedMed && updatedMed.isActive) {
        await cancelNotificationsForMedication(id);
        if (scheduleType !== 'prn') {
          await scheduleNotificationsForMedication(updatedMed);
        }
        // Update refill reminder
        await scheduleRefillReminder(updatedMed);
      }

      // Reload medications
      await loadMedications(activeProfile.id);

      // Navigate back to detail
      router.back();
    } catch (error) {
      console.error('Failed to update medication:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('medications.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-muted-foreground">{i18n.t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4"
        style={{ paddingTop: insets.top + 16 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Basic Information */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{i18n.t('medications.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            <Input
              label={`${i18n.t('medications.nameLabel')} *`}
              value={name}
              onChangeText={setName}
              placeholder={i18n.t('medications.namePlaceholder')}
              error={errors.name}
            />

            <View className="flex-row gap-2">
              <Input
                label={`${i18n.t('medications.dosageLabel')} *`}
                value={dosageAmount}
                onChangeText={setDosageAmount}
                placeholder={i18n.t('medications.dosagePlaceholder')}
                keyboardType="decimal-pad"
                error={errors.dosageAmount}
                containerClassName="flex-1"
              />

              <Select
                label={`${i18n.t('medications.unitLabel')} *`}
                options={getDosageUnitOptions()}
                value={dosageUnit}
                onValueChange={setDosageUnit}
                className="flex-1"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                {i18n.t('medications.photoOptional')}
              </Text>
              <View className="flex-row gap-2">
                <Button variant="outline" onPress={handleTakePhoto} className="flex-1">
                  <Camera size={18} className="text-foreground" />
                  <Text className="ml-2">{i18n.t('medications.camera')}</Text>
                </Button>
                <Button variant="outline" onPress={handlePickImage} className="flex-1">
                  <ImageIcon size={18} className="text-foreground" />
                  <Text className="ml-2">{i18n.t('medications.gallery')}</Text>
                </Button>
              </View>
              {imageUri && (
                <Text className="text-xs text-muted-foreground">
                  {i18n.t('medications.photoSelected')}
                </Text>
              )}
            </View>

            <Input
              label={i18n.t('medications.notesOptional')}
              value={notes}
              onChangeText={setNotes}
              placeholder={i18n.t('medications.notesPlaceholder')}
              multiline
              numberOfLines={3}
            />
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{i18n.t('medications.scheduleInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            <Select
              label={`${i18n.t('medications.scheduleTypeLabel')} *`}
              options={getScheduleTypeOptions()}
              value={scheduleType}
              onValueChange={(value) => {
                setScheduleType(value);
                setScheduleConfig({});

                // PRN: day-based refill reminders aren't meaningful.
                if (value === 'prn' && refillReminderType === 'days') {
                  setRefillReminderType('none');
                  setRefillReminderValue('');
                }
              }}
            />

            <SchedulePicker
              scheduleType={scheduleType}
              scheduleConfig={scheduleConfig}
              onChange={setScheduleConfig}
              error={errors.schedule}
            />
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{i18n.t('medications.inventoryInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            <Input
              label={i18n.t('medications.inventoryLabel')}
              value={inventoryCount}
              onChangeText={setInventoryCount}
              placeholder="0"
              keyboardType="decimal-pad"
            />

            <Input
              label={i18n.t('medications.packageSizeLabel')}
              value={packageSize}
              onChangeText={setPackageSize}
              placeholder="e.g., 30"
              keyboardType="decimal-pad"
            />

            {/* Refill Reminder */}
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                {i18n.t('medications.refillReminderLabel')}
              </Text>
              <Select
                options={
                  scheduleType === 'prn'
                    ? getRefillReminderTypeOptions().filter((o) => o.value !== 'days')
                    : getRefillReminderTypeOptions()
                }
                value={refillReminderType || ''}
                onValueChange={(value) => {
                  const next = value as any as 'days' | 'doses' | 'none';
                  setRefillReminderType(next);
                  if (next === 'none') {
                    setRefillReminderValue('');
                  }
                }}
                placeholder={i18n.t('medications.refillReminderType')}
              />
              {refillReminderType && refillReminderType !== 'none' && (
                <Input
                  label={i18n.t('medications.refillReminderValue')}
                  value={refillReminderValue}
                  onChangeText={setRefillReminderValue}
                  placeholder="e.g., 7"
                  keyboardType="numeric"
                />
              )}
            </View>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{i18n.t('medications.advancedSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="gap-4">
            {/* Expiration Date */}
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                {i18n.t('medications.expirationDateLabel')}
              </Text>
              <Button variant="outline" onPress={() => setShowExpirationPicker(true)}>
                <Text>
                  {expirationDate
                    ? format(expirationDate, 'PP', { locale: dateFnsLocale })
                    : i18n.t('medications.selectDate')}
                </Text>
              </Button>
              {showExpirationPicker && (
                <DateTimePicker
                  value={expirationDate || new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      setShowExpirationPicker(false);
                      if (event.type === 'dismissed') {
                        return;
                      }
                      if (date) {
                        setExpirationDate(date);
                      }
                      return;
                    }
                    // iOS
                    if (date) {
                      setExpirationDate(date);
                    }
                  }}
                />
              )}
              {expirationDate && (
                <Button
                  variant="ghost"
                  onPress={() => setExpirationDate(undefined)}
                  className="self-start">
                  <Text className="text-xs text-muted-foreground">
                    {i18n.t('medications.clearDate')}
                  </Text>
                </Button>
              )}
            </View>

            {/* Max Daily Dose */}
            <Input
              label={i18n.t('medications.maxDailyDoseLabel')}
              value={maxDailyDose}
              onChangeText={setMaxDailyDose}
              placeholder={i18n.t('medications.maxDailyDosePlaceholder')}
              keyboardType="decimal-pad"
            />

            {/* Min Hours Between Doses */}
            <Input
              label={i18n.t('medications.minHoursBetweenLabel')}
              value={minHoursBetweenDoses}
              onChangeText={setMinHoursBetweenDoses}
              placeholder={i18n.t('medications.minHoursBetweenPlaceholder')}
              keyboardType="decimal-pad"
            />

            {/* Bypass DnD */}
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-1 pr-4">
                <Text className="mb-1 text-sm font-medium text-foreground">
                  {i18n.t('medications.bypassDndLabel')}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {i18n.t('medications.bypassDndDescription')}
                </Text>
              </View>
              <Switch value={bypassDnd} onValueChange={setBypassDnd} />
            </View>
          </CardContent>
        </Card>
      </ScrollView>

      <View className="border-t border-border bg-background px-4 pb-4 pt-4">
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            onPress={() => router.back()}
            disabled={isSaving}
            className="flex-1">
            <Text>{i18n.t('common.cancel')}</Text>
          </Button>
          <Button onPress={handleSave} disabled={isSaving} className="flex-1">
            <Text className="font-semibold text-primary-foreground">
              {isSaving ? i18n.t('common.loading') : i18n.t('common.save')}
            </Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
