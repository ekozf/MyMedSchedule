import * as React from 'react';
import { Modal, View, Pressable, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { Text } from './text';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export interface DialogContentProps {
  children?: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

export interface DialogHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export interface DialogFooterProps {
  children?: React.ReactNode;
  className?: string;
}

export interface DialogTitleProps {
  children?: React.ReactNode;
  className?: string;
}

export interface DialogDescriptionProps {
  children?: React.ReactNode;
  className?: string;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}) }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({ children }: { children: React.ReactElement }) {
  const { onOpenChange } = React.useContext(DialogContext);
  
  return React.cloneElement(children, {
    onPress: () => onOpenChange(true),
  });
}

function DialogContent({ children, className, showClose = true }: DialogContentProps) {
  const { open, onOpenChange } = React.useContext(DialogContext);
  
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center p-4"
        onPress={() => onOpenChange(false)}
      >
        <Pressable
          className={cn(
            'bg-background rounded-xl w-full max-w-lg p-6 shadow-lg',
            className
          )}
          onPress={(e) => e.stopPropagation()}
        >
          {showClose && (
            <Pressable
              onPress={() => onOpenChange(false)}
              className="absolute right-4 top-4 z-10"
            >
              <X size={24} className="text-muted-foreground" />
            </Pressable>
          )}
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <View className={cn('flex flex-col space-y-2 mb-4', className)}>
      {children}
    </View>
  );
}

function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <View className={cn('flex flex-row justify-end space-x-2 mt-6', className)}>
      {children}
    </View>
  );
}

function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <Text className={cn('text-xl font-semibold text-foreground', className)}>
      {children}
    </Text>
  );
}

function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <Text className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </Text>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
