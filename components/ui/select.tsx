import * as React from 'react';
import { View, Pressable, Text, Modal, ScrollView } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import i18n from '@/lib/i18n';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const Select = React.forwardRef<View, SelectProps>(
  (
    {
      options,
      value,
      onValueChange,
      placeholder = 'Select an option',
      label,
      error,
      disabled = false,
      className,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
      <View ref={ref} className={cn('gap-1.5', className)}>
        {label && <Text className="text-sm font-medium text-foreground">{label}</Text>}

        <Pressable
          onPress={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          className={cn(
            'h-12 flex-row items-center justify-between rounded-md border border-input bg-background px-4',
            error && 'border-destructive',
            disabled && 'opacity-50'
          )}>
          <Text
            className={cn(
              'text-base',
              selectedOption ? 'text-foreground' : 'text-muted-foreground'
            )}>
            {selectedOption?.label || placeholder}
          </Text>
          <ChevronDown size={20} className="text-muted-foreground" />
        </Pressable>

        {error && <Text className="text-sm text-destructive">{error}</Text>}

        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}>
          <Pressable
            className="flex-1 items-center justify-center bg-black/50 p-4"
            onPress={() => setIsOpen(false)}>
            <Pressable
              className="max-h-96 w-full max-w-sm overflow-hidden rounded-xl bg-background"
              onPress={(e) => e.stopPropagation()}>
              <View className="border-b border-border p-4">
                <Text className="text-lg font-semibold text-foreground">
                  {label || 'Select an option'}
                </Text>
              </View>

              <ScrollView className="max-h-80">
                {options.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onValueChange?.(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex-row items-center justify-between border-b border-border p-4',
                      option.value === value && 'bg-accent'
                    )}>
                    <Text
                      className={cn(
                        'text-base',
                        option.value === value
                          ? 'font-medium text-accent-foreground'
                          : 'text-foreground'
                      )}>
                      {option.label}
                    </Text>
                    {option.value === value && (
                      <Check size={20} className="text-accent-foreground" />
                    )}
                  </Pressable>
                ))}
              </ScrollView>

              <Pressable onPress={() => setIsOpen(false)} className="border-t border-border p-4">
                <Text className="text-center text-base font-medium text-primary">
                  {i18n.t('common.cancel')}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }
);

Select.displayName = 'Select';

export { Select };
