import { useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react-native';
import i18n from '@/lib/i18n';

interface ExportWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isExporting?: boolean;
}

export function ExportWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  isExporting = false,
}: ExportWarningDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleConfirm = async () => {
    if (!acknowledged) return;

    try {
      await onConfirm();
      // Reset state
      setAcknowledged(false);
    } catch (error) {
      console.error('Export error:', error);
      // Keep dialog open on error
    }
  };

  const handleCancel = () => {
    setAcknowledged(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <View className="mb-3 flex-row items-center gap-2">
            <AlertTriangle size={24} className="text-destructive" />
            <DialogTitle>{i18n.t('export.warningTitle')}</DialogTitle>
          </View>
          <DialogDescription>
            <ScrollView className="max-h-60">
              <Text className="mb-3 text-sm text-muted-foreground">
                {i18n.t('export.warningDescription')}
              </Text>

              <View className="mb-3 rounded-lg bg-destructive/10 p-3">
                <Text className="mb-2 text-sm font-semibold text-destructive">
                  {i18n.t('export.securityRisksTitle')}
                </Text>
                <Text className="mb-1 text-xs text-muted-foreground">
                  • {i18n.t('export.risk1')}
                </Text>
                <Text className="mb-1 text-xs text-muted-foreground">
                  • {i18n.t('export.risk2')}
                </Text>
                <Text className="mb-1 text-xs text-muted-foreground">
                  • {i18n.t('export.risk3')}
                </Text>
                <Text className="text-xs text-muted-foreground">• {i18n.t('export.risk4')}</Text>
              </View>

              <View className="mb-3 rounded-lg bg-primary/10 p-3">
                <Text className="mb-2 text-sm font-semibold text-primary">
                  {i18n.t('export.recommendationsTitle')}
                </Text>
                <Text className="mb-1 text-xs text-muted-foreground">
                  • {i18n.t('export.recommendation1')}
                </Text>
                <Text className="mb-1 text-xs text-muted-foreground">
                  • {i18n.t('export.recommendation2')}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  • {i18n.t('export.recommendation3')}
                </Text>
              </View>

              <View className="flex-row items-start gap-2 rounded-lg border border-border p-3">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
                  disabled={isExporting}
                />
                <Text className="flex-1 text-xs text-foreground">
                  {i18n.t('export.acknowledgement')}
                </Text>
              </View>
            </ScrollView>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onPress={handleCancel}
            className="flex-1"
            disabled={isExporting}>
            <Text>{i18n.t('common.cancel')}</Text>
          </Button>
          <Button
            onPress={handleConfirm}
            className="flex-1"
            disabled={!acknowledged || isExporting}>
            {isExporting ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-primary-foreground">{i18n.t('export.exporting')}</Text>
              </View>
            ) : (
              <Text className="text-primary-foreground">{i18n.t('export.confirmExport')}</Text>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
