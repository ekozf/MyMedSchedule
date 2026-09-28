/**
 * One scheduled dose on Today: medicine tile (with a status badge) · name · "1 pill · note" ·
 * time, plus status chips. Wrapped in a SwipeableRow: swipe right = Take (unlogged), swipe left =
 * Skip / More (unlogged) or Undo (logged). Tap opens the dose sheet.
 *
 * @example
 * <DoseRow entry={entry} onAction={(action, entry) => …} />  // action: open | take | skip | undo
 */
import * as React from 'react';
import { View } from 'react-native';
import {
  Bell,
  CalendarClock,
  Check,
  CircleAlert,
  Clock,
  Contrast,
  Ellipsis,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  Card,
  Icon,
  MedTile,
  StatusChip,
  SwipeableRow,
  Text,
  useTheme,
  type StatusTone,
  type SwipeRightAction,
} from '@/components/ds';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import { LATE_DANGER_MIN, formatDuration, isLogged, type DoseEntry } from './logic';

export type DoseRowAction = 'open' | 'take' | 'skip' | 'undo';

export interface DoseRowProps {
  entry: DoseEntry;
  /** One stable callback for every row action (keeps rows memoizable). */
  onAction: (action: DoseRowAction, entry: DoseEntry) => void;
  /** Offer the swipe-to-take shortcut (e.g. off for future days). Default true. */
  canQuickTake?: boolean;
  /** Allow swipe shortcuts at all. Default true. */
  swipeEnabled?: boolean;
  /** View only (a dose on a later day): no take / skip shortcuts; tap still opens the sheet. */
  readOnly?: boolean;
}

interface ChipSpec {
  label: string;
  icon: LucideIcon;
  tone: StatusTone;
}

function DoseRowImpl({
  entry,
  onAction,
  canQuickTake = true,
  swipeEnabled = true,
  readOnly = false,
}: DoseRowProps) {
  const onPress = () => onAction('open', entry);
  const onTake = canQuickTake && !readOnly ? () => onAction('take', entry) : undefined;
  const onSkip = readOnly ? undefined : () => onAction('skip', entry);
  const onUndo = () => onAction('undo', entry);
  const { colors } = useTheme();
  const { formatTime } = useTimeFormat();
  const { dose, log, status, minutesLate, moved } = entry;
  const logged = isLogged(status);

  const doseText = formatDose(dose.dosageAmount, dose.dosageUnit);
  let subtitle = dose.notes ? `${doseText} · ${dose.notes}` : doseText;
  let subtitleTone: 'secondary' | 'success' | 'accent' = 'secondary';
  if (status === 'taken' && log) {
    subtitle = i18n.t('ui.today.row.takenAt', { time: formatTime(log.actualTime) });
    subtitleTone = 'success';
  } else if (status === 'partial' && log) {
    subtitle = i18n.t('ui.today.row.partial', {
      amount: formatDose(log.dosageAmount, dose.dosageUnit),
    });
    subtitleTone = 'accent';
  }

  const chips: ChipSpec[] = [];
  if (status === 'due')
    chips.push({ label: i18n.t('ui.today.row.now'), icon: Bell, tone: 'accent' });
  if (status === 'late')
    chips.push({
      label: i18n.t('ui.today.row.late', { duration: formatDuration(minutesLate) }),
      icon: Clock,
      tone: minutesLate >= LATE_DANGER_MIN ? 'danger' : 'warning',
    });
  if (status === 'missed')
    chips.push({ label: i18n.t('ui.today.row.notLogged'), icon: CircleAlert, tone: 'danger' });
  if (status === 'skipped')
    chips.push({ label: i18n.t('ui.today.row.skipped'), icon: X, tone: 'danger' });
  if (moved && !logged)
    chips.push({ label: i18n.t('ui.today.row.moved'), icon: CalendarClock, tone: 'default' });

  const time = formatTime(dose.time);
  const a11yLabel = [dose.medicationName, subtitle, time, ...chips.map((c) => c.label)].join(', ');

  const rightActions: SwipeRightAction[] = logged
    ? [{ label: i18n.t('ui.today.row.undo'), icon: Undo2, tone: 'default', onPress: onUndo }]
    : [
        ...(onSkip
          ? [
              {
                label: i18n.t('ui.today.row.skip'),
                icon: X,
                tone: 'danger' as const,
                onPress: onSkip,
              },
            ]
          : []),
        { label: i18n.t('ui.today.row.more'), icon: Ellipsis, tone: 'default', onPress },
      ];

  const a11yActions = [
    ...(!logged && onTake ? [{ name: 'take', label: i18n.t('ui.today.a11y.take') }] : []),
    ...(!logged && onSkip ? [{ name: 'skip', label: i18n.t('ui.today.a11y.skip') }] : []),
    ...(logged ? [{ name: 'undo', label: i18n.t('ui.today.a11y.undo') }] : []),
  ];

  const due = status === 'due';

  return (
    <SwipeableRow
      enabled={swipeEnabled}
      leftAction={
        !logged && onTake
          ? { label: i18n.t('ui.today.row.take'), icon: Check, tone: 'success', onTrigger: onTake }
          : undefined
      }
      rightActions={rightActions}>
      <Card
        padded={false}
        blur={false}
        onPress={onPress}
        haptic="tap"
        activeScale={0.98}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={i18n.t('ui.today.a11y.rowHint')}
        accessibilityActions={a11yActions}
        onAccessibilityAction={(e) => {
          const name = e.nativeEvent.actionName;
          if (name === 'take') onTake?.();
          if (name === 'skip') onSkip?.();
          if (name === 'undo') onUndo();
        }}
        style={
          due
            ? { borderColor: colors.accent, borderWidth: 1.5 }
            : logged
              ? { backgroundColor: colors.surfaceSunken, shadowOpacity: 0 }
              : undefined
        }>
        <View
          style={{
            minHeight: 76,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingVertical: 12,
            paddingLeft: 14,
            paddingRight: 16,
          }}>
          <View>
            <View style={{ opacity: logged ? 0.55 : 1 }}>
              <MedTile name={dose.medicationName} imageUri={dose.imageUri} size="md" />
            </View>
            {logged ? <StatusBadge status={status} /> : null}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="headline" numberOfLines={2} tone={logged ? 'secondary' : 'primary'}>
              {dose.medicationName}
            </Text>
            <Text
              variant="subhead"
              tone={subtitleTone}
              weight={subtitleTone === 'secondary' ? undefined : '600'}
              numberOfLines={2}>
              {subtitle}
            </Text>
            {chips.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
                {chips.map((c) => (
                  <StatusChip key={c.label} label={c.label} icon={c.icon} tone={c.tone} />
                ))}
              </View>
            ) : null}
          </View>
          <Text
            variant="time"
            tone={logged ? 'tertiary' : due ? 'accent' : 'primary'}
            numberOfLines={1}
            style={{ flexShrink: 0 }}>
            {time}
          </Text>
        </View>
      </Card>
    </SwipeableRow>
  );
}

/** Small circle on the tile corner: check (taken), half circle (partial), cross (skipped). */
function StatusBadge({ status }: { status: DoseEntry['status'] }) {
  const { colors } = useTheme();
  const spec =
    status === 'taken'
      ? { icon: Check, bg: colors.success, fg: colors.onAccent }
      : status === 'partial'
        ? { icon: Contrast, bg: colors.accent, fg: colors.onAccent }
        : { icon: X, bg: colors.danger, fg: colors.onAccent };
  return (
    <View
      style={{
        position: 'absolute',
        right: -5,
        bottom: -5,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: spec.bg,
        borderWidth: 2,
        borderColor: colors.surfaceSolid,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon as={spec.icon} size={12} color={spec.fg} strokeWidth={3} />
    </View>
  );
}

export const DoseRow = React.memo(DoseRowImpl);
