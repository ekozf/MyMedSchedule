import {
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Animated,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { router } from 'expo-router';
import { useStore } from '@/store';
import { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fingerprint, Lock } from 'lucide-react-native';
import { authenticate, getAuthMethod, verifyPIN, getBiometricType } from '@/lib/auth';
import i18n from '@/lib/i18n';

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const { setAuthenticated } = useStore();
  const [authMethod, setAuthMethodState] = useState<'biometric' | 'pin' | 'none' | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadAuthMethod();

    // Listen to keyboard events
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to make sure content is visible
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  useEffect(() => {
    // If no auth is required, redirect to dashboard
    if (authMethod === 'none') {
      setAuthenticated(true);
      router.replace('/(tabs)/dashboard');
      return;
    }

    // Automatically trigger biometric authentication when loaded
    if (authMethod === 'biometric' && !isLoading) {
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

  // Show loading while checking auth method
  if (authMethod === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerClassName="items-center p-6"
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : 24,
          minHeight: '100%',
          justifyContent: keyboardHeight > 0 ? 'flex-start' : 'center',
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View
          className="w-full max-w-sm items-center"
          style={{ marginTop: keyboardHeight > 0 ? 40 : 0 }}>
          <Text className="mb-4 text-3xl font-bold text-foreground">MyMedSchedule</Text>

          <Text className="mb-12 text-center text-base text-muted-foreground">
            {i18n.t('auth.yourMedicationsProtected')}
          </Text>

          {authMethod === 'biometric' ? (
            <View className="w-full items-center gap-6">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Fingerprint size={48} className="text-primary" />
              </View>

              <Text className="mb-4 text-lg font-medium text-foreground">
                {i18n.t('auth.useToUnlock', { method: biometricLabel })}
              </Text>

              <Button onPress={handleBiometricAuth} disabled={isLoading} className="w-full">
                <Text className="font-semibold text-primary-foreground">
                  {isLoading
                    ? i18n.t('auth.authenticating')
                    : i18n.t('auth.unlockWith', { method: biometricLabel })}
                </Text>
              </Button>

              {error && <Text className="mt-4 text-center text-destructive">{error}</Text>}
            </View>
          ) : (
            <View className="w-full gap-6">
              <View className="mb-4 items-center">
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
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

              <Button onPress={handlePINAuth} disabled={isLoading || !pin}>
                <Text className="font-semibold text-primary-foreground">
                  {isLoading ? i18n.t('auth.verifying') : i18n.t('auth.unlock')}
                </Text>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
