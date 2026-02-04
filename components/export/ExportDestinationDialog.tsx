import { View } from 'react-native';
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
import { FileDown, Share2 } from 'lucide-react-native';
import i18n from '@/lib/i18n';

interface ExportDestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveLocally: () => void;
  onShare: () => void;
}

export function ExportDestinationDialog({
  open,
  onOpenChange,
  onSaveLocally,
  onShare,
}: ExportDestinationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{i18n.t('export.chooseDestination')}</DialogTitle>
          <DialogDescription>
            <Text className="text-sm text-muted-foreground">
              {i18n.t('export.destinationDescription')}
            </Text>
          </DialogDescription>
        </DialogHeader>

        <View className="gap-3 py-4">
          <Button
            variant="default"
            onPress={onSaveLocally}
            className="flex-row items-center justify-center gap-2 py-4">
            <FileDown size={20} className="text-primary-foreground" />
            <Text className="text-base font-semibold text-primary-foreground">
              {i18n.t('export.saveLocally')}
            </Text>
          </Button>

          <Button
            variant="outline"
            onPress={onShare}
            className="flex-row items-center justify-center gap-2 py-4">
            <Share2 size={20} className="text-foreground" />
            <Text className="text-base font-semibold text-foreground">
              {i18n.t('export.shareNow')}
            </Text>
          </Button>
        </View>

        <DialogFooter>
          <Button variant="ghost" onPress={() => onOpenChange(false)} className="flex-1">
            <Text>{i18n.t('common.cancel')}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
