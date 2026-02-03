import { View, Modal, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { X } from 'lucide-react-native';
import type { ScheduledDose } from '@/lib/schedule/calculator';
import { createIntakeLog } from '@/lib/db/operations';
import { useStore } from '@/store';
import i18n from '@/lib/i18n';

export interface IntakeLogDialogProps {
  visible: boolean;
  dose: ScheduledDose | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function IntakeLogDialog({ visible, dose, onClose, onSuccess }: IntakeLogDialogProps) {
  const { activeProfile } = useStore();
  const [action, setAction] = useState<'taken' | 'skipped' | 'partial'>('taken');
  const [partialAmount, setPartialAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!dose) return null;

  const handleSubmit = async () => {
    if (!activeProfile) return;

    setIsLoading(true);
    try {
      const dosageAmount =
        action === 'partial' && partialAmount
          ? parseFloat(partialAmount)
          : dose.dosageAmount;

      await createIntakeLog({
        medicationId: dose.medicationId,
        profileId: activeProfile.id,
        scheduledTime: dose.time.toISOString(),
        actualTime: new Date().toISOString(),
        action,
        dosageAmount,
        notes: notes || undefined,
      });

      // Reset form
      setAction('taken');
      setPartialAmount('');
      setNotes('');

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to log intake:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-center items-center bg-black/50"
        onPress={onClose}
      >
        <Pressable
          className="bg-background w-11/12 max-w-md rounded-2xl p-6"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-foreground">
              {i18n.t('intakeLog.logIntake')}
            </Text>
            <Pressable onPress={onClose}>
              <X size={24} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Medication Info */}
          <View className="mb-6 p-4 bg-muted rounded-lg">
            <Text className="text-lg font-semibold text-foreground mb-1">
              {dose.medicationName}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {dose.dosageAmount} {dose.dosageUnit}
            </Text>
          </View>

          {/* Action Selection */}
          <Text className="text-sm font-medium text-foreground mb-3">
            {i18n.t('intakeLog.markAsTaken')}
          </Text>
          <View className="flex-row gap-2 mb-6">
            <Button
              variant={action === 'taken' ? 'default' : 'outline'}
              onPress={() => setAction('taken')}
              className="flex-1"
            >
              <Text>{i18n.t('history.actions.taken')}</Text>
            </Button>
            <Button
              variant={action === 'skipped' ? 'default' : 'outline'}
              onPress={() => setAction('skipped')}
              className="flex-1"
            >
              <Text>{i18n.t('history.actions.skipped')}</Text>
            </Button>
            <Button
              variant={action === 'partial' ? 'default' : 'outline'}
              onPress={() => setAction('partial')}
              className="flex-1"
            >
              <Text>{i18n.t('history.actions.partial')}</Text>
            </Button>
          </View>

          {/* Partial Amount Input */}
          {action === 'partial' && (
            <View className="mb-6">
              <Input
                label={i18n.t('intakeLog.amountTaken')}
                value={partialAmount}
                onChangeText={setPartialAmount}
                placeholder={`e.g., ${dose.dosageAmount / 2}`}
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Notes Input */}
          <View className="mb-6">
            <Input
              label={i18n.t('intakeLog.addNotes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={i18n.t('intakeLog.notesPlaceholder')}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <Button onPress={handleSubmit} disabled={isLoading}>
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? i18n.t('common.loading') : i18n.t('common.save')}
            </Text>
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
