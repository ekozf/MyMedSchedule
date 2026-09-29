/**
 * Small building blocks shared by the editor steps: question header, labelled cards, time/date
 * fields that speak "HH:mm" / ISO strings, a labelled stepper and the gentle issue hint.
 *
 * @example
 * <StepHeader title="How often?" helper="Pick what fits best." />
 * <TimeField label="Time" value="08:00" onChange={(t) => …} />
 * <DateField label="Starting on" value={config.startDate} onChange={(iso) => …} minimumDate={today} />
 * <LabeledStepper label="Every" value={2} min={1} max={365} unit="days" onChange={…} />
 * <IssueHint issue="pickDay" />
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { Info } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Card, DateTimeField, Icon, Stepper, Text } from '@/components/ds';
import { dateToTime, dayToIso, timeToDate, type StepIssue } from './form-model';

export function StepHeader({ title, helper }: { title: string; helper?: string }) {
  return (
    <View style={{ gap: 6, marginBottom: 20 }}>
      <Text variant="title1" accessibilityRole="header">
        {title}
      </Text>
      {helper ? (
        <Text variant="body" tone="secondary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return (
    <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: 4 }}>
      {children}
    </Text>
  );
}

/** Glass card with a vertical gap between its children. */
export function EditorCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card style={style}>
      <View style={{ gap: 14 }}>{children}</View>
    </Card>
  );
}

export function TimeField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (time: string) => void;
}) {
  const date = React.useMemo(() => timeToDate(value), [value]);
  return (
    <DateTimeField
      mode="time"
      label={label}
      value={date}
      sheetTitle={label}
      onChange={(d) => onChange(dateToTime(d))}
    />
  );
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
}) {
  const date = React.useMemo(() => new Date(value), [value]);
  return (
    <DateTimeField
      mode="date"
      label={label}
      value={Number.isNaN(date.getTime()) ? null : date}
      sheetTitle={label}
      minimumDate={minimumDate}
      onChange={(d) => onChange(dayToIso(d))}
    />
  );
}

export interface LabeledStepperProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  allowDecimal?: boolean;
}

/** Label above a big stepper (the stepper's own a11y label is the label). */
export function LabeledStepper({ label, ...stepper }: LabeledStepperProps) {
  return (
    <View style={{ gap: 4 }}>
      <FieldLabel>{label}</FieldLabel>
      <Stepper {...stepper} accessibilityLabel={label} />
    </View>
  );
}

/** Gentle reason why the user can't continue yet (icon + text, never colour alone). */
export function IssueHint({
  issue,
  style,
}: {
  issue?: StepIssue | null;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  if (!issue) return null;
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(200)}
      exiting={reduceMotion ? undefined : FadeOut.duration(150)}
      accessibilityLiveRegion="polite"
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }, style]}>
      <Icon as={Info} size={18} tone="secondary" />
      <Text variant="subhead" tone="secondary" style={{ flex: 1 }}>
        {i18n.t(`ui.editor.issues.${issue}`)}
      </Text>
    </Animated.View>
  );
}
