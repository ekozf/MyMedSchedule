import { View, Image, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, isAfter } from 'date-fns';
import { Pill, Check } from 'lucide-react-native';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import { useState } from 'react';
import { IntakeLogDialog } from '@/components/medication/IntakeLogDialog';

export interface MedicationScheduleItemProps {
  dose: ScheduledDose;
  isLogged?: boolean;
  onPress?: () => void;
  onLog?: () => void;
}

export function MedicationScheduleItem({ dose, isLogged, onPress, onLog }: MedicationScheduleItemProps) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const isPast = isAfter(new Date(), dose.time);

  const handleLogPress = () => {
    setDialogVisible(true);
  };

  const handleLogSuccess = () => {
    if (onLog) onLog();
  };

  return (
    <>
      <Card className="mb-2">
        <CardContent className="p-3">
          <View className="flex-row items-center gap-3">
            {/* Time */}
            <View className="w-16">
              <Text className="text-lg font-bold text-primary">
                {format(dose.time, 'HH:mm')}
              </Text>
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

            {/* Action Button */}
            {!isLogged && isPast && (
              <Button
                size="sm"
                onPress={handleLogPress}
                className="px-4"
              >
                <Text className="text-xs">Log</Text>
              </Button>
            )}
            
            {isLogged && (
              <View className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 items-center justify-center">
                <Check size={20} className="text-green-600 dark:text-green-400" />
              </View>
            )}
          </View>
        </CardContent>
      </Card>

      <IntakeLogDialog
        visible={dialogVisible}
        dose={dose}
        onClose={() => setDialogVisible(false)}
        onSuccess={handleLogSuccess}
      />
    </>
  );
}
