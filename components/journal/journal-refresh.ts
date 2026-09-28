/**
 * Tiny refresh signal for the Journal. Anything that changes intake logs outside the Journal
 * screen (e.g. the /log/past transparent modal, whose closing may not re-focus the tab underneath)
 * calls `bumpJournal()`; the Journal reloads when `version` changes.
 */
import { create } from 'zustand';

interface JournalRefreshState {
  version: number;
  bump: () => void;
}

export const useJournalRefresh = create<JournalRefreshState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

export function bumpJournal(): void {
  useJournalRefresh.getState().bump();
}
