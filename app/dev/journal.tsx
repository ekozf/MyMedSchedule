/**
 * DEV ONLY — Journal preview with mock data (no database, no store writes).
 * Open /dev/journal. Use the floating "Preview" button, or deep-link a state:
 *   /dev/journal?state=typical|empty|nomatch|filtered
 *   /dev/journal?sheet=entry|change|deleted|skipped|pick|form|nomeds|filter
 */
import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Eye } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { setLocale, getCurrentLocale } from '@/lib/i18n';
import { Button, useActionSheet, useToast } from '@/components/ds';
import { EntrySheet } from '@/components/journal/EntrySheet';
import { JournalView } from '@/components/journal/JournalView';
import { MedicineFilterSheet } from '@/components/journal/MedicineFilterSheet';
import { PastDoseSheet } from '@/components/journal/PastDoseSheet';
import { DEFAULT_FILTERS, type JournalFilters } from '@/components/journal/utils';
import type { IntakeAction, IntakeLog, Medication } from '@/types';

type State = 'typical' | 'empty' | 'nomatch' | 'filtered';
type SheetKind =
  | 'none'
  | 'entry'
  | 'change'
  | 'deleted'
  | 'skipped'
  | 'pick'
  | 'form'
  | 'nomeds'
  | 'filter';

function med(partial: Partial<Medication> & Pick<Medication, 'id' | 'name'>): Medication {
  const created = new Date(2026, 0, 1);
  return {
    profileId: 'p1',
    dosageAmount: 1,
    dosageUnit: 'pills',
    scheduleType: 'once_daily',
    scheduleConfig: '{}',
    inventoryCount: 30,
    bypassDnd: false,
    isActive: true,
    isPrn: false,
    createdAt: created,
    updatedAt: created,
    ...partial,
  };
}

const MEDS: Medication[] = [
  med({ id: 'metformin', name: 'Metformin' }),
  med({ id: 'lisinopril', name: 'Lisinopril', dosageAmount: 10, dosageUnit: 'milligrams' }),
  med({
    id: 'ibuprofen',
    name: 'Ibuprofen',
    dosageAmount: 400,
    dosageUnit: 'milligrams',
    isPrn: true,
    scheduleType: 'prn',
  }),
  med({ id: 'vitd', name: 'Vitamin D', dosageAmount: 2, dosageUnit: 'drops', isActive: false }),
];

function at(now: Date, daysAgo: number, h: number, m: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d;
}

function makeLogs(now: Date): IntakeLog[] {
  const logs: IntakeLog[] = [];
  let n = 0;
  const add = (
    medicationId: string,
    actualTime: Date,
    action: IntakeAction,
    dosageAmount: number,
    scheduledTime?: Date,
    notes?: string
  ) => {
    if (actualTime > now) return;
    n += 1;
    logs.push({
      id: `log-${n}`,
      medicationId,
      profileId: 'p1',
      actualTime,
      scheduledTime,
      action,
      dosageAmount,
      notes,
      createdAt: actualTime,
      updatedAt: actualTime,
    });
  };
  for (let day = 0; day < 12; day++) {
    add('metformin', at(now, day, 8, 4 + day), 'taken', 1, at(now, day, 8, 0));
    if (day === 2) {
      add('lisinopril', at(now, day, 20, 15), 'skipped', 10, at(now, day, 20, 0), 'Felt dizzy');
    } else if (day === 4) {
      add('lisinopril', at(now, day, 20, 40), 'partial', 5, at(now, day, 20, 0));
    } else {
      add('lisinopril', at(now, day, 20, 2), 'taken', 10, at(now, day, 20, 0));
    }
  }
  add(
    'ibuprofen',
    at(now, 0, Math.max(0, now.getHours() - 1), 30),
    'taken',
    400,
    undefined,
    'Headache after lunch'
  );
  add('ibuprofen', at(now, 3, 14, 10), 'taken', 400);
  add('metformin', at(now, 1, 13, 0), 'taken', 1, undefined, 'Forgot to log it at noon');
  add('gone', at(now, 5, 9, 30), 'taken', 1, at(now, 5, 9, 30));
  add('vitd', at(now, 9, 9, 0), 'taken', 2, at(now, 9, 9, 0));
  return logs.sort((a, b) => b.actualTime.getTime() - a.actualTime.getTime());
}

export default function JournalPreview() {
  const params = useLocalSearchParams<{ state?: string; sheet?: string }>();
  const toast = useToast();
  const showActionSheet = useActionSheet();
  const { colorScheme, setColorScheme } = useColorScheme();
  const now = React.useMemo(() => new Date(), []);
  const allLogs = React.useMemo(() => makeLogs(now), [now]);

  const [state, setState] = React.useState<State>((params.state as State) || 'typical');
  const [sheet, setSheet] = React.useState<SheetKind>((params.sheet as SheetKind) || 'none');
  const [filters, setFilters] = React.useState<JournalFilters>(DEFAULT_FILTERS);
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    if (state === 'nomatch') setFilters({ range: '7', medicationId: 'vitd', action: 'partial' });
    else if (state === 'filtered')
      setFilters({ range: '30', medicationId: 'lisinopril', action: 'all' });
    else setFilters(DEFAULT_FILTERS);
  }, [state]);

  const [tapped, setTapped] = React.useState<IntakeLog | null>(null);
  const logs = state === 'empty' ? [] : allLogs;
  const entryOpen =
    sheet === 'entry' || sheet === 'change' || sheet === 'deleted' || sheet === 'skipped';
  const pastOpen = sheet === 'pick' || sheet === 'form' || sheet === 'nomeds';

  // Keep the last sheet content while the exit animation runs.
  const lastEntry = React.useRef<IntakeLog | null>(null);
  if (entryOpen) {
    lastEntry.current =
      (sheet === 'deleted'
        ? allLogs.find((l) => l.medicationId === 'gone')
        : sheet === 'skipped'
          ? allLogs.find((l) => l.action === 'skipped')
          : (tapped ?? allLogs.find((l) => l.notes && l.medicationId === 'ibuprofen'))) ?? null;
  }
  const entryLog = lastEntry.current;
  const lastPast = React.useRef<SheetKind>('pick');
  if (pastOpen) lastPast.current = sheet;

  const choose = async () => {
    const key = await showActionSheet({
      title: 'Journal preview',
      options: [
        { key: 'typical', label: 'Timeline (typical)' },
        { key: 'filtered', label: 'Timeline (filtered: Lisinopril, 30 d)' },
        { key: 'nomatch', label: 'Filters match nothing' },
        { key: 'empty', label: 'Empty journal' },
        { key: 'entry', label: 'Entry sheet' },
        { key: 'skipped', label: 'Entry sheet (skipped)' },
        { key: 'change', label: 'Entry sheet — change' },
        { key: 'deleted', label: 'Entry sheet — deleted medicine' },
        { key: 'filter', label: 'Medicine filter sheet' },
        { key: 'pick', label: 'Past dose — pick medicine' },
        { key: 'form', label: 'Past dose — form (preselected)' },
        { key: 'nomeds', label: 'Past dose — no medicines' },
        { key: 'scheme', label: colorScheme === 'dark' ? 'Light mode' : 'Dark mode' },
        { key: 'lang', label: `Language (now ${getCurrentLocale()})` },
      ],
    });
    if (!key) return;
    if (key === 'scheme') setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
    else if (key === 'lang') {
      const order = ['en', 'nl', 'tr'] as const;
      const i = order.indexOf(getCurrentLocale() as (typeof order)[number]);
      await setLocale(order[(i + 1) % order.length]);
      force();
    } else if (['typical', 'filtered', 'nomatch', 'empty'].includes(key)) setState(key as State);
    else setSheet(key as SheetKind);
  };

  const mockDelay = () => new Promise((r) => setTimeout(r, 500));

  return (
    <View style={{ flex: 1 }}>
      <JournalView
        logs={logs}
        medications={MEDS}
        loaded
        filters={filters}
        onFiltersChange={setFilters}
        onOpenEntry={(log) => {
          setTapped(log);
          setSheet('entry');
        }}
        onDeleteEntry={() => toast.show({ title: 'Entry removed (mock)' })}
        onLogPast={() => setSheet('pick')}
        now={now}
      />

      <View style={{ position: 'absolute', right: 20, bottom: 110 }}>
        <Button label="Preview" icon={Eye} variant="secondary" size="sm" onPress={choose} />
      </View>

      <EntrySheet
        visible={entryOpen}
        log={entryLog}
        medication={MEDS.find((m) => m.id === entryLog?.medicationId)}
        initialMode={sheet === 'change' ? 'change' : 'view'}
        onClose={() => setSheet('none')}
        onDismissed={() => setTapped(null)}
        onSave={async () => {
          await mockDelay();
          setSheet('none');
          return true;
        }}
        onDelete={() => setSheet('none')}
      />

      <MedicineFilterSheet
        visible={sheet === 'filter'}
        onClose={() => setSheet('none')}
        medications={MEDS}
        value={filters.medicationId}
        onChange={(medicationId) => setFilters({ ...filters, medicationId })}
      />

      <PastDoseSheet
        key={lastPast.current}
        visible={pastOpen}
        onClose={() => setSheet('none')}
        medications={lastPast.current === 'nomeds' ? [] : MEDS.filter((m) => m.isActive)}
        initialMedicationId={lastPast.current === 'form' ? 'metformin' : undefined}
        onSubmit={async () => {
          await mockDelay();
          setSheet('none');
          return true;
        }}
        onAddMedicine={() => setSheet('none')}
        now={now}
      />
    </View>
  );
}
