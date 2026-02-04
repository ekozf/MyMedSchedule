import {
  View,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Keyboard,
  Platform,
  KeyboardEvent,
  Dimensions,
  TextInput,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useState, useEffect, useRef } from 'react';
import { X, Package, Plus, Minus, Edit3 } from 'lucide-react-native';
import { updateMedicationInventory, getMedicationById } from '@/lib/db/operations';
import { scheduleRefillReminder } from '@/lib/notifications/scheduler';
import { useStore } from '@/store';
import i18n from '@/lib/i18n';
import type { Medication } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface InventoryManagerProps {
  visible: boolean;
  medication: Medication | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function InventoryManager({
  visible,
  medication,
  onClose,
  onSuccess,
}: InventoryManagerProps) {
  const insets = useSafeAreaInsets();
  const { activeProfile, loadMedications } = useStore();
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const activeInputRef = useRef<TextInput | null>(null);
  const inputRefs = useRef<Map<string, TextInput>>(new Map());
  const currentScrollY = useRef(0);

  const setInputRef = (key: string) => (ref: TextInput | null) => {
    if (ref) {
      inputRefs.current.set(key, ref);
    }
  };

  const handleInputFocus = (key: string) => () => {
    const inputRef = inputRefs.current.get(key);
    if (!inputRef) return;

    activeInputRef.current = inputRef;

    // Wait for keyboard to show before measuring and scrolling
    setTimeout(
      () => {
        if (!inputRef || keyboardHeight === 0) return;

        // Measure input position in window
        inputRef.measureInWindow((x, y, width, height) => {
          const windowHeight = Dimensions.get('window').height;
          const inputBottom = y + height;

          // Calculate the visible area (bottom of screen minus keyboard)
          const visibleScreenBottom = windowHeight - keyboardHeight;

          // Add margin above keyboard (50px buffer)
          const targetBottom = visibleScreenBottom - 50;

          // Check if input would be covered by keyboard
          if (inputBottom > targetBottom) {
            // Calculate how much we need to scroll down
            // Add input height + extra margin to ensure full input is visible
            const scrollDownAmount = inputBottom - targetBottom + height + 20;

            // Add to current scroll position
            const newScrollY = currentScrollY.current + scrollDownAmount;

            scrollViewRef.current?.scrollTo({
              y: Math.max(0, newScrollY),
              animated: true,
            });
          }
        });
      },
      Platform.OS === 'ios' ? 100 : 300
    );
  };

  useEffect(() => {
    // Listen to keyboard events
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Re-check active input position after keyboard is shown
        if (activeInputRef.current) {
          const inputRef = activeInputRef.current;
          setTimeout(() => {
            if (!inputRef) return;
            inputRef.measureInWindow((x, y, width, height) => {
              const windowHeight = Dimensions.get('window').height;
              const inputBottom = y + height;
              const visibleScreenBottom = windowHeight - e.endCoordinates.height;
              const targetBottom = visibleScreenBottom - 50;
              if (inputBottom > targetBottom) {
                const scrollDownAmount = inputBottom - targetBottom + height + 20;
                const newScrollY = currentScrollY.current + scrollDownAmount;
                scrollViewRef.current?.scrollTo({
                  y: Math.max(0, newScrollY),
                  animated: true,
                });
              }
            });
          }, 100);
        }
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        activeInputRef.current = null;
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

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
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[85%] rounded-t-3xl bg-background">
          <ScrollView
            ref={scrollViewRef}
            className="p-6"
            contentContainerStyle={{
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : insets.bottom + 24,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              currentScrollY.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}>
            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
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
                <Text className="mb-1 text-lg font-semibold text-foreground">
                  {medication.name}
                </Text>
                <Text className="mb-2 text-3xl font-bold text-primary">
                  {medication.inventoryCount} {i18n.t(`medications.units.${medication.dosageUnit}`)}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {i18n.t('inventory.currentCount')}
                </Text>
              </CardContent>
            </Card>

            {/* Adjustment Type Selection */}
            <Text className="mb-3 text-sm font-medium text-foreground">
              {i18n.t('inventory.adjustInventory')}
            </Text>
            <View className="mb-6 flex-row gap-2">
              <Button
                variant={adjustmentType === 'add' ? 'default' : 'outline'}
                onPress={() => setAdjustmentType('add')}
                className="flex-1 flex-row gap-2">
                <Plus
                  size={16}
                  className={
                    adjustmentType === 'add' ? 'text-primary-foreground' : 'text-foreground'
                  }
                />
                <Text>{i18n.t('inventory.addDoses')}</Text>
              </Button>
              <Button
                variant={adjustmentType === 'remove' ? 'default' : 'outline'}
                onPress={() => setAdjustmentType('remove')}
                className="flex-1 flex-row gap-2">
                <Minus
                  size={16}
                  className={
                    adjustmentType === 'remove' ? 'text-primary-foreground' : 'text-foreground'
                  }
                />
                <Text>{i18n.t('inventory.removeDoses')}</Text>
              </Button>
              <Button
                variant={adjustmentType === 'set' ? 'default' : 'outline'}
                onPress={() => setAdjustmentType('set')}
                className="flex-1 flex-row gap-2">
                <Edit3
                  size={16}
                  className={
                    adjustmentType === 'set' ? 'text-primary-foreground' : 'text-foreground'
                  }
                />
                <Text>{i18n.t('inventory.setCount')}</Text>
              </Button>
            </View>

            {/* Amount Input */}
            <View className="mb-4">
              <Input
                ref={setInputRef('amount')}
                label={i18n.t('inventory.amount')}
                value={amount}
                onChangeText={setAmount}
                placeholder={i18n.t('inventory.amountPlaceholder')}
                keyboardType="decimal-pad"
                onFocus={handleInputFocus('amount')}
              />
            </View>

            {/* Quick Add Full Package */}
            {medication.packageSize && adjustmentType === 'add' && (
              <Button variant="outline" onPress={handleAddFullPackage} className="mb-4">
                <Text>
                  {i18n.t('inventory.addFullPackage', {
                    size: medication.packageSize,
                    unit: i18n.t(`medications.units.${medication.dosageUnit}`),
                  })}
                </Text>
              </Button>
            )}

            {/* Reason Input */}
            <View className="mb-6">
              <Input
                ref={setInputRef('reason')}
                label={i18n.t('inventory.reason')}
                value={reason}
                onChangeText={setReason}
                placeholder={i18n.t('inventory.reasonPlaceholder')}
                multiline
                numberOfLines={2}
                onFocus={handleInputFocus('reason')}
              />
            </View>

            {/* Preview */}
            {amount && !isNaN(parseFloat(amount)) && (
              <Card className="mb-6 bg-primary/10">
                <CardContent className="p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">
                      {i18n.t('inventory.currentCount')}:
                    </Text>
                    <Text className="text-lg font-semibold text-foreground">
                      {medication.inventoryCount}{' '}
                      {i18n.t(`medications.units.${medication.dosageUnit}`)}
                    </Text>
                  </View>
                  <View className="my-2 h-px bg-border" />
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-foreground">
                      {i18n.t('inventory.newCount')}:
                    </Text>
                    <Text className="text-2xl font-bold text-primary">
                      {newCount} {i18n.t(`medications.units.${medication.dosageUnit}`)}
                    </Text>
                  </View>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button onPress={handleSubmit} disabled={isLoading || !amount} className="mb-4">
              <Text className="font-semibold text-primary-foreground">
                {isLoading ? i18n.t('common.loading') : i18n.t('common.save')}
              </Text>
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
