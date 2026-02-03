import { View, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { router } from 'expo-router';
import { useStore } from '@/store';
import { useState, useEffect } from 'react';
import { Fingerprint, Lock } from 'lucide-react-native';
import {
  authenticate,
  getAuthMethod,
  verifyPIN,
  getBiometricType,
} from '@/lib/auth';
import i18n from '@/lib/i18n';

export default function LockScreen() {
  const { setAuthenticated } = useStore();
  const [authMethod, setAuthMethodState] = useState<'biometric' | 'pin' | 'none'>('none');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');

  useEffect(() => {
    loadAuthMethod();
  }, []);

  useEffect(() => {
    if (authMethod === 'biometric') {
      // Automatically trigger biometric authentication
      handleBiometricAuth();
    }
  }, [authMethod]);

  const loadAuthMethod = async () => {
    const method = await getAuthMethod();
    setAuthMethodState(method);
    
    if (method === 'biometric') {
      const types = await getBiometricType();
      if (types.includes('face')) setBiometricLabel(i18n.t('auth.faceId'));
      else if (types.includes('fingerprint')) setBiometricLabel(i18n.t('auth.fingerprint'));
      else if (types.includes('iris')) setBiometricLabel(i18n.t('auth.iris'));
      else setBiometricLabel(i18n.t('auth.biometric'));
    }
  };

  const handleBiometricAuth = async () => {
    setIsLoading(true);
    setError('');
    
    const result = await authenticate({
      promptMessage: i18n.t('auth.biometricPrompt'),
    });
    
    if (result.success) {
      setAuthenticated(true);
      router.replace('/(tabs)/dashboard');
    } else {
      setError(result.error || i18n.t('auth.authFailed'));
    }
    
    setIsLoading(false);
  };

  const handlePINAuth = async () => {
    setError('');
    
    if (!pin) {
      setError(i18n.t('auth.enterPin'));
      return;
    }
    
    setIsLoading(true);
    
    const isValid = await verifyPIN(pin);
    
    if (isValid) {
      setAuthenticated(true);
      router.replace('/(tabs)/dashboard');
    } else {
      setError(i18n.t('auth.incorrectPin'));
      setPin('');
    }
    
    setIsLoading(false);
  };

  if (authMethod === 'none') {
    // No auth required, redirect immediately
    setAuthenticated(true);
    router.replace('/(tabs)/dashboard');
    return null;
  }

  return (
    <View className="flex-1 bg-background items-center justify-center p-6">
      <Text className="text-3xl font-bold mb-4 text-foreground">
        MyMedSchedule
      </Text>
      
      <Text className="text-base text-muted-foreground mb-12 text-center">
        {i18n.t('auth.yourMedicationsProtected')}
      </Text>
      
      {authMethod === 'biometric' ? (
        <View className="items-center gap-6 w-full max-w-sm">
          <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
            <Fingerprint size={48} className="text-primary" />
          </View>
          
          <Text className="text-lg font-medium text-foreground mb-4">
            {i18n.t('auth.useToUnlock', { method: biometricLabel })}
          </Text>
          
          <Button
            onPress={handleBiometricAuth}
            disabled={isLoading}
            className="w-full"
          >
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? i18n.t('auth.authenticating') : i18n.t('auth.unlockWith', { method: biometricLabel })}
            </Text>
          </Button>
          
          {error && (
            <Text className="text-destructive text-center mt-4">
              {error}
            </Text>
          )}
        </View>
      ) : (
        <View className="w-full max-w-sm gap-6">
          <View className="items-center mb-4">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Lock size={48} className="text-primary" />
            </View>
            <Text className="text-lg font-medium text-foreground">
              {i18n.t('auth.enterYourPin')}
            </Text>
          </View>
          
          <Input
            value={pin}
            onChangeText={setPin}
            placeholder={i18n.t('auth.enterPin')}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            error={error}
            autoFocus
            onSubmitEditing={handlePINAuth}
          />
          
          <Button
            onPress={handlePINAuth}
            disabled={isLoading || !pin}
          >
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? i18n.t('auth.verifying') : i18n.t('auth.unlock')}
            </Text>
          </Button>
        </View>
      )}
    </View>
  );
}
