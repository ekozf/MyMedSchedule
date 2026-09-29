/**
 * The Journal's refresh signal is the app-wide logs signal (`lib/ui/data-refresh.ts`), so logging
 * from Today or the /log/* sheets refreshes the Journal too and vice versa.
 */
export {
  useLogsRefresh as useJournalRefresh,
  bumpLogs as bumpJournal,
} from '@/lib/ui/data-refresh';
