import { create } from 'zustand';
import { Profile, Medication } from '@/types';
import {
  getLatestDisclaimerAcknowledgment,
  getActiveProfile,
  getAllProfiles,
  getMedicationsByProfile,
} from '@/lib/db/operations';
import * as SecureStore from 'expo-secure-store';

interface AppStore {
  // App state
  hasAcknowledgedDisclaimer: boolean;
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Profile state
  activeProfile: Profile | null;
  profiles: Profile[];

  // Medication state
  medications: Medication[];

  // Actions
  setDisclaimerAcknowledged: (acknowledged: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  setAuthenticated: (authenticated: boolean) => void;
  setActiveProfile: (profile: Profile | null) => void;
  setProfiles: (profiles: Profile[]) => void;
  setMedications: (medications: Medication[]) => void;
  setLoading: (loading: boolean) => void;

  // Data loading actions
  loadAppState: () => Promise<void>;
  loadProfiles: () => Promise<void>;
  loadMedications: (profileId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
  // Initial state
  hasAcknowledgedDisclaimer: false,
  hasCompletedOnboarding: false,
  isAuthenticated: false,
  isLoading: false,
  activeProfile: null,
  profiles: [],
  medications: [],

  // Basic setters
  setDisclaimerAcknowledged: (acknowledged) => set({ hasAcknowledgedDisclaimer: acknowledged }),
  setOnboardingCompleted: async (completed) => {
    try {
      if (completed) {
        await SecureStore.setItemAsync('onboarding_completed', 'true');
      } else {
        await SecureStore.deleteItemAsync('onboarding_completed');
      }
      set({ hasCompletedOnboarding: completed });
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
    }
  },
  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  setActiveProfile: (profile) => set({ activeProfile: profile }),
  setProfiles: (profiles) => set({ profiles }),
  setMedications: (medications) => set({ medications }),
  setLoading: (loading) => set({ isLoading: loading }),

  // Data loading actions
  loadAppState: async () => {
    try {
      // Check if onboarding was completed (saved to SecureStore)
      const onboardingCompleted = await SecureStore.getItemAsync('onboarding_completed');
      if (onboardingCompleted === 'true') {
        set({ hasCompletedOnboarding: true });
      }

      // Check if disclaimer was acknowledged
      const disclaimer = await getLatestDisclaimerAcknowledgment();
      if (disclaimer) {
        set({ hasAcknowledgedDisclaimer: true });
      }

      // Load active profile
      const profile = await getActiveProfile();
      if (profile) {
        set({ activeProfile: profile });

        // Load medications for active profile
        const medications = await getMedicationsByProfile(profile.id);
        set({ medications });

        // If profile exists and no auth is required, set authenticated to true
        // This allows users without auth to go directly to dashboard on app start
        const { getAuthMethod } = await import('@/lib/auth');
        const authMethod = await getAuthMethod();
        if (authMethod === 'none') {
          set({ isAuthenticated: true });
        }
      }

      // Load all profiles
      const profiles = await getAllProfiles();
      set({ profiles });
    } catch (error) {
      console.error('Failed to load app state:', error);
    }
  },

  loadProfiles: async () => {
    try {
      const profiles = await getAllProfiles();
      set({ profiles });

      // Also refresh active profile
      const activeProfile = await getActiveProfile();
      set({ activeProfile });
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  },

  loadMedications: async (profileId: string) => {
    try {
      const medications = await getMedicationsByProfile(profileId);
      set({ medications });
    } catch (error) {
      console.error('Failed to load medications:', error);
    }
  },

  refreshAll: async () => {
    const { activeProfile } = get();
    set({ isLoading: true });

    try {
      await get().loadProfiles();

      if (activeProfile) {
        await get().loadMedications(activeProfile.id);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
