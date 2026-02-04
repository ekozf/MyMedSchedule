import { View, Image, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Pill } from 'lucide-react-native';
import type { Medication } from '@/types';
import { getNextDose, getScheduleDescription } from '@/lib/schedule/calculator';
import { getRunningLowStatus } from '@/lib/medications/refill';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { router } from 'expo-router';
import i18n from '@/lib/i18n';

export interface MedicationCardProps {
  medication: Medication;
  onPress?: () => void;
}

export function MedicationCard({ medication, onPress }: MedicationCardProps) {
  const dateFnsLocale = getDateFnsLocale();
  const nextDose = getNextDose(medication);
  const scheduleDesc = getScheduleDescription(medication);
  const runningLow = getRunningLowStatus(medication);
  const isRunningLow = !!runningLow?.isRunningLow;
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
              <Image source={{ uri: medication.imageUri }} className="h-16 w-16 rounded-lg" />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-lg bg-muted">
                <Pill size={32} className="text-muted-foreground" />
              </View>
            )}

            {/* Medication Info */}
            <View className="flex-1">
              <View className="mb-1 flex-row items-center gap-2">
                <Text className="flex-1 text-lg font-semibold text-foreground">
                  {medication.name}
                </Text>
                {medication.isPrn && <Badge label="PRN" variant="secondary" />}
              </View>

              <Text className="mb-2 text-sm text-muted-foreground">
                {medication.dosageAmount} {i18n.t(`medications.units.${medication.dosageUnit}`)}
              </Text>

              <View className="mb-1 flex-row items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                <Text className="text-sm text-muted-foreground">{scheduleDesc}</Text>
              </View>

              {nextDose && !medication.isPrn && (
                <Text className="text-xs text-muted-foreground">
                  {i18n.t('medications.nextColon')}{' '}
                  {format(nextDose.time, 'Pp', { locale: dateFnsLocale })}
                </Text>
              )}

              {/* Warnings */}
              {(isRunningLow || isExpired) && (
                <View className="mt-2 flex-row gap-2">
                  {isRunningLow && (
                    <Badge
                      label={i18n.t('medications.runningLowWithDoses', {
                        doses: runningLow?.remainingDoses ?? 0,
                      })}
                      variant="warning"
                    />
                  )}
                  {isExpired && (
                    <Badge label={i18n.t('medications.expired')} variant="destructive" />
                  )}
                </View>
              )}

              {/* Inventory Count */}
              {!medication.isPrn && (
                <Text className="mt-2 text-xs text-muted-foreground">
                  {i18n.t('medications.inventory', {
                    count: medication.inventoryCount,
                    unit: i18n.t(`medications.units.${medication.dosageUnit}`),
                  })}
                </Text>
              )}
            </View>
          </View>
        </CardContent>
      </Pressable>
    </Card>
  );
}
