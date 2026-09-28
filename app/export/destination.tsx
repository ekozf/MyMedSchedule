import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { FileDown, Share2 } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Icon } from '@/components/ui/icon';
import { useStore } from '@/store';
import { generatePDFReport, sharePDFReport, savePDFReportLocally } from '@/lib/export/pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExportDestinationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const activeProfile = useStore((state) => state.activeProfile);
  const insets = useSafeAreaInsets();

  const handleSaveLocally = async () => {
    if (!activeProfile) {
      Alert.alert(i18n.t('common.error'), 'No active profile found');
      return;
    }

    setIsLoading(true);
    try {
      // Generate PDF
      const pdfUri = await generatePDFReport(activeProfile.id);

      // Save locally
      const message = await savePDFReportLocally(pdfUri, activeProfile.name);

      Alert.alert(i18n.t('common.success'), message, [
        {
          text: i18n.t('common.ok'),
          onPress: () => router.replace('/you'),
        },
      ]);
    } catch (error) {
      console.error('Failed to save PDF:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('export.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!activeProfile) {
      Alert.alert(i18n.t('common.error'), 'No active profile found');
      return;
    }

    setIsLoading(true);
    try {
      // Generate PDF
      const pdfUri = await generatePDFReport(activeProfile.id);

      // Share
      await sharePDFReport(pdfUri);

      // Navigate back after sharing dialog closes
      router.replace('/you');
    } catch (error) {
      console.error('Failed to share PDF:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('export.shareError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.replace('/you');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ScrollView className="flex-1 bg-background" style={{ paddingTop: insets.top + 24 }}>
        <View className="flex-1 p-6">
          {/* Header */}
          <View className="mb-8 items-center">
            <Text className="mb-4 text-center text-3xl font-bold text-foreground">
              {i18n.t('export.chooseDestination')}
            </Text>
            <Text className="text-center text-lg leading-7 text-muted-foreground">
              {i18n.t('export.destinationDescription')}
            </Text>
          </View>

          {/* Action Buttons - Stacked */}
          <View className="mb-8 gap-4">
            <Button
              variant="default"
              onPress={handleSaveLocally}
              disabled={isLoading}
              className="w-full flex-row items-center justify-center gap-3">
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Icon as={FileDown} size={24} className="text-white" />
                  <Text className="text-base font-bold text-white">
                    {i18n.t('export.saveLocally')}
                  </Text>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onPress={handleShare}
              disabled={isLoading}
              className="w-full flex-row items-center justify-center gap-3">
              {isLoading ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Icon as={Share2} size={24} className="text-foreground" />
                  <Text className="text-base font-bold text-foreground">
                    {i18n.t('export.shareNow')}
                  </Text>
                </>
              )}
            </Button>
          </View>

          {/* Cancel Button */}
          <View className="gap-4 pb-6">
            <Button variant="ghost" onPress={handleCancel} disabled={isLoading} className="w-full">
              <Text className="text-base font-semibold text-foreground">
                {i18n.t('common.cancel')}
              </Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
