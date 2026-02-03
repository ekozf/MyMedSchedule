import { View, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { X, Package, Plus, Minus, Edit3 } from 'lucide-react-native';
import { updateMedicationInventory, getMedicationById } from '@/lib/db/operations';
import { scheduleRefillReminder } from '@/lib/notifications/scheduler';
import { useStore } from '@/store';
import i18n from '@/lib/i18n';
import type { Medication } from '@/types';

export interface InventoryManagerProps {
  visible: boolean;
  medication: Medication | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function InventoryManager({ visible, medication, onClose, onSuccess }: InventoryManagerProps) {
  const { activeProfile, loadMedications } = useStore();
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!medication) return null;

  const handleSubmit = async () => {
    if (!activeProfile) return;

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.invalidInput'));
      return;
    }

    setIsLoading(true);
    try {
      let newCount = medication.inventoryCount;

      switch (adjustmentType) {
        case 'add':
          newCount = medication.inventoryCount + amountNum;
          break;
        case 'remove':
          newCount = Math.max(0, medication.inventoryCount - amountNum);
          break;
        case 'set':
          newCount = amountNum;
          break;
      }

      await updateMedicationInventory(medication.id, newCount);

      // Reschedule refill reminder with new inventory count
      const updatedMed = await getMedicationById(medication.id);
      if (updatedMed) {
        await scheduleRefillReminder(updatedMed);
      }

      // TODO: Log adjustment in inventory_adjustments table when implemented
      // await createInventoryAdjustment({
      //   medicationId: medication.id,
      //   adjustmentType,
      //   amount: amountNum,
      //   previousCount: medication.inventoryCount,
      //   newCount,
      //   reason: reason || undefined,
      // });

      // Reload medications
      await loadMedications(activeProfile.id);

      // Reset form
      setAmount('');
      setReason('');
      setAdjustmentType('add');

      Alert.alert(i18n.t('common.success'), i18n.t('inventory.adjustmentSuccess'));
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to adjust inventory:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('inventory.adjustmentError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFullPackage = () => {
    if (medication.packageSize) {
      setAmount(medication.packageSize.toString());
      setAdjustmentType('add');
      setReason(i18n.t('inventory.refill'));
    }
  };

  const calculateNewCount = () => {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum)) return medication.inventoryCount;

    switch (adjustmentType) {
      case 'add':
        return medication.inventoryCount + amountNum;
      case 'remove':
        return Math.max(0, medication.inventoryCount - amountNum);
      case 'set':
        return amountNum;
      default:
        return medication.inventoryCount;
    }
  };

  const newCount = calculateNewCount();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <Pressable 
          className="flex-1"
          onPress={onClose}
        />
        <View className="bg-background rounded-t-3xl max-h-[85%]">
          <ScrollView className="p-6">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center gap-2">
                <Package size={24} className="text-foreground" />
                <Text className="text-2xl font-bold text-foreground">
                  {i18n.t('inventory.title')}
                </Text>
              </View>
              <Pressable onPress={onClose}>
                <X size={24} className="text-muted-foreground" />
              </Pressable>
            </View>

            {/* Medication Info */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <Text className="text-lg font-semibold text-foreground mb-1">
                  {medication.name}
                </Text>
                <Text className="text-3xl font-bold text-primary mb-2">
                  {medication.inventoryCount} {medication.dosageUnit}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {i18n.t('inventory.currentCount')}
                </Text>
              </CardContent>
            </Card>

            {/* Adjustment Type Selection */}
            <Text className="text-sm font-medium text-foreground mb-3">
              {i18n.t('inventory.adjustInventory')}
            </Text>
            <View className="flex-row gap-2 mb-6">
              <Button
                variant={adjustmentType === 'add' ? 'default' : 'outline'}
                onPress={() => setAdjustmentType('add')}
                className="flex-1 flex-row gap-2"
              >
                <Plus size={16} className={adjustmentType === 'add' ? 'text-primary-foreground' : 'text-foreground'} />
                <Text>{i18n.t('inventory.addDoses')}</Text>
              </Button>
              <Button
                variant={adjustmentType === 'remove' ? 'default' : 'outline'}
                onPress={() => setAdjustmentType('remove')}
                className="flex-1 flex-row gap-2"
              >
                <Minus size={16} className={adjustmentType === 'remove' ? 'text-primary-foreground' : 'text-foreground'} />
                <Text>{i18n.t('inventory.removeDoses')}</Text>
              </Button>
              <Button
                variant={adjustmentType === 'set' ? 'default' : 'outline'}
                onPress={() => setAdjustmentType('set')}
                className="flex-1 flex-row gap-2"
              >
                <Edit3 size={16} className={adjustmentType === 'set' ? 'text-primary-foreground' : 'text-foreground'} />
                <Text>{i18n.t('inventory.setCount')}</Text>
              </Button>
            </View>

            {/* Amount Input */}
            <View className="mb-4">
              <Input
                label={i18n.t('inventory.amount')}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Quick Add Full Package */}
            {medication.packageSize && adjustmentType === 'add' && (
              <Button
                variant="outline"
                onPress={handleAddFullPackage}
                className="mb-4"
              >
                <Text>
                  {i18n.t('inventory.addFullPackage', { 
                    size: medication.packageSize, 
                    unit: medication.dosageUnit 
                  })}
                </Text>
              </Button>
            )}

            {/* Reason Input */}
            <View className="mb-6">
              <Input
                label={i18n.t('inventory.reason')}
                value={reason}
                onChangeText={setReason}
                placeholder={i18n.t('inventory.reasonPlaceholder')}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Preview */}
            {amount && !isNaN(parseFloat(amount)) && (
              <Card className="mb-6 bg-primary/10">
                <CardContent className="p-4">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm text-muted-foreground">
                      {i18n.t('inventory.currentCount')}:
                    </Text>
                    <Text className="text-lg font-semibold text-foreground">
                      {medication.inventoryCount} {medication.dosageUnit}
                    </Text>
                  </View>
                  <View className="h-px bg-border my-2" />
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm font-medium text-foreground">
                      New count:
                    </Text>
                    <Text className="text-2xl font-bold text-primary">
                      {newCount} {medication.dosageUnit}
                    </Text>
                  </View>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button onPress={handleSubmit} disabled={isLoading || !amount} className="mb-4">
              <Text className="text-primary-foreground font-semibold">
                {isLoading ? i18n.t('common.loading') : i18n.t('common.save')}
              </Text>
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
