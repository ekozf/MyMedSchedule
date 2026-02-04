import { View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import i18n from '@/lib/i18n';

export interface LateDoseOverlapWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicationName: string;
  nextDoseTime: Date;
  minutesUntilNext: number;
  onKeepSchedule: () => void | Promise<void>;
  onRescheduleNext: () => void;
  isLoading?: boolean;
}

export function LateDoseOverlapWarningDialog({
  open,
  onOpenChange,
  medicationName,
  nextDoseTime,
  minutesUntilNext,
  onKeepSchedule,
  onRescheduleNext,
  isLoading,
}: LateDoseOverlapWarningDialogProps) {
  const dateFnsLocale = getDateFnsLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-11/12 max-w-md" showClose>
        <DialogHeader>
          <View className="flex-row items-start gap-3">
            <View className="mt-0.5">
              <AlertTriangle size={22} className="text-yellow-600 dark:text-yellow-400" />
            </View>
            <View className="flex-1">
              <DialogTitle>{i18n.t('intakeLog.nextDoseSoonTitle')}</DialogTitle>
              <DialogDescription>
                {i18n.t('intakeLog.nextDoseSoonDescription', {
                  medicationName,
                  nextTime: format(nextDoseTime, 'PPp', { locale: dateFnsLocale }),
                  minutes: minutesUntilNext,
                })}
              </DialogDescription>
            </View>
          </View>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2">
          <Button onPress={onRescheduleNext} disabled={isLoading}>
            <Text className="font-semibold text-primary-foreground">
              {i18n.t('intakeLog.rescheduleNextDoseAction')}
            </Text>
          </Button>
          <Button variant="outline" onPress={onKeepSchedule} disabled={isLoading}>
            <Text>{i18n.t('intakeLog.keepScheduleAction')}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
