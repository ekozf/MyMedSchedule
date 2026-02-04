import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { AppState } from 'react-native';
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

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const { loadAppState } = useStore();

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

  return (
    <SafeAreaProvider>
      <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Slot />
        <PortalHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
