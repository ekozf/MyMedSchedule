import { View, ScrollView, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Fingerprint, Lock, ShieldOff } from 'lucide-react-native';
import {
  isDeviceSupportsBiometric,
  getBiometricType,
  setupBiometricAuth,
  setupPINAuth,
  setAuthMethod,
} from '@/lib/auth';
import i18n from '@/lib/i18n';

export default function AuthSetupScreen() {
  const params = useLocalSearchParams();
  const isReconfiguring = params.reconfigure === 'true';
  
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<'biometric' | 'pin' | 'skip' | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await isDeviceSupportsBiometric();
    setBiometricAvailable(available);
    
    if (available) {
      const types = await getBiometricType();
      setBiometricTypes(types);
    }
  };

  const handleBiometricSetup = async () => {
    setIsLoading(true);
    setError('');
    
    const result = await setupBiometricAuth();
    
    if (result.success) {
      if (isReconfiguring) {
        // If reconfiguring from settings, just go back
        router.back();
      } else {
        // If in onboarding flow, continue to profile creation
        router.replace('/(onboarding)/create-profile');
      }
    } else {
      setError(result.error || 'Failed to set up biometric authentication');
    }
    
    setIsLoading(false);
  };

  const handlePINSetup = async () => {
    setError('');
    
    if (pin.length < 4 || pin.length > 6) {
      setError(i18n.t('auth.pinBetween'));
      return;
    }
    
    if (!/^\d+$/.test(pin)) {
      setError(i18n.t('auth.pinNumbersOnly'));
      return;
    }
    
    if (pin !== confirmPin) {
      setError(i18n.t('auth.pinMismatch'));
      return;
    }
    
    setIsLoading(true);
    
    const result = await setupPINAuth(pin);
    
    if (result.success) {
      if (isReconfiguring) {
        // If reconfiguring from settings, just go back
        router.back();
      } else {
        // If in onboarding flow, continue to profile creation
        router.replace('/(onboarding)/create-profile');
      }
    } else {
      setError(result.error || 'Failed to set up PIN');
    }
    
    setIsLoading(false);
  };

  const handleSkip = async () => {
    const message = isReconfiguring
      ? i18n.t('auth.disableAuthWarning')
      : i18n.t('auth.skipAuthWarning');
    
    Alert.alert(
      i18n.t('auth.skipAuthentication'),
      message,
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: isReconfiguring ? i18n.t('auth.disable') : i18n.t('common.skip'),
          style: 'destructive',
          onPress: async () => {
            await setAuthMethod('none');
            if (isReconfiguring) {
              router.back();
            } else {
              router.replace('/(onboarding)/create-profile');
            }
          },
        },
      ]
    );
  };

  const getBiometricLabel = () => {
    if (biometricTypes.includes('face')) return i18n.t('auth.faceId');
    if (biometricTypes.includes('fingerprint')) return i18n.t('auth.fingerprint');
    if (biometricTypes.includes('iris')) return i18n.t('auth.iris');
    return i18n.t('auth.biometric');
  };

  return (
    <View className="flex-1 bg-background pt-12">
      <ScrollView className="flex-1 px-6 pt-4">
        <Text className="text-3xl font-bold mb-2 text-foreground">
          {i18n.t('auth.setupTitle')}
        </Text>
        
        <Text className="text-base text-muted-foreground mb-8">
          {i18n.t('auth.setupDescription')}
        </Text>
        
        {/* Biometric Option */}
        {biometricAvailable && (
          <Card className="mb-4">
            <CardHeader>
              <View className="flex-row items-center gap-3 mb-2">
                <Fingerprint size={24} className="text-primary" />
                <CardTitle>{getBiometricLabel()}</CardTitle>
              </View>
              <CardDescription>
                {i18n.t('auth.biometricDescription', { method: getBiometricLabel() })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onPress={handleBiometricSetup}
                disabled={isLoading || selectedMethod === 'pin'}
              >
                <Text className="text-primary-foreground font-semibold">
                  {i18n.t('auth.setupMethod', { method: getBiometricLabel() })}
                </Text>
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* PIN Option */}
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row items-center gap-3 mb-2">
              <Lock size={24} className="text-primary" />
              <CardTitle>{i18n.t('auth.pinCode')}</CardTitle>
            </View>
            <CardDescription>
              {i18n.t('auth.pinDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedMethod === 'pin' ? (
              <View className="gap-4">
                <Input
                  label={i18n.t('auth.createPin')}
                  value={pin}
                  onChangeText={setPin}
                  placeholder="4-6"
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                />
                <Input
                  label={i18n.t('auth.confirmPin')}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  placeholder={i18n.t('auth.confirmPin')}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  error={error}
                />
                <View className="flex-row gap-2">
                  <Button
                    variant="outline"
                    onPress={() => {
                      setSelectedMethod(null);
                      setPin('');
                      setConfirmPin('');
                      setError('');
                    }}
                    className="flex-1"
                  >
                    <Text>{i18n.t('common.cancel')}</Text>
                  </Button>
                  <Button
                    onPress={handlePINSetup}
                    disabled={isLoading || !pin || !confirmPin}
                    className="flex-1"
                  >
                    <Text className="text-primary-foreground font-semibold">
                      {isLoading ? i18n.t('auth.settingUp') : i18n.t('auth.setPinButton')}
                    </Text>
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                variant="outline"
                onPress={() => setSelectedMethod('pin')}
                disabled={isLoading}
              >
                <Text>{i18n.t('auth.setupPin')}</Text>
              </Button>
            )}
          </CardContent>
        </Card>
        
        {/* Skip Option */}
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row items-center gap-3 mb-2">
              <ShieldOff size={24} className="text-muted-foreground" />
              <CardTitle>{i18n.t('auth.skipForNow')}</CardTitle>
            </View>
            <CardDescription>
              {i18n.t('auth.skipDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text className="text-muted-foreground">
                {i18n.t('auth.skipAuth')}
              </Text>
            </Button>
          </CardContent>
        </Card>
        
        {error && !selectedMethod && (
          <Text className="text-destructive text-center mt-4">
            {error}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
