import '@/global.css';

import { NAV_THEME, palette, setFontsLoaded } from '@/lib/theme';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
// Per-weight imports so only the five weights we use are bundled.
import { AtkinsonHyperlegibleNext_400Regular } from '@expo-google-fonts/atkinson-hyperlegible-next/400Regular';
import { AtkinsonHyperlegibleNext_500Medium } from '@expo-google-fonts/atkinson-hyperlegible-next/500Medium';
import { AtkinsonHyperlegibleNext_600SemiBold } from '@expo-google-fonts/atkinson-hyperlegible-next/600SemiBold';
import { AtkinsonHyperlegibleNext_700Bold } from '@expo-google-fonts/atkinson-hyperlegible-next/700Bold';
import { AtkinsonHyperlegibleNext_800ExtraBold } from '@expo-google-fonts/atkinson-hyperlegible-next/800ExtraBold';
import { ThemeProvider } from '@react-navigation/native';
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
import { applyAppearance } from '@/lib/settings/appearance';
import { useLocaleVersion } from '@/lib/ui/use-locale';
import { ActionSheetProvider, ConfirmProvider, OverlayHost, ToastProvider } from '@/components/ds';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Keep the splash screen up until the bundled fonts are ready (or failed to load).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const { loadAppState } = useStore();
  // Appearance (System / Light / Dark) of the person in use, applied at start and on change.
  const appearance = useStore((s) => s.activeProfile?.settings?.appearance);
  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);
  // Bumps on setLocale(); used as a key below so every screen re-renders its i18n strings.
  const localeVersion = useLocaleVersion();
  // Bundled font files (no network). The family names match `fontFamily` in lib/theme.ts.
  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_500Medium,
    AtkinsonHyperlegibleNext_600SemiBold,
    AtkinsonHyperlegibleNext_700Bold,
    AtkinsonHyperlegibleNext_800ExtraBold,
  });
  const fontsReady = fontsLoaded || !!fontError;
  // On failure Text falls back to the system font.
  setFontsLoaded(fontsLoaded && !fontError);

  useEffect(() => {
    if (fontError) console.warn('Fonts failed to load, using the system font:', fontError);
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, fontError]);

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

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={NAV_THEME[scheme]}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <ToastProvider>
            <ConfirmProvider>
              <ActionSheetProvider>
                <View style={{ flex: 1, backgroundColor: palette[scheme].bg }}>
                  {/*
                   * Remounted on locale change so all i18n.t() calls re-run. The init effect above
                   * lives outside this subtree and does not re-run. React Navigation keeps the
                   * navigation state in the container, so a remounted navigator rehydrates the
                   * current route stack instead of resetting it.
                   */}
                  <RootStack key={`locale-${localeVersion}`} />
                  {/*
                   * Base overlay host: confirm / action sheet / toast render here unless a sheet or
                   * modal screen with its own host is on top (see components/ds/OverlayHost.tsx).
                   */}
                  <OverlayHost />
                </View>
              </ActionSheetProvider>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { colorScheme } = useColorScheme();
  const bg = palette[colorScheme === 'dark' ? 'dark' : 'light'].bg;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: bg },
      }}>
      <Stack.Screen name="medication" />
      <Stack.Screen name="profile/create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="export" options={{ presentation: 'modal' }} />
      <Stack.Screen name="log" />
    </Stack>
  );
}
