import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { initDatabase } from '@/lib/db';
import { useStore } from '@/store';
import * as Notifications from 'expo-notifications';
import {
  setupNotificationHandler,
  setupNotificationCategories,
  handleNotificationResponse,
} from '@/lib/notifications';

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
        await initDatabase();
        await loadAppState();
        
        // Setup notifications
        setupNotificationHandler();
        await setupNotificationCategories();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    init();

    // Listen for notification responses
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Slot />
      <PortalHost />
    </ThemeProvider>
  );
}
