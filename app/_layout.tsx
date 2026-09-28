import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '@/lib/db';
import { useStore } from '@/store';
import * as Notifications from 'expo-notifications';
import {
  setupNotificationHandler,
  setupNotificationCategories,
  handleNotificationResponse,
} from '@/lib/notifications';
import { ensureNext3DoseNotificationsForAllActiveMedications } from '@/lib/notifications/scheduler';
import { registerNext3UpkeepTask } from '@/lib/notifications/upkeep';
import { initializeLocale } from '@/lib/i18n';
import { useLocaleVersion } from '@/lib/ui/use-locale';
import {
  ActionSheetProvider,
  ConfirmProvider,
  GradientBackground,
  ToastProvider,
} from '@/components/ds';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const { loadAppState } = useStore();
  // Bumps on setLocale(); used as a key below so every screen re-renders its i18n strings.
  const localeVersion = useLocaleVersion();

  useEffect(() => {
    // Initialize database and load app state
    const init = async () => {
      try {
        // Initialize language first so all UI text appears in the correct language
        await initializeLocale();

        await initDatabase();
        await loadAppState();

        // Setup notifications
        setupNotificationHandler();
        await setupNotificationCategories();

        // Best-effort upkeep: top up next-3 at app start
        await ensureNext3DoseNotificationsForAllActiveMedications();
        await registerNext3UpkeepTask();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    init();

    // Listen for notification responses
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // App foreground (best-effort): when app becomes active, top up next-3 for all active meds
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        ensureNext3DoseNotificationsForAllActiveMedications();
      }
    });

    return () => {
      subscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={NAV_THEME[scheme]}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <ToastProvider>
            <ConfirmProvider>
              <ActionSheetProvider>
                <View style={{ flex: 1 }}>
                  <GradientBackground />
                  {/*
                   * Remounted on locale change so all i18n.t() calls re-run. The init effect above
                   * lives outside this subtree and does not re-run. React Navigation keeps the
                   * navigation state in the container, so a remounted navigator rehydrates the
                   * current route stack instead of resetting it.
                   */}
                  <RootStack key={`locale-${localeVersion}`} />
                </View>
                <PortalHost />
              </ActionSheetProvider>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Screen name="medication" />
      <Stack.Screen name="profile/create" />
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="you" options={{ presentation: 'modal' }} />
      <Stack.Screen name="export" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="log"
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}
