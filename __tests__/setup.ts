import { vi } from 'vitest';

// Mock expo modules
vi.mock('expo-router', () => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  },
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  useLocalSearchParams: vi.fn(() => ({})),
  Redirect: ({ href }: { href: string }) => null,
  Slot: ({ children }: { children?: React.ReactNode }) => children || null,
}));

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: vi.fn(() => ({
    execSync: vi.fn(),
    runSync: vi.fn(),
    getFirstSync: vi.fn(),
    getAllSync: vi.fn(),
    closeSync: vi.fn(),
    prepareSync: vi.fn(() => ({
      executeSync: vi.fn(),
      finalizeSync: vi.fn(),
    })),
  })),
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(() => Promise.resolve(true)),
  isEnrolledAsync: vi.fn(() => Promise.resolve(true)),
  authenticateAsync: vi.fn(() => Promise.resolve({ success: true })),
  supportedAuthenticationTypesAsync: vi.fn(() => Promise.resolve([1, 2])),
}));

vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(() => Promise.resolve([])),
  requestPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: vi.fn(),
  addNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
  AndroidNotificationPriority: {
    HIGH: 'high',
    MAX: 'max',
  },
}));

vi.mock('expo-image-picker', () => ({
  launchCameraAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
  requestCameraPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
}));

vi.mock('expo-file-system', () => ({
  documentDirectory: 'file:///',
  writeAsStringAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
}));

vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn(),
}));

vi.mock('expo-device', () => ({
  brand: 'Apple',
  modelName: 'iPhone 14',
  osName: 'iOS',
  osVersion: '17.0',
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '1.0.0',
    },
  },
}));

vi.mock('expo-localization', () => ({
  getLocales: vi.fn(() => [{ languageCode: 'en' }]),
}));

// Global test utilities
(global as any).mockDate = (date: Date) => {
  vi.useFakeTimers();
  vi.setSystemTime(date);
};

(global as any).restoreDate = () => {
  vi.useRealTimers();
};
