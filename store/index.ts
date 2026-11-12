import { create } from 'zustand';
import { Profile, Medication } from '@/types';
import {
  getLatestDisclaimerAcknowledgment,
  hasAcknowledgedDisclaimer,
  getActiveProfile,
  getAllProfiles,
  getMedicationsByProfile,
} from '@/lib/db/operations';
import * as SecureStore from 'expo-secure-store';
import { DISCLAIMER_VERSION } from '@/components/onboarding/launch-route';

/** SecureStore key for "onboarding finished" (also wiped by lib/data/wipe.ts). */
export const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

interface AppStore {
  // App state
  hasAcknowledgedDisclaimer: boolean;
  /** The current "Good to know" version (DISCLAIMER_VERSION) has been agreed to. */
  disclaimerUpToDate: boolean;
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoadingAppState: boolean;

  // Profile state
  activeProfile: Profile | null;
  profiles: Profile[];

  // Medication state
  medications: Medication[];

  // Actions
  setDisclaimerAcknowledged: (acknowledged: boolean) => void;
  setDisclaimerUpToDate: (upToDate: boolean) => void;
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
  /** Back to a fresh install's state (after "Delete all data"); app state counts as loaded. */
  reset: () => void;
}

const initialState = {
  hasAcknowledgedDisclaimer: false,
  disclaimerUpToDate: false,
  hasCompletedOnboarding: false,
  isAuthenticated: false,
  isLoading: false,
  isLoadingAppState: true,
  activeProfile: null,
  profiles: [],
  medications: [],
} satisfies Partial<AppStore>;

export const useStore = create<AppStore>((set, get) => ({
  // Initial state
  ...initialState,

  reset: () => set({ ...initialState, isLoadingAppState: false }),

  // Basic setters
  setDisclaimerAcknowledged: (acknowledged) => set({ hasAcknowledgedDisclaimer: acknowledged }),
  setDisclaimerUpToDate: (upToDate) => set({ disclaimerUpToDate: upToDate }),
  setOnboardingCompleted: async (completed) => {
    try {
      if (completed) {
        await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, 'true');
      } else {
        await SecureStore.deleteItemAsync(ONBOARDING_COMPLETED_KEY);
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
    set({ isLoadingAppState: true });
    try {
      // Check if onboarding was completed (saved to SecureStore)
      const onboardingCompleted = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
      if (onboardingCompleted === 'true') {
        set({ hasCompletedOnboarding: true });
      }

      // Check if disclaimer was acknowledged
      const disclaimer = await getLatestDisclaimerAcknowledgment();
      if (disclaimer) {
        set({ hasAcknowledgedDisclaimer: true });
      }
      // An agreement to an older version asks again (after unlocking, see launch-route.ts).
      try {
        set({ disclaimerUpToDate: await hasAcknowledgedDisclaimer(DISCLAIMER_VERSION) });
      } catch (error) {
        console.warn('Could not check the disclaimer version:', error);
      }

      // Load active profile
      const profile = await getActiveProfile();
      if (profile) {
        set({ activeProfile: profile });

        // Load medications for active profile
        const medications = await getMedicationsByProfile(profile.id, false);
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
    } finally {
      set({ isLoadingAppState: false });
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
      const medications = await getMedicationsByProfile(profileId, false);
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
