/**
 * The Journal tab UI (presentational): title + "Log a past dose" button, light filters, summary,
 * and a day-grouped timeline (SectionList, sticky day headers). Data and actions come via props so
 * the screen can be previewed with mock data (`app/dev/journal.tsx`).
 *
 * @example
 * <JournalView logs={logs} medications={meds} loaded filters={f} onFiltersChange={setF}
 *   onOpenEntry={open} onDeleteEntry={remove} onLogPast={() => router.push('/log/past')} />
 */
import * as React from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import { BookOpen, CalendarPlus, ListFilter } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Button, EmptyState, Screen, TabHeader, useTheme } from '@/components/ds';
import { GUTTER, useTabBarInset } from '@/lib/ui/layout';
import type { IntakeLog, Medication } from '@/types';
import { DayHeader } from './DayHeader';
import { JournalControls } from './JournalControls';
import { JournalEntryRow } from './JournalEntryRow';
import {
  DEFAULT_FILTERS,
  countLogs,
  filterLogs,
  groupByDay,
  summaryText,
  type DaySection,
  type JournalFilters,
  type JournalItem,
} from './utils';

export interface JournalViewProps {
  logs: IntakeLog[];
  /** Every medicine of the profile, inactive included (for names and the filter). */
  medications: Medication[];
  /** False until the first load finished (avoids flashing the empty state). */
  loaded: boolean;
  filters: JournalFilters;
  onFiltersChange: (filters: JournalFilters) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  onOpenEntry: (log: IntakeLog) => void;
  onDeleteEntry: (log: IntakeLog) => void;
  onLogPast: () => void;
  /** Fixed "now" for previews. */
  now?: Date;
}

export function JournalView({
  logs,
  medications,
  loaded,
  filters,
  onFiltersChange,
  refreshing = false,
  onRefresh,
  onOpenEntry,
  onDeleteEntry,
  onLogPast,
  now,
}: JournalViewProps) {
  const { colors } = useTheme();
  const bottomInset = useTabBarInset();

  const medsById = React.useMemo(() => new Map(medications.map((m) => [m.id, m])), [medications]);
  const filtered = React.useMemo(() => filterLogs(logs, filters, now), [logs, filters, now]);
  const sections = React.useMemo(() => groupByDay(filtered), [filtered]);
  const summary = React.useMemo(() => summaryText(countLogs(filtered)), [filtered]);

  const hasLogs = logs.length > 0;
  const onlyRangeFilters = filters.medicationId === 'all' && filters.action === 'all';

  const clearFilters = () => {
    if (onlyRangeFilters) {
      onFiltersChange({ ...filters, range: 'all' });
      return;
    }
    const cleared: JournalFilters = { ...DEFAULT_FILTERS, range: filters.range };
    // Still nothing in this period? Widen the range too, so "Clear" always shows something.
    if (filterLogs(logs, cleared, now).length === 0) cleared.range = 'all';
    onFiltersChange(cleared);
  };

  const header = (
    <View>
      <TabHeader
        title={i18n.t('ui.journal.title')}
        right={
          <Button
            label={i18n.t('ui.journal.logPastShort')}
            accessibilityLabel={i18n.t('ui.journal.logPast')}
            icon={CalendarPlus}
            variant="secondary"
            size="md"
            onPress={onLogPast}
          />
        }
      />
      {hasLogs ? (
        <JournalControls
          filters={filters}
          onChange={onFiltersChange}
          medications={medications}
          summary={filtered.length > 0 ? summary : undefined}
        />
      ) : null}
    </View>
  );

  let empty: React.ReactElement | null = null;
  if (loaded && !hasLogs) {
    empty = (
      <EmptyState
        icon={BookOpen}
        title={i18n.t('ui.journal.empty.title')}
        message={i18n.t('ui.journal.empty.message')}
        action={{ label: i18n.t('ui.journal.logPast'), icon: CalendarPlus, onPress: onLogPast }}
        style={{ paddingTop: 48 }}
      />
    );
  } else if (hasLogs) {
    empty = (
      <EmptyState
        compact
        icon={ListFilter}
        tone="default"
        title={i18n.t('ui.journal.noMatch.title')}
        message={i18n.t(
          onlyRangeFilters ? 'ui.journal.noMatch.messageRange' : 'ui.journal.noMatch.message'
        )}
        action={{
          label: i18n.t(
            onlyRangeFilters ? 'ui.journal.noMatch.showAll' : 'ui.journal.noMatch.clear'
          ),
          variant: 'secondary',
          onPress: clearFilters,
        }}
        style={{ paddingTop: 24 }}
      />
    );
  }

  return (
    <Screen
      scroll={false}
      bottomInset="tabBar"
      padded={false}
      contentContainerStyle={{ paddingTop: 0, paddingBottom: 0 }}>
      <SectionList<JournalItem, DaySection>
        sections={sections}
        keyExtractor={(item) => item.log.id}
        renderSectionHeader={({ section }) => (
          <DayHeader date={section.date} count={section.data.length} now={now} />
        )}
        renderItem={({ item }) => (
          <JournalEntryRow
            item={item}
            medication={medsById.get(item.log.medicationId)}
            onPress={() => onOpenEntry(item.log)}
            onDelete={() => onDeleteEntry(item.log)}
          />
        )}
        stickySectionHeadersEnabled
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingTop: 8,
          paddingBottom: bottomInset,
          flexGrow: 1,
        }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          ) : undefined
        }
        initialNumToRender={14}
        maxToRenderPerBatch={12}
        windowSize={11}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </Screen>
  );
}
