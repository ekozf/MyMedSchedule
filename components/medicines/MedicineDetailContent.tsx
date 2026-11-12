/**
 * Body of the medicine page (docs/DESIGN.md §5.3): a compact header (64 px photo or first-letter
 * tile, then name, "1 pill each time" and status pills left-aligned), the plain schedule line
 * ("1 pill at 08:00 and 20:00, every day") above the `MiniTray` of its compartments with times
 * (neutral "scheduled" tone: green means taken on Today), Last taken (with which scheduled dose it
 * was recorded for) / Next dose (skipping doses already logged, same rule as Today), the supply
 * card ("Not tracking supply" with "Start tracking" while untracked) under "Supply and expiry"
 * with the "Expiry date" row below it, "Note" (the note, or "Add a note ›"), "Dose limits" (the
 * limits, or "Add dose limits ›"), "Reminder sound" (only when ringing on silent) and More (See in Journal, Pause / Resume this medicine, Delete
 * medicine). Status pill only when paused ("Paused"); an active medicine shows none.
 * Presentational: the route owns data loading and actions.
 *
 * @example
 * <MedicineDetailContent
 *   medication={med}
 *   lastTaken={lastLog}
 *   logs={logs}
 *   lastChange={adjustment}
 *   onLogDose={…} onUpdateSupply={…} onStartTracking={…} onEditRefill={…}
 *   onAddNote={…} onAddLimits={…} onSeeJournal={…} onToggleActive={…} onDelete={…}
 * />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import { useCompartmentBoundaries } from '@/lib/settings/compartments';
import {
  Button,
  ListGroup,
  ListRow,
  MedIcon,
  MiniTray,
  SectionHeader,
  StatusPill,
  Text,
} from '@/components/ds';
import type { InventoryAdjustment } from '@/lib/db/operations';
import type { IntakeLog, Medication } from '@/types';
import {
  formatWhen,
  isExpired,
  loggedForLine,
  medicineDisplayName,
  nextUnloggedDose,
} from './medicine-info';
import { configOf, scheduleLine, scheduleTimes, traySlots } from './schedule-summary';
import { ExpiryRow, SafetyGroup, SoundGroup } from './SafetyCard';
import { SupplyCard } from './SupplyCard';

export interface MedicineDetailContentProps {
  medication: Medication;
  /** Most recent taken/partial log (see `findLastTaken`). */
  lastTaken: IntakeLog | null;
  /** This medicine's logs, so "Next dose" skips occurrences already taken or skipped. */
  logs?: IntakeLog[];
  onLogDose: () => void;
  onUpdateSupply: () => void;
  /** "Start tracking" on an untracked supply (open the supply sheet's first count). */
  onStartTracking?: () => void;
  /** "Remind me when running low" in the supply card (open the refill editor). */
  onEditRefill?: () => void;
  /** Most recent supply change by hand ("Last change" in the supply card). */
  lastChange?: InventoryAdjustment | null;
  /** "Add a note" (open the note editor). Row hidden when not given. */
  onAddNote?: () => void;
  /** "Add dose limits" (open the limits editor). Row hidden when not given. */
  onAddLimits?: () => void;
  /** The "Expiry date" row (open the expiry date editor). Row only shown when set if not given. */
  onEditExpiry?: () => void;
  onSeeJournal: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  /** Disables the stop/resume + delete rows while an action runs. */
  busy?: boolean;
  now?: Date;
}

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.medicines.${key}`, opts);

export function MedicineDetailContent({
  medication: med,
  lastTaken,
  logs = [],
  onLogDose,
  onUpdateSupply,
  onStartTracking,
  onEditRefill,
  lastChange,
  onAddNote,
  onAddLimits,
  onEditExpiry,
  onSeeJournal,
  onToggleActive,
  onDelete,
  busy = false,
  now,
}: MedicineDetailContentProps) {
  const { formatTime, formatTimeString } = useTimeFormat();
  const { boundaries } = useCompartmentBoundaries();
  const at = now ?? new Date();
  const expired = isExpired(med, at);
  const config = configOf(med);
  const times = med.isPrn ? [] : scheduleTimes(med.scheduleType, config);
  const nextDose = med.isActive && !med.isPrn ? nextUnloggedDose(med, logs, at) : null;
  const loggedFor = lastTaken ? loggedForLine(lastTaken, formatTime, at) : null;
  const notes = med.notes?.trim();

  return (
    <View style={{ gap: 24 }}>
      {/* Who: picture, name, amount, status */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingTop: 4 }}>
        <MedIcon name={med.name} uri={med.imageUri} size="lg" initial />
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="title1" accessibilityRole="header">
            {medicineDisplayName(med)}
          </Text>
          <Text variant="body" tone="secondary">
            {t('detail.each', { amount: formatDose(med.dosageAmount, med.dosageUnit) })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
            {med.isActive ? null : <StatusPill label={t('page.paused')} />}
            {med.isPrn ? <StatusPill label={t('page.whenNeeded')} /> : null}
            {expired ? <StatusPill label={t('status.expired')} tone="danger" /> : null}
          </View>
        </View>
      </View>

      {med.isPrn && med.isActive ? (
        <Button label={t('detail.logDose')} onPress={onLogDose} />
      ) : null}

      {/* When: the schedule in words, then the compartments it uses */}
      {times.length ? (
        <View style={{ gap: 10 }}>
          <Text variant="body" weight="600">
            {scheduleLine(
              {
                scheduleType: med.scheduleType,
                scheduleConfig: config,
                dosageAmount: med.dosageAmount,
                dosageUnit: med.dosageUnit,
              },
              boundaries,
              formatTimeString
            )}
          </Text>
          <MiniTray tone="scheduled" slots={traySlots(times, boundaries, formatTimeString)} />
        </View>
      ) : null}

      <ListGroup>
        <ListRow
          title={t('page.lastTaken')}
          subtitle={loggedFor ?? undefined}
          value={
            lastTaken
              ? formatWhen(new Date(lastTaken.actualTime), formatTime, at)
              : t('page.notYet')
          }
        />
        {med.isActive && !med.isPrn ? (
          <ListRow
            title={t('page.nextDose')}
            value={nextDose ? formatWhen(nextDose.time, formatTime, at) : t('page.noneSoon')}
          />
        ) : null}
      </ListGroup>

      {/* Supply and expiry: both are about the pack you have. */}
      <View style={{ gap: 8 }}>
        <SectionHeader title={t('page.supplyExpiry')} style={{ marginTop: 0, marginBottom: 0 }} />
        <SupplyCard
          medication={med}
          onUpdate={onUpdateSupply}
          onStartTracking={onStartTracking}
          onEditRefill={onEditRefill}
          lastChange={lastChange}
          now={at}
        />
        <ExpiryRow medication={med} onEdit={onEditExpiry} now={at} />
      </View>

      {notes ? (
        <ListGroup header={t('page.notes')}>
          <View style={{ padding: 16 }}>
            <Text variant="body" selectable>
              {notes}
            </Text>
          </View>
        </ListGroup>
      ) : onAddNote ? (
        <ListGroup header={t('page.notes')}>
          <ListRow title={t('setup.note')} onPress={onAddNote} />
        </ListGroup>
      ) : null}

      <SafetyGroup medication={med} onAdd={onAddLimits} />
      <SoundGroup medication={med} />

      <ListGroup header={t('page.more')}>
        <ListRow title={t('detail.seeJournal')} onPress={onSeeJournal} />
        <ListRow
          title={t(med.isActive ? 'detail.stop' : 'detail.resume')}
          subtitle={t(med.isActive ? 'detail.stopHint' : 'detail.resumeHint')}
          accessory="none"
          disabled={busy}
          onPress={onToggleActive}
        />
        <ListRow
          title={t('detail.delete')}
          destructive
          accessory="none"
          disabled={busy}
          onPress={onDelete}
        />
      </ListGroup>
    </View>
  );
}
