import * as React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const Checkbox = React.forwardRef<View, CheckboxProps>(
  ({ checked = false, onCheckedChange, label, disabled = false, className }, ref) => {
    return (
      <Pressable
        ref={ref}
        onPress={() => !disabled && onCheckedChange?.(!checked)}
        disabled={disabled}
        className={cn('flex-row items-center gap-3', className)}
      >
        <View
          className={cn(
            'h-6 w-6 rounded border-2 border-primary items-center justify-center',
            checked && 'bg-primary',
            disabled && 'opacity-50'
          )}
        >
          {checked && <Check size={16} color="white" strokeWidth={3} />}
        </View>
        {label && (
          <Text className={cn('text-base text-foreground flex-1', disabled && 'opacity-50')}>
            {label}
          </Text>
        )}
      </Pressable>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
