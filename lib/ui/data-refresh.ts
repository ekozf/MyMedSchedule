/**
 * App-wide "intake logs changed" signal. Anything that creates, edits or removes a log calls
 * `bumpLogs()`; screens that show logs (Today, Journal) reload when `useLogsVersion()` changes.
 * Needed because closing a transparent-modal route (/log/*) may not re-focus the tab underneath.
 */
import { create } from 'zustand';

interface LogsRefreshState {
  version: number;
  bump: () => void;
}

export const useLogsRefresh = create<LogsRefreshState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

export function bumpLogs(): void {
  useLogsRefresh.getState().bump();
}

export function useLogsVersion(): number {
  return useLogsRefresh((s) => s.version);
}
