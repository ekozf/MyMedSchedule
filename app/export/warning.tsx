import { useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react-native';
import i18n from '@/lib/i18n';

export default function ExportWarningPage() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleConfirm = async () => {
    if (!acknowledged) return;

    setIsExporting(true);
    try {
      // Navigate to destination selection
      router.push('/export/destination');
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ScrollView className="flex-1 bg-background">
        <View className="flex-1 p-6">
          {/* Header Icon and Title */}
          <View className="mb-6 items-center">
            <View className="mb-4 rounded-full bg-destructive/10 p-4">
              <AlertTriangle size={48} className="text-destructive" />
            </View>
            <Text className="text-center text-3xl font-bold text-foreground">
              {i18n.t('export.warningTitle')}
            </Text>
          </View>

          {/* Main Description */}
          <Text className="mb-6 text-center text-lg text-muted-foreground">
            {i18n.t('export.warningDescription')}
          </Text>

          {/* Security Risks Section */}
          <View className="mb-6 rounded-lg bg-destructive/10 p-5">
            <Text className="mb-4 text-2xl font-bold text-destructive">
              {i18n.t('export.securityRisksTitle')}
            </Text>
            <Text className="mb-3 text-lg leading-7 text-foreground">
              • {i18n.t('export.risk1')}
            </Text>
            <Text className="mb-3 text-lg leading-7 text-foreground">
              • {i18n.t('export.risk2')}
            </Text>
            <Text className="mb-3 text-lg leading-7 text-foreground">
              • {i18n.t('export.risk3')}
            </Text>
            <Text className="text-lg leading-7 text-foreground">• {i18n.t('export.risk4')}</Text>
          </View>

          {/* Recommendations Section */}
          <View className="mb-6 rounded-lg bg-primary/10 p-5">
            <Text className="mb-4 text-2xl font-bold text-primary">
              {i18n.t('export.recommendationsTitle')}
            </Text>
            <Text className="mb-3 text-lg leading-7 text-foreground">
              • {i18n.t('export.recommendation1')}
            </Text>
            <Text className="mb-3 text-lg leading-7 text-foreground">
              • {i18n.t('export.recommendation2')}
            </Text>
            <Text className="text-lg leading-7 text-foreground">
              • {i18n.t('export.recommendation3')}
            </Text>
          </View>

          {/* Acknowledgement Checkbox */}
          <View className="mb-8 flex-row items-start gap-3 rounded-lg border-2 border-border bg-card p-5">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
              disabled={isExporting}
            />
            <Text className="flex-1 text-lg leading-7 text-foreground">
              {i18n.t('export.acknowledgement')}
            </Text>
          </View>

          {/* Buttons - Stacked */}
          <View className="gap-4 pb-6">
            <Button
              onPress={handleConfirm}
              disabled={!acknowledged || isExporting}
              className="w-full">
              {isExporting ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-base font-semibold text-white">
                    {i18n.t('export.exporting')}
                  </Text>
                </View>
              ) : (
                <Text className="text-base font-semibold text-white">
                  {i18n.t('export.confirmExport')}
                </Text>
              )}
            </Button>

            <Button
              variant="outline"
              onPress={handleCancel}
              disabled={isExporting}
              className="w-full">
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
