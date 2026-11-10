/**
 * The Journal tab UI (presentational, DESIGN.md §5.5): title, a full-width 52-tall secondary "Log a
 * past dose" under it, the folded "Filter" chip, and the day-grouped timeline (each day header carries its
 * counts, "2 taken") (virtualised SectionList, newest first, sticky
 * day headers). When the period isn't All, a quiet "Show all history" ends the list. Data and
 * actions come in via props.
 *
 * @example
 * <JournalView logs={logs} medications={meds} loaded filters={f} onFiltersChange={setF}
 *   onOpenEntry={open} onLogPast={() => router.push('/log/past')} />
 */
import * as React from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import i18n from '@/lib/i18n';
import { Button, EmptyState, Screen, TabHeader, useTheme } from '@/components/ds';
import { GUTTER, useTabBarInset } from '@/lib/ui/layout';
import { ProfileChip } from '@/components/shell/ProfileChip';
import type { IntakeLog, Medication } from '@/types';
import { DayHeader } from './DayHeader';
import { JournalControls } from './JournalControls';
import { JournalEntryRow } from './JournalEntryRow';
import {
  DEFAULT_FILTERS,
  countLogs,
  filterLogs,
  groupByDay,
  type DaySection,
  type JournalFilters,
  type JournalItem,
} from './filtering';

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
  onLogPast: () => void;
  /** Fixed "now" for previews and tests. */
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
  onLogPast,
  now,
}: JournalViewProps) {
  const { colors } = useTheme();
  const bottomInset = useTabBarInset();

  const medsById = React.useMemo(() => new Map(medications.map((m) => [m.id, m])), [medications]);
  const filtered = React.useMemo(() => filterLogs(logs, filters, now), [logs, filters, now]);
  const sections = React.useMemo(() => groupByDay(filtered), [filtered]);
  const dayCounts = React.useMemo(
    () => new Map(sections.map((s) => [s.key, countLogs(s.data.map((i) => i.log))])),
    [sections]
  );

  const hasLogs = logs.length > 0;
  const onlyRange = filters.medicationId === 'all' && filters.action === 'all';

  const clearFilters = () => {
    if (onlyRange) {
      onFiltersChange({ ...filters, range: 'all' });
      return;
    }
    const cleared: JournalFilters = { ...DEFAULT_FILTERS, range: filters.range };
    // Still nothing in this period? Widen the range too, so "Clear" always shows something.
    if (filterLogs(logs, cleared, now).length === 0) cleared.range = 'all';
    onFiltersChange(cleared);
  };

  const header = (
    <View style={{ paddingBottom: 4 }}>
      <TabHeader title={i18n.t('ui.journal.title')} right={<ProfileChip />} />
      {hasLogs ? (
        <View style={{ gap: 12 }}>
          <Button
            variant="secondary"
            label={i18n.t('ui.journal.logPast')}
            onPress={onLogPast}
            style={{ minHeight: 52 }}
          />
          <JournalControls filters={filters} onChange={onFiltersChange} medications={medications} />
        </View>
      ) : null}
    </View>
  );

  let empty: React.ReactElement | null = null;
  if (loaded && !hasLogs) {
    empty = (
      <EmptyState
        title={i18n.t('ui.journal.empty.title')}
        message={i18n.t('ui.journal.empty.message')}
        action={{ label: i18n.t('ui.journal.logPast'), onPress: onLogPast }}
        style={{ paddingTop: 48 }}
      />
    );
  } else if (hasLogs) {
    empty = (
      <EmptyState
        compact
        title={i18n.t('ui.journal.noMatch.title')}
        message={i18n.t(
          onlyRange ? 'ui.journal.noMatch.messageRange' : 'ui.journal.noMatch.message'
        )}
        action={{
          label: i18n.t(onlyRange ? 'ui.journal.noMatch.showAll' : 'ui.journal.noMatch.clear'),
          variant: 'secondary',
          onPress: clearFilters,
        }}
        style={{ paddingTop: 32 }}
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
          <DayHeader
            date={section.date}
            counts={dayCounts.get(section.key) ?? countLogs([])}
            now={now}
          />
        )}
        renderItem={({ item }) => (
          <JournalEntryRow
            item={item}
            medication={medsById.get(item.log.medicationId)}
            onPress={() => onOpenEntry(item.log)}
          />
        )}
        stickySectionHeadersEnabled
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          filters.range !== 'all' && sections.length > 0 ? (
            <Button
              variant="quiet"
              label={i18n.t('ui.journal.showAllHistory')}
              onPress={() => onFiltersChange({ ...filters, range: 'all' })}
              style={{ marginTop: 12 }}
            />
          ) : null
        }
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
