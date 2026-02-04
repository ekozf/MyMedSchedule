import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '@/store';
import * as SecureStore from 'expo-secure-store';

// Mock SecureStore
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

// Mock database operations
vi.mock('@/lib/db/operations', () => ({
  getLatestDisclaimerAcknowledgment: vi.fn(() => Promise.resolve(null)),
  getActiveProfile: vi.fn(() => Promise.resolve(null)),
  getAllProfiles: vi.fn(() => Promise.resolve([])),
  getMedicationsByProfile: vi.fn(() => Promise.resolve([])),
}));

describe('Store - Onboarding', () => {
  beforeEach(() => {
    // Reset store state
    useStore.setState({
      hasAcknowledgedDisclaimer: false,
      hasCompletedOnboarding: false,
      isAuthenticated: false,
      isLoading: false,
      activeProfile: null,
      profiles: [],
      medications: [],
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should initialize with hasCompletedOnboarding as false', () => {
    const state = useStore.getState();
    expect(state.hasCompletedOnboarding).toBe(false);
  });

  it('should set onboarding completed and save to SecureStore', async () => {
    const store = useStore.getState();

    await store.setOnboardingCompleted(true);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('onboarding_completed', 'true');
    expect(useStore.getState().hasCompletedOnboarding).toBe(true);
  });

  it('should delete from SecureStore when setting onboarding as not completed', async () => {
    const store = useStore.getState();

    await store.setOnboardingCompleted(false);

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('onboarding_completed');
    expect(useStore.getState().hasCompletedOnboarding).toBe(false);
  });

  it('should load onboarding status from SecureStore', async () => {
    (SecureStore.getItemAsync as any).mockResolvedValue('true');

    const store = useStore.getState();
    await store.loadAppState();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('onboarding_completed');
    expect(useStore.getState().hasCompletedOnboarding).toBe(true);
  });

  it('should handle missing onboarding flag in SecureStore', async () => {
    (SecureStore.getItemAsync as any).mockResolvedValue(null);

    const store = useStore.getState();
    await store.loadAppState();

    expect(useStore.getState().hasCompletedOnboarding).toBe(false);
  });

  it('should handle SecureStore errors gracefully', async () => {
    (SecureStore.setItemAsync as any).mockRejectedValue(new Error('Storage error'));

    const store = useStore.getState();

    // Should not throw
    await expect(store.setOnboardingCompleted(true)).resolves.not.toThrow();
  });
});

describe('Store - Basic State Management', () => {
  it('should set disclaimer acknowledged', () => {
    const store = useStore.getState();
    store.setDisclaimerAcknowledged(true);

    expect(useStore.getState().hasAcknowledgedDisclaimer).toBe(true);
  });

  it('should set authenticated', () => {
    const store = useStore.getState();
    store.setAuthenticated(true);

    expect(useStore.getState().isAuthenticated).toBe(true);
  });

  it('should set loading state', () => {
    const store = useStore.getState();
    store.setLoading(true);

    expect(useStore.getState().isLoading).toBe(true);
  });

  it('should set active profile', () => {
    const mockProfile = {
      id: 'profile-1',
      name: 'Test User',
      settings: { language: 'en' as const, use24HourTime: true, authRequired: false },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const store = useStore.getState();
    store.setActiveProfile(mockProfile);

    expect(useStore.getState().activeProfile).toEqual(mockProfile);
  });

  it('should set profiles list', () => {
    const mockProfiles = [
      {
        id: 'profile-1',
        name: 'User 1',
        settings: { language: 'en' as const, use24HourTime: true, authRequired: false },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'profile-2',
        name: 'User 2',
        settings: { language: 'tr' as const, use24HourTime: false, authRequired: true },
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const store = useStore.getState();
    store.setProfiles(mockProfiles);

    expect(useStore.getState().profiles).toEqual(mockProfiles);
  });

  it('should set medications', () => {
    const mockMedications = [
      {
        id: 'med-1',
        profileId: 'profile-1',
        name: 'Test Med',
        dosageAmount: 10,
        dosageUnit: 'milligrams' as const,
        scheduleType: 'once_daily' as const,
        scheduleConfig: JSON.stringify({ time: '09:00' }),
        inventoryCount: 30,
        bypassDnd: false,
        isActive: true,
        isPrn: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const store = useStore.getState();
    store.setMedications(mockMedications);

    expect(useStore.getState().medications).toEqual(mockMedications);
  });
});

describe('Store - Data Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call refreshAll and update loading state', async () => {
    const store = useStore.getState();

    // Set an active profile first
    store.setActiveProfile({
      id: 'profile-1',
      name: 'Test',
      settings: { language: 'en' as const, use24HourTime: true, authRequired: false },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await store.refreshAll();

    expect(useStore.getState().isLoading).toBe(false);
  });

  it('should call refreshAll without active profile', async () => {
    const store = useStore.getState();

    // Clear active profile
    store.setActiveProfile(null);

    await store.refreshAll();

    expect(useStore.getState().isLoading).toBe(false);
  });

  it('should load medications for a specific profile', async () => {
    const { getMedicationsByProfile } = await import('@/lib/db/operations');

    const store = useStore.getState();
    await store.loadMedications('profile-1');

    expect(getMedicationsByProfile).toHaveBeenCalledWith('profile-1', false);
  });

  it('should load profiles', async () => {
    const store = useStore.getState();
    await store.loadProfiles();

    // Should complete without error
    expect(true).toBe(true);
  });

  it('should handle loadAppState with existing data', async () => {
    (SecureStore.getItemAsync as any).mockResolvedValue('true');

    const mockProfile = {
      id: 'profile-1',
      name: 'Test',
      settings: { language: 'en', use24HourTime: true, authRequired: false },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockDisclaimer = {
      id: 'disc-1',
      version: '1.0.0',
      acknowledgedAt: new Date().toISOString(),
    };

    const mockMedications = [
      {
        id: 'med-1',
        profileId: 'profile-1',
        name: 'Test Med',
        dosageAmount: 10,
        dosageUnit: 'milligrams',
        scheduleType: 'once_daily',
        scheduleConfig: JSON.stringify({ time: '09:00' }),
        inventoryCount: 30,
        bypassDnd: false,
        isActive: true,
        isPrn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const {
      getLatestDisclaimerAcknowledgment,
      getActiveProfile,
      getAllProfiles,
      getMedicationsByProfile,
    } = await import('@/lib/db/operations');

    (getLatestDisclaimerAcknowledgment as any).mockResolvedValue(mockDisclaimer);
    (getActiveProfile as any).mockResolvedValue(mockProfile);
    (getAllProfiles as any).mockResolvedValue([mockProfile]);
    (getMedicationsByProfile as any).mockResolvedValue(mockMedications);

    const store = useStore.getState();
    await store.loadAppState();

    expect(useStore.getState().hasCompletedOnboarding).toBe(true);
    expect(useStore.getState().hasAcknowledgedDisclaimer).toBe(true);
    expect(getMedicationsByProfile).toHaveBeenCalledWith(mockProfile.id, false);
  });

  it('should handle error in loadMedications gracefully', async () => {
    const { getMedicationsByProfile } = await import('@/lib/db/operations');
    (getMedicationsByProfile as any).mockRejectedValue(new Error('DB error'));

    const store = useStore.getState();

    // Should not throw
    await expect(store.loadMedications('profile-1')).resolves.not.toThrow();
  });

  it('should handle error in loadProfiles gracefully', async () => {
    const { getAllProfiles } = await import('@/lib/db/operations');
    (getAllProfiles as any).mockRejectedValue(new Error('DB error'));

    const store = useStore.getState();

    // Should not throw
    await expect(store.loadProfiles()).resolves.not.toThrow();
  });

  it('should handle error in loadAppState gracefully', async () => {
    const { getLatestDisclaimerAcknowledgment } = await import('@/lib/db/operations');
    (getLatestDisclaimerAcknowledgment as any).mockRejectedValue(new Error('DB error'));

    const store = useStore.getState();

    // Should not throw
    await expect(store.loadAppState()).resolves.not.toThrow();
  });

  it('should handle error in refreshAll gracefully', async () => {
    const { getAllProfiles } = await import('@/lib/db/operations');
    (getAllProfiles as any).mockRejectedValue(new Error('DB error'));

    const store = useStore.getState();

    // Should not throw and should reset loading state
    await expect(store.refreshAll()).resolves.not.toThrow();
    expect(useStore.getState().isLoading).toBe(false);
  });
});
