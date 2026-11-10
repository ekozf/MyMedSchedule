/**
 * Small building blocks shared by the add-medicine steps and the edit page (docs/DESIGN.md §5.4):
 * field labels, the "why can't I continue" hint, the summary card, a date row that opens the
 * calendar sheet, a native time picker you can open from code, and the big time card.
 *
 * @example
 * <FieldLabel>Measured in</FieldLabel>
 * <SummaryCard text="1 pill each time" />
 * <DateRow label="Starting on" value={config.startDate} onChange={(iso) => …} minimumDate={today} />
 * const picker = useTimePicker();
 * const time = await picker.pick('08:00');   // "HH:mm" or null when cancelled
 * {picker.element}
 * <TimeCard label="Time 1" time="08:00" onChange={…} picker={picker} />
 */
import * as React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ChevronRight, Clock, Info, Trash2 } from 'lucide-react-native';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { formatShortDate, useTimeFormat } from '@/lib/ui/format';
import {
  Button,
  CalendarSheet,
  Card,
  Icon,
  ListGroup,
  ListRow,
  PressableScale,
  Sheet,
  Text,
  useTheme,
} from '@/components/ds';
import { dateToTime, dayToIso, timeToDate, type StepIssue } from './form-model';

const ts = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`ui.editor.screens.${key}`, opts);

/** 16/700 ink2 label above a control. */
export function FieldLabel({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <Text variant="subhead" weight="700" tone="secondary" style={{ paddingHorizontal: 4 }}>
        {children}
      </Text>
    </View>
  );
}

/** Why the user can't continue yet (icon + words, never colour alone). */
export function IssueHint({
  issue,
  style,
}: {
  issue?: StepIssue | null;
  style?: StyleProp<ViewStyle>;
}) {
  if (!issue) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }, style]}>
      <Icon as={Info} size={20} tone="secondary" />
      <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
        {i18n.t(`ui.editor.issues.${issue}`)}
      </Text>
    </View>
  );
}

/** Plain `field` card with one sentence ("1 pill each time", "Every day at 08:00 …"). */
export function SummaryCard({
  text,
  emphasis = false,
  style,
}: {
  text: string;
  /** title3 instead of body. */
  emphasis?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card style={style} accessible accessibilityLiveRegion="polite" accessibilityLabel={text}>
      <Text variant={emphasis ? 'title3' : 'body'} weight={emphasis ? '700' : '500'}>
        {text}
      </Text>
    </Card>
  );
}

/** A grouped row ("Starting on · Mon 9 Nov") that opens the calendar sheet. ISO in, ISO out. */
export function DateRow({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
}) {
  const [open, setOpen] = React.useState(false);
  const date = React.useMemo(() => new Date(value), [value]);
  const valid = !Number.isNaN(date.getTime());
  return (
    <>
      <ListGroup>
        <ListRow
          title={label}
          value={valid ? formatShortDate(date) : ts('pickDate')}
          onPress={() => setOpen(true)}
        />
      </ListGroup>
      <CalendarSheet
        visible={open}
        onClose={() => setOpen(false)}
        value={valid ? date : new Date()}
        minimumDate={minimumDate}
        title={label}
        onChange={(d) => onChange(dayToIso(d))}
      />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Time picker you can open from code (Android: native dialog; iOS: sheet with a spinner + Done)

function pickerLocale(is24h: boolean): string {
  const l = getCurrentLocale();
  if (l === 'nl') return is24h ? 'nl-NL' : 'en-US';
  if (l === 'tr') return is24h ? 'tr-TR' : 'en-US';
  return is24h ? 'en-GB' : 'en-US';
}

export interface TimePicker {
  /** Opens the picker at `initial` ("HH:mm"); resolves the chosen "HH:mm", or null. */
  pick: (initial: string, title?: string) => Promise<string | null>;
  /** Render once in the screen (the iOS sheet). */
  element: React.ReactNode;
}

export function useTimePicker(): TimePicker {
  const { colors, isDark } = useTheme();
  const { is24h } = useTimeFormat();
  const [visible, setVisible] = React.useState(false);
  const [draft, setDraft] = React.useState(() => new Date());
  const [title, setTitle] = React.useState<string | undefined>(undefined);
  const resolver = React.useRef<((v: string | null) => void) | null>(null);
  const result = React.useRef<string | null>(null);

  const pick = React.useCallback(
    (initial: string, sheetTitle?: string) =>
      new Promise<string | null>((resolve) => {
        const value = timeToDate(initial);
        if (Platform.OS === 'android') {
          DateTimePickerAndroid.open({
            value,
            mode: 'time',
            is24Hour: is24h,
            onChange: (event, date) =>
              resolve(event.type === 'set' && date ? dateToTime(date) : null),
          });
          return;
        }
        if (Platform.OS !== 'ios') {
          resolve(null);
          return;
        }
        resolver.current?.(null);
        resolver.current = resolve;
        result.current = null;
        setDraft(value);
        setTitle(sheetTitle);
        setVisible(true);
      }),
    [is24h]
  );

  const element =
    Platform.OS === 'ios' ? (
      <Sheet
        visible={visible}
        onClose={() => setVisible(false)}
        onDismissed={() => {
          const r = resolver.current;
          resolver.current = null;
          r?.(result.current);
        }}
        title={title ?? ts('pickTime')}
        scrollable={false}
        footer={
          <Button
            label={i18n.t('ui.common.done')}
            onPress={() => {
              result.current = dateToTime(draft);
              setVisible(false);
            }}
          />
        }>
        <View style={{ alignItems: 'center' }}>
          <DateTimePicker
            value={draft}
            mode="time"
            display="spinner"
            locale={pickerLocale(is24h)}
            is24Hour={is24h}
            themeVariant={isDark ? 'dark' : 'light'}
            textColor={colors.ink}
            onChange={(_e, date) => {
              if (date) setDraft(date);
            }}
          />
        </View>
      </Sheet>
    ) : null;

  return { pick, element };
}

/**
 * Time card (§5.4 step 4): a header with the label ("Time 1") and, when removable, a quiet
 * 44-tall "Remove" button with a trash icon at the right; then the time row (clock icon, the time
 * in 34/800 and a chevron right next to it), which is one full-width tap target that opens the
 * picker. Optional content underneath (the "Different amount at this time" switch row) is drawn
 * edge to edge; the caller pads it.
 */
export function TimeCard({
  label,
  time,
  onChange,
  picker,
  onRemove,
  removeLabel,
  children,
}: {
  label: string;
  time: string;
  onChange: (time: string) => void;
  picker: TimePicker;
  onRemove?: () => void;
  removeLabel?: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { formatTimeString } = useTimeFormat();
  const shown = formatTimeString(time);
  const open = async () => {
    const next = await picker.pick(time, label);
    if (next) onChange(next);
  };
  return (
    <Card padded={false}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 44,
          paddingTop: 8,
          paddingLeft: 16,
          paddingRight: 6,
        }}>
        <Text variant="subhead" weight="700" tone="secondary" style={{ flex: 1 }}>
          {label}
        </Text>
        {onRemove ? (
          <PressableScale
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={removeLabel ?? i18n.t('ui.editor.when.remove')}
            hitSlop={4}
            style={{
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              borderRadius: 14,
            }}>
            <Icon as={Trash2} size={20} tone="secondary" />
            <Text variant="callout" weight="600" tone="secondary">
              {i18n.t('ui.editor.when.remove')}
            </Text>
          </PressableScale>
        ) : null}
      </View>
      <PressableScale
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={ts('timeA11y', { label, time: shown })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: 64,
          paddingTop: 4,
          paddingBottom: 14,
          paddingHorizontal: 16,
        }}>
        <Icon as={Clock} size={26} tone="secondary" />
        <Text
          tabular
          color={colors.ink}
          style={{ fontSize: 34, lineHeight: 40, letterSpacing: -0.6 }}
          weight="800">
          {shown}
        </Text>
        <Icon as={ChevronRight} size={24} tone="secondary" />
      </PressableScale>
      {children}
    </Card>
  );
}
