import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store';
import { createDisclaimerAcknowledgment } from '@/lib/db/operations';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { 
  AlertTriangle, 
  Shield, 
  Lock, 
  FileText, 
  Database,
  Stethoscope,
  Ban,
  AlertCircle,
  FileCheck,
  User,
  CheckSquare,
  Clock,
  Smartphone,
  WifiOff
} from 'lucide-react-native';
import i18n from '@/lib/i18n';

const DISCLAIMER_VERSION = '1.0.0';

export default function DisclaimerScreen() {
  const params = useLocalSearchParams();
  const viewOnly = params.viewOnly === 'true';
  
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setDisclaimerAcknowledged } = useStore();

  const handleContinue = async () => {
    if (!acknowledged) return;
    
    setIsLoading(true);
    
    try {
      // Save disclaimer acknowledgment to database
      const deviceInfo = JSON.stringify({
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        appVersion: Constants.expoConfig?.version,
      });
      
      await createDisclaimerAcknowledgment({
        version: DISCLAIMER_VERSION,
        deviceInfo,
      });
      
      // Update store
      setDisclaimerAcknowledged(true);
      
      // Navigate to auth setup
      router.replace('/(onboarding)/auth-setup');
    } catch (error) {
      console.error('Failed to save disclaimer acknowledgment:', error);
      // Still allow to continue in case of error
      setDisclaimerAcknowledged(true);
      router.replace('/(onboarding)/auth-setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background pt-12">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-3xl font-bold mb-2 text-foreground">
          {i18n.t('disclaimer.title')}
        </Text>
        
        <Text className="text-sm text-muted-foreground mb-6">
          {i18n.t('disclaimer.subtitle')}
        </Text>
        
        {/* Data & Privacy Card */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <View className="flex-row items-center gap-3">
              <Shield size={20} className="text-muted-foreground" />
              <CardTitle className="text-lg">
                {i18n.t('disclaimer.dataPrivacyTitle')}
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row gap-3">
              <Ban size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.dataPrivacy.noDataCollection')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <WifiOff size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.dataPrivacy.fullyLocal')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Lock size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.dataPrivacy.secureStorage')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <FileText size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.dataPrivacy.exportUnencrypted')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Database size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.dataPrivacy.dataLoss')}
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Medical Disclaimer Card */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <View className="flex-row items-center gap-3">
              <AlertTriangle size={20} className="text-destructive" />
              <CardTitle className="text-lg">
                {i18n.t('disclaimer.medicalDisclaimerTitle')}
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row gap-3">
              <Stethoscope size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.medical.notAdvising')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Ban size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.medical.noInstructions')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <AlertCircle size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.medical.noInteractionCheck')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Ban size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.medical.notResponsible')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <FileCheck size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.medical.digitalVersion')}
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* User Responsibility Card */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <View className="flex-row items-center gap-3">
              <User size={20} className="text-muted-foreground" />
              <CardTitle className="text-lg">
                {i18n.t('disclaimer.userResponsibilityTitle')}
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row gap-3">
              <AlertCircle size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.userResponsibility.inputErrors')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <CheckSquare size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.userResponsibility.yourResponsibility')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <User size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.userResponsibility.yourChoice')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <AlertCircle size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.userResponsibility.reminderTool')}
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Technical Considerations Card */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <View className="flex-row items-center gap-3">
              <Smartphone size={20} className="text-muted-foreground" />
              <CardTitle className="text-lg">
                {i18n.t('disclaimer.technicalConsiderationsTitle')}
              </CardTitle>
            </View>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="flex-row gap-3">
              <Clock size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.technical.timeZones')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Smartphone size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.technical.batteryOptimization')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <AlertTriangle size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <Text className="flex-1 text-foreground">
                {i18n.t('disclaimer.technical.clockChanges')}
              </Text>
            </View>
          </CardContent>
        </Card>
        
        {/* Acknowledgment Checkbox */}
        <View className="bg-muted/50 p-4 rounded-lg mb-6">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
            label={i18n.t('disclaimer.acknowledge')}
          />
        </View>
      </ScrollView>
      
      <View className="px-4 pb-8 pt-4 border-t border-border bg-background">
        {viewOnly ? (
          <Button onPress={() => router.back()}>
            <Text className="text-primary-foreground font-semibold">
              {i18n.t('disclaimer.buttonClose')}
            </Text>
          </Button>
        ) : (
          <Button 
            onPress={handleContinue}
            disabled={!acknowledged || isLoading}
          >
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? i18n.t('disclaimer.buttonProcessing') : i18n.t('disclaimer.buttonContinue')}
            </Text>
          </Button>
        )}
      </View>
    </View>
  );
}
