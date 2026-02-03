import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store';
import { createDisclaimerAcknowledgment } from '@/lib/db/operations';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';

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
      <ScrollView className="flex-1 px-6 pt-4">
        <Text className="text-3xl font-bold mb-2 text-foreground">
          Important: Please Read Before Using This App
        </Text>
        
        <Text className="text-sm text-muted-foreground mb-6">
          By using this application, you acknowledge and agree to the following:
        </Text>
        
        {/* Data & Privacy */}
        <Text className="text-xl font-bold mb-3 text-foreground">
          Data & Privacy
        </Text>
        <View className="flex-row mb-2">
          <CheckCircle2 size={20} className="text-green-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            We do not collect any data. Absolutely nothing.
          </Text>
        </View>
        <View className="flex-row mb-2">
          <CheckCircle2 size={20} className="text-green-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            This app is fully local; there is no cloud save or online backup.
          </Text>
        </View>
        <View className="flex-row mb-2">
          <CheckCircle2 size={20} className="text-green-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            Your data is stored securely and encrypted on your device. Nobody else can access it, not even the developer.
          </Text>
        </View>
        <View className="flex-row mb-2">
          <CheckCircle2 size={20} className="text-green-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            Exporting your data puts the data you have saved into that document, and it is completely unencrypted. It is your own responsibility to keep it safe.
          </Text>
        </View>
        <View className="flex-row mb-6">
          <CheckCircle2 size={20} className="text-green-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            Because data is encrypted on your device, if you lose your phone or delete the app, your data is gone forever. We cannot recover it for you. Please use the 'Export Backup' feature regularly.
          </Text>
        </View>
        
        {/* Medical Disclaimer */}
        <Text className="text-xl font-bold mb-3 text-foreground">
          Medical Disclaimer
        </Text>
        <View className="flex-row mb-2">
          <AlertTriangle size={20} className="text-amber-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            We are NOT advising or diagnosing anything. We are just a digital replacement for a paper calendar or diary.
          </Text>
        </View>
        <View className="flex-row mb-2">
          <AlertTriangle size={20} className="text-amber-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            This app does NOT tell you when or what to take. It just reminds you of the things you decided on your own to put in the app.
          </Text>
        </View>
        <View className="flex-row mb-2">
          <AlertTriangle size={20} className="text-amber-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            We do NOT check for interactions between medications or overdose risks.
          </Text>
        </View>
        <View className="flex-row mb-2">
          <AlertTriangle size={20} className="text-amber-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            We are NOT responsible for any medication you do or don't decide to take.
          </Text>
        </View>
        <View className="flex-row mb-6">
          <AlertTriangle size={20} className="text-amber-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            This is strictly a digital version of what you would use to keep track of your medication in real life outside of this app.
          </Text>
        </View>
        
        {/* User Responsibility */}
        <Text className="text-xl font-bold mb-3 text-foreground">
          User Responsibility
        </Text>
        <View className="flex-row mb-2">
          <CheckCircle2 size={20} className="text-blue-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            Just like in real life, making a mistake during an input in the app is your own fault. We are not responsible for faults that you made in the app.
          </Text>
        </View>
        <View className="flex-row mb-2">
          <CheckCircle2 size={20} className="text-blue-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            Anything you put in and mark in the app is fully your own responsibility. We do not guarantee anything by using this app.
          </Text>
        </View>
        <View className="flex-row mb-2">
          <CheckCircle2 size={20} className="text-blue-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            Everything you do and put in the app is your own choice.
          </Text>
        </View>
        <View className="flex-row mb-6">
          <CheckCircle2 size={20} className="text-blue-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            We are just a reminder app. This is strictly a reminder tool.
          </Text>
        </View>
        
        {/* Technical Considerations */}
        <Text className="text-xl font-bold mb-3 text-foreground">
          Technical Considerations
        </Text>
        <View className="flex-row mb-2">
          <AlertTriangle size={20} className="text-amber-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            Reminders/Notifications are based on your phone's current time. If you travel across time zones, your reminders will be based on the current device time.
          </Text>
        </View>
        <View className="flex-row mb-2">
          <AlertTriangle size={20} className="text-amber-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            Android and iOS Battery Optimization settings may delay or suppress notifications. You are responsible for whitelisting this app in your phone's battery settings.
          </Text>
        </View>
        <View className="flex-row mb-8">
          <AlertTriangle size={20} className="text-amber-600 mr-2 mt-0.5" />
          <Text className="text-base flex-1 text-foreground">
            Reminders rely on your device's internal clock. Manually changing your time or date may result in missed or premature reminders.
          </Text>
        </View>
        
        {/* Acknowledgment Checkbox */}
        <View className="bg-muted p-4 rounded-lg mb-6">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
            label="I have read and understand all of the above"
          />
        </View>
      </ScrollView>
      
      <View className="px-6 pb-8 pt-4 border-t border-border bg-background">
        {viewOnly ? (
          <Button onPress={() => router.back()}>
            <Text className="text-primary-foreground font-semibold">Close</Text>
          </Button>
        ) : (
          <Button 
            onPress={handleContinue}
            disabled={!acknowledged || isLoading}
          >
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? 'Processing...' : 'Continue'}
            </Text>
          </Button>
        )}
      </View>
    </View>
  );
}
