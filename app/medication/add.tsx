import { View, ScrollView, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchedulePicker } from '@/components/medication/SchedulePicker';
import { useState } from 'react';
import { router } from 'expo-router';
import { useStore } from '@/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createMedication } from '@/lib/db/operations';
import { validateScheduleConfig } from '@/lib/validation/medication';
import { scheduleNotificationsForMedication, scheduleRefillReminder } from '@/lib/notifications/scheduler';
import { requestNotificationPermissions } from '@/lib/notifications/permissions';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';

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

export default function AddMedicationScreen() {
  const insets = useSafeAreaInsets();
  const { activeProfile, loadMedications } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    
    if (!activeProfile) {
      Alert.alert('Error', 'No active profile');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const newMedication = await createMedication({
        profileId: activeProfile.id,
        name: name.trim(),
        imageUri,
        notes: notes.trim() || undefined,
        dosageAmount: parseFloat(dosageAmount),
        dosageUnit,
        scheduleType,
        scheduleConfig,
        inventoryCount: parseFloat(inventoryCount) || 0,
        packageSize: packageSize ? parseFloat(packageSize) : undefined,
        isPrn: scheduleType === 'prn',
      });
      
      // Request notification permissions and schedule notifications
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        if (scheduleType !== 'prn') {
          await scheduleNotificationsForMedication(newMedication);
        }
        // Schedule refill reminder if configured
        await scheduleRefillReminder(newMedication);
      }
      
      // Reload medications
      await loadMedications(activeProfile.id);
      
      // Navigate back
      router.back();
    } catch (error) {
      console.error('Failed to create medication:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('medications.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView 
        className="flex-1 px-4" 
        style={{ paddingTop: insets.top + 16 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
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
                <Text className="text-xs text-muted-foreground">{i18n.t('medications.photoSelected')}</Text>
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
                // Reset config when type changes - no default values
                setScheduleConfig({});
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
              label="Package Size"
              value={packageSize}
              onChangeText={setPackageSize}
              placeholder="e.g., 30 pills per package"
              keyboardType="decimal-pad"
            />
          </CardContent>
        </Card>
      </ScrollView>
      
      <View className="px-4 pb-4 pt-4 border-t border-border bg-background">
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            onPress={() => router.back()}
            disabled={isLoading}
            className="flex-1"
          >
            <Text>Cancel</Text>
          </Button>
          <Button
            onPress={handleSave}
            disabled={isLoading}
            className="flex-1"
          >
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? 'Saving...' : 'Save Medication'}
            </Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
