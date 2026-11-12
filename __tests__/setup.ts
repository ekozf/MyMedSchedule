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

// Real hashing / randomness from Node, so PIN hashes and DB keys behave like on a device.
vi.mock('expo-crypto', async () => {
  const nodeCrypto = await import('node:crypto');
  const algorithms: Record<string, string> = {
    'SHA-1': 'sha1',
    'SHA-256': 'sha256',
    'SHA-384': 'sha384',
    'SHA-512': 'sha512',
    MD5: 'md5',
  };
  return {
    CryptoDigestAlgorithm: {
      SHA1: 'SHA-1',
      SHA256: 'SHA-256',
      SHA384: 'SHA-384',
      SHA512: 'SHA-512',
      MD5: 'MD5',
    },
    CryptoEncoding: { HEX: 'hex', BASE64: 'base64' },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    getRandomBytesAsync: async (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    randomUUID: () => nodeCrypto.randomUUID(),
    digest: async (algorithm: string, data: ArrayBufferView) => {
      const h = nodeCrypto
        .createHash(algorithms[algorithm])
        .update(Buffer.from(data.buffer, data.byteOffset, data.byteLength))
        .digest();
      return h.buffer.slice(h.byteOffset, h.byteOffset + h.byteLength);
    },
    digestStringAsync: async (algorithm: string, data: string) =>
      nodeCrypto.createHash(algorithms[algorithm]).update(data).digest('hex'),
  };
});

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
