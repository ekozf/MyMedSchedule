import { View, Image, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Pill } from 'lucide-react-native';
import type { Medication } from '@/types';
import { getNextDose, getScheduleDescription } from '@/lib/schedule/calculator';
import { format } from 'date-fns';
import { router } from 'expo-router';
import i18n from '@/lib/i18n';

export interface MedicationCardProps {
  medication: Medication;
  onPress?: () => void;
}

export function MedicationCard({ medication, onPress }: MedicationCardProps) {
  const nextDose = getNextDose(medication);
  const scheduleDesc = getScheduleDescription(medication);
  const isLowInventory = medication.inventoryCount < 5 && medication.inventoryCount > 0;
  const isExpired = medication.expirationDate && new Date(medication.expirationDate) < new Date();
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/medication/${medication.id}`);
    }
  };
  
  return (
    <Card className="mb-3">
      <Pressable onPress={handlePress}>
        <CardContent className="p-4">
          <View className="flex-row gap-4">
            {/* Medication Image */}
            {medication.imageUri ? (
              <Image
                source={{ uri: medication.imageUri }}
                className="w-16 h-16 rounded-lg"
              />
            ) : (
              <View className="w-16 h-16 rounded-lg bg-muted items-center justify-center">
                <Pill size={32} className="text-muted-foreground" />
              </View>
            )}
            
            {/* Medication Info */}
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-lg font-semibold text-foreground flex-1">
                  {medication.name}
                </Text>
                {medication.isPrn && (
                  <Badge label="PRN" variant="secondary" />
                )}
              </View>
              
              <Text className="text-sm text-muted-foreground mb-2">
                {medication.dosageAmount} {medication.dosageUnit}
              </Text>
              
              <View className="flex-row items-center gap-2 mb-1">
                <Clock size={14} className="text-muted-foreground" />
                <Text className="text-sm text-muted-foreground">
                  {scheduleDesc}
                </Text>
              </View>
              
              {nextDose && !medication.isPrn && (
                <Text className="text-xs text-muted-foreground">
                  Next: {format(nextDose.time, 'MMM d, HH:mm')}
                </Text>
              )}
              
              {/* Warnings */}
              {(isLowInventory || isExpired) && (
                <View className="flex-row gap-2 mt-2">
                  {isLowInventory && (
                    <Badge label={i18n.t('medications.lowInventory')} variant="warning" />
                  )}
                  {isExpired && (
                    <Badge label={i18n.t('medications.expired')} variant="destructive" />
                  )}
                </View>
              )}
              
              {/* Inventory Count */}
              {!medication.isPrn && (
                <Text className="text-xs text-muted-foreground mt-2">
                  {i18n.t('medications.inventory', { count: medication.inventoryCount, unit: medication.dosageUnit })}
                </Text>
              )}
            </View>
          </View>
        </CardContent>
      </Pressable>
    </Card>
  );
}
