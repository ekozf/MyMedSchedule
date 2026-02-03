import * as React from 'react';
import { View, Pressable, Text, Modal, ScrollView } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { cn } from '@/lib/utils';

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
    
    const selectedOption = options.find(opt => opt.value === value);
    
    return (
      <View ref={ref} className={cn('gap-1.5', className)}>
        {label && (
          <Text className="text-sm font-medium text-foreground">
            {label}
          </Text>
        )}
        
        <Pressable
          onPress={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          className={cn(
            'h-12 rounded-md border border-input bg-background px-4 flex-row items-center justify-between',
            error && 'border-destructive',
            disabled && 'opacity-50'
          )}
        >
          <Text
            className={cn(
              'text-base',
              selectedOption ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {selectedOption?.label || placeholder}
          </Text>
          <ChevronDown size={20} className="text-muted-foreground" />
        </Pressable>
        
        {error && (
          <Text className="text-sm text-destructive">
            {error}
          </Text>
        )}
        
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <Pressable
            className="flex-1 bg-black/50 items-center justify-center p-4"
            onPress={() => setIsOpen(false)}
          >
            <Pressable
              className="bg-background rounded-xl w-full max-w-sm max-h-96 overflow-hidden"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="p-4 border-b border-border">
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
                      'flex-row items-center justify-between p-4 border-b border-border',
                      option.value === value && 'bg-accent'
                    )}
                  >
                    <Text
                      className={cn(
                        'text-base',
                        option.value === value
                          ? 'text-accent-foreground font-medium'
                          : 'text-foreground'
                      )}
                    >
                      {option.label}
                    </Text>
                    {option.value === value && (
                      <Check size={20} className="text-accent-foreground" />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
              
              <Pressable
                onPress={() => setIsOpen(false)}
                className="p-4 border-t border-border"
              >
                <Text className="text-base text-center text-primary font-medium">
                  Cancel
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
