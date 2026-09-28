/**
 * Body of the medicine detail screen (docs/DESIGN.md §4.3): hero, info tiles, "Log a dose" for
 * active as-needed medicines, Supply / Safety / Notes cards and the action lists.
 * Presentational: the route owns data loading and actions.
 *
 * @example
 * <MedicineDetailContent
 *   medication={med}
 *   lastTaken={lastLog}
 *   onLogDose={…} onUpdateSupply={…} onSeeJournal={…} onToggleActive={…} onDelete={…}
 * />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import {
  CalendarClock,
  CalendarX2,
  CircleCheck,
  CirclePause,
  CirclePlay,
  Clock,
  Hand,
  History,
  NotebookText,
  PackageX,
  Plus,
  StickyNote,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { getNextDose } from '@/lib/schedule/calculator';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import {
  Button,
  Card,
  Icon,
  ListGroup,
  ListRow,
  MedTile,
  StatusChip,
  Text,
  useTheme,
  withAlpha,
  type StatusTone,
} from '@/components/ds';
import type { IntakeLog, Medication } from '@/types';
import { describeSchedule, formatWhen, getSupplyState, isExpired } from './medicine-info';
import { CardTitle } from './parts';
import { SafetyCard } from './SafetyCard';
import { SupplyCard } from './SupplyCard';

export interface MedicineDetailContentProps {
  medication: Medication;
  /** Most recent taken/partial log (see `findLastTaken`). */
  lastTaken: IntakeLog | null;
  onLogDose: () => void;
  onUpdateSupply: () => void;
  onSeeJournal: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  /** Disables the stop/resume + delete rows while an action runs. */
  busy?: boolean;
  now?: Date;
}

export function MedicineDetailContent({
  medication: med,
  lastTaken,
  onLogDose,
  onUpdateSupply,
  onSeeJournal,
  onToggleActive,
  onDelete,
  busy = false,
  now,
}: MedicineDetailContentProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const { formatTime, formatTimeString } = useTimeFormat();
  const at = now ?? new Date();

  const supply = getSupplyState(med, at);
  const expired = isExpired(med, at);
  const nextDose = med.isActive && !med.isPrn ? getNextDose(med, at) : null;

  const chips: { key: string; label: string; icon: LucideIcon; tone: StatusTone }[] = [
    med.isActive
      ? {
          key: 'active',
          label: i18n.t('ui.medicines.status.active'),
          icon: CircleCheck,
          tone: 'success',
        }
      : {
          key: 'stopped',
          label: i18n.t('ui.medicines.status.stopped'),
          icon: CirclePause,
          tone: 'default',
        },
  ];
  if (med.isPrn) {
    chips.push({
      key: 'prn',
      label: i18n.t('ui.medicines.status.asNeeded'),
      icon: Hand,
      tone: 'accent',
    });
  }
  if (expired) {
    chips.push({
      key: 'expired',
      label: i18n.t('ui.medicines.status.expired'),
      icon: CalendarX2,
      tone: 'danger',
    });
  }
  if (supply.empty) {
    chips.push({
      key: 'empty',
      label: i18n.t('ui.medicines.status.noneLeft'),
      icon: PackageX,
      tone: 'danger',
    });
  } else if (supply.low) {
    chips.push({
      key: 'low',
      label: i18n.t('ui.medicines.status.runningLow'),
      icon: TriangleAlert,
      tone: 'warning',
    });
  }

  const tiles: { key: string; icon: LucideIcon; label: string; value: string; wide?: boolean }[] = [
    {
      key: 'schedule',
      icon: CalendarClock,
      label: i18n.t('ui.medicines.info.schedule'),
      value: describeSchedule(med, formatTimeString),
      wide: true,
    },
  ];
  if (med.isActive && !med.isPrn) {
    tiles.push({
      key: 'next',
      icon: Clock,
      label: i18n.t('ui.medicines.info.nextDose'),
      value: nextDose
        ? formatWhen(nextDose.time, formatTime, at)
        : i18n.t('ui.medicines.info.noUpcoming'),
    });
  }
  tiles.push({
    key: 'last',
    icon: History,
    label: i18n.t('ui.medicines.info.lastTaken'),
    value: lastTaken
      ? formatWhen(new Date(lastTaken.actualTime), formatTime, at)
      : i18n.t('ui.medicines.info.neverTaken'),
  });

  const enter = (i: number) =>
    reduceMotion ? undefined : FadeInDown.delay(Math.min(i, 8) * 30).duration(320);

  return (
    <View style={{ gap: 14 }}>
      {/* Hero */}
      <Animated.View entering={enter(0)} style={{ alignItems: 'center', gap: 10, paddingTop: 4 }}>
        <MedTile name={med.name} imageUri={med.imageUri} size="xl" />
        <Text variant="title1" align="center" accessibilityRole="header" style={{ marginTop: 4 }}>
          {med.name}
        </Text>
        <Text variant="body" tone="secondary" align="center">
          {i18n.t('ui.medicines.detail.each', {
            amount: formatDose(med.dosageAmount, med.dosageUnit),
          })}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 6,
            marginTop: 2,
          }}>
          {chips.map((c) => (
            <StatusChip key={c.key} label={c.label} icon={c.icon} tone={c.tone} />
          ))}
        </View>
      </Animated.View>

      {/* Info tiles */}
      <Animated.View
        entering={enter(1)}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
        {tiles.map((tile) => (
          <Card
            key={tile.key}
            blur={false}
            radius={20}
            style={{ flexGrow: 1, flexBasis: tile.wide ? '100%' : '46%', minWidth: 140 }}>
            <View accessible accessibilityLabel={`${tile.label}, ${tile.value}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: withAlpha(colors.accent, 0.14),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon as={tile.icon} size={16} tone="accent" />
                </View>
                <Text variant="footnote" tone="secondary" style={{ flexShrink: 1 }}>
                  {tile.label}
                </Text>
              </View>
              <Text variant="headline" style={{ marginTop: 8 }}>
                {tile.value}
              </Text>
            </View>
          </Card>
        ))}
      </Animated.View>

      {med.isPrn && med.isActive ? (
        <Animated.View entering={enter(2)}>
          <Button
            label={i18n.t('ui.medicines.detail.logDose')}
            icon={Plus}
            variant="success"
            size="lg"
            fullWidth
            onPress={onLogDose}
          />
        </Animated.View>
      ) : null}

      <Animated.View entering={enter(3)}>
        <SupplyCard medication={med} onUpdate={onUpdateSupply} now={at} />
      </Animated.View>

      <Animated.View entering={enter(4)}>
        <SafetyCard medication={med} now={at} />
      </Animated.View>

      {med.notes?.trim() ? (
        <Animated.View entering={enter(5)}>
          <Card>
            <CardTitle icon={StickyNote} title={i18n.t('ui.medicines.notes.title')} />
            <Text variant="body" selectable>
              {med.notes.trim()}
            </Text>
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View entering={enter(6)} style={{ gap: 14, marginTop: 4 }}>
        <ListGroup>
          <ListRow
            icon={NotebookText}
            title={i18n.t('ui.medicines.detail.seeJournal')}
            subtitle={i18n.t('ui.medicines.detail.seeJournalHint')}
            onPress={onSeeJournal}
          />
          <ListRow
            icon={med.isActive ? CirclePause : CirclePlay}
            iconTint={med.isActive ? colors.warning : colors.success}
            title={i18n.t(med.isActive ? 'ui.medicines.detail.stop' : 'ui.medicines.detail.resume')}
            subtitle={i18n.t(
              med.isActive ? 'ui.medicines.detail.stopHint' : 'ui.medicines.detail.resumeHint'
            )}
            accessory="none"
            disabled={busy}
            onPress={onToggleActive}
          />
        </ListGroup>
        <ListGroup>
          <ListRow
            icon={Trash2}
            title={i18n.t('ui.medicines.detail.delete')}
            destructive
            accessory="none"
            disabled={busy}
            onPress={onDelete}
          />
        </ListGroup>
      </Animated.View>
    </View>
  );
}
