import { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isAfter, setHours, setMinutes } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import i18n from '@/lib/i18n';

export interface RescheduleNextDoseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  now: Date;
  onConfirm: (selectedTime: Date) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RescheduleNextDoseDialog({
  open,
  onOpenChange,
  now,
  onConfirm,
  onCancel,
  isLoading,
}: RescheduleNextDoseDialogProps) {
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [pickedTime, setPickedTime] = useState<Date | null>(null); // date portion ignored; hours/minutes used
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState<Date>(now);
  const [timeDraft, setTimeDraft] = useState<Date>(now);

  const selectedTime = useMemo(() => {
    if (!pickedDate || !pickedTime) return null;
    const hours = pickedTime.getHours();
    const minutes = pickedTime.getMinutes();
    return setMinutes(setHours(new Date(pickedDate), hours), minutes);
  }, [pickedDate, pickedTime]);

  const timeLabel = useMemo(() => {
    if (!selectedTime) return i18n.t('intakeLog.noTimeSelected');
    return format(selectedTime, 'MMM d, yyyy • HH:mm');
  }, [selectedTime]);

  const canConfirm = Boolean(selectedTime && isAfter(selectedTime, now));

  const resetState = () => {
    setPickedDate(null);
    setPickedTime(null);
    setIsDatePickerOpen(false);
    setIsTimePickerOpen(false);
    setDateDraft(now);
    setTimeDraft(now);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-11/12 max-w-md" showClose>
        <DialogHeader>
          <DialogTitle>{i18n.t('intakeLog.rescheduleNextDoseTitle')}</DialogTitle>
          <DialogDescription>{i18n.t('intakeLog.rescheduleNextDoseDescription')}</DialogDescription>
        </DialogHeader>

        <View className="gap-3">
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              onPress={() => {
                setIsDatePickerOpen(true);
                setIsTimePickerOpen(false);
                setDateDraft(now);
              }}
              disabled={isLoading}
              className="flex-1"
            >
              <Text>{i18n.t('intakeLog.selectDate')}</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                setIsTimePickerOpen(true);
                setIsDatePickerOpen(false);
                setTimeDraft(now);
              }}
              disabled={isLoading}
              className="flex-1"
            >
              <Text>{i18n.t('intakeLog.selectTime')}</Text>
            </Button>
          </View>

          <View className="rounded-lg bg-muted px-3 py-2">
            <Text className="text-sm text-muted-foreground">{timeLabel}</Text>
          </View>

          {selectedTime && !isAfter(selectedTime, now) && (
            <Text className="text-sm text-destructive">{i18n.t('intakeLog.rescheduleTimeInvalidPast')}</Text>
          )}

          {isDatePickerOpen && (
            <View className="rounded-xl overflow-hidden">
              <DateTimePicker
                value={dateDraft}
                mode="date"
                onChange={(event, date) => {
                  if (!date) return;
                  if (Platform.OS === 'android') {
                    if (event.type === 'dismissed') {
                      setIsDatePickerOpen(false);
                      return;
                    }
                    setPickedDate(date);
                    setIsDatePickerOpen(false);
                    return;
                  }
                  setDateDraft(date);
                }}
              />
              {Platform.OS === 'ios' && (
                <Button
                  variant="outline"
                  onPress={() => {
                    setPickedDate(dateDraft);
                    setIsDatePickerOpen(false);
                  }}
                  className="mt-2"
                  disabled={isLoading}
                >
                  <Text>{i18n.t('common.confirm')}</Text>
                </Button>
              )}
            </View>
          )}

          {isTimePickerOpen && (
            <View className="rounded-xl overflow-hidden">
              <DateTimePicker
                value={timeDraft}
                mode="time"
                is24Hour
                onChange={(event, date) => {
                  if (!date) return;
                  if (Platform.OS === 'android') {
                    if (event.type === 'dismissed') {
                      setIsTimePickerOpen(false);
                      return;
                    }
                    setPickedTime(date);
                    setIsTimePickerOpen(false);
                    return;
                  }
                  setTimeDraft(date);
                }}
              />
              {Platform.OS === 'ios' && (
                <Button
                  variant="outline"
                  onPress={() => {
                    setPickedTime(timeDraft);
                    setIsTimePickerOpen(false);
                  }}
                  className="mt-2"
                  disabled={isLoading}
                >
                  <Text>{i18n.t('common.confirm')}</Text>
                </Button>
              )}
            </View>
          )}
        </View>

        <DialogFooter className="flex-col gap-2">
          <Button
            onPress={() => {
              if (!selectedTime) return;
              onConfirm(selectedTime);
            }}
            disabled={isLoading || !canConfirm}
          >
            <Text className="text-primary-foreground font-semibold">{i18n.t('intakeLog.rescheduleConfirm')}</Text>
          </Button>
          <Button variant="outline" onPress={onCancel} disabled={isLoading}>
            <Text>{i18n.t('common.cancel')}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

