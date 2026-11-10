/**
 * You → Parts of the day (spec §5.6, formerly "Compartment times"): when Midday, Evening and Night start. Morning always starts
 * at the beginning of the day. Times must go in order; saved per profile with `setBoundaries`.
 */
import * as React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import i18n from '@/lib/i18n';
import { useTimeFormat } from '@/lib/ui/format';
import { useCompartmentBoundaries } from '@/lib/settings/compartments';
import { Button, DateTimeField, NavHeader, Screen, Text, useToast } from '@/components/ds';
import { StatusLine } from '@/components/onboarding';
import {
  boundariesInOrder,
  fromHHmm,
  toHHmm,
  type EditableCompartment,
} from '@/components/you/compartment-times';
import { useDiscardGuard } from '@/components/you/use-discard-guard';
import type { CompartmentBoundaries } from '@/types';

const c = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.compartments.${key}`, opts);
const y = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`ui.you.compartments.${key}`, opts);

export default function CompartmentTimesRoute() {
  const toast = useToast();
  const { formatTimeString } = useTimeFormat();
  const { boundaries, setBoundaries } = useCompartmentBoundaries();
  const [draft, setDraft] = React.useState<CompartmentBoundaries>(boundaries);
  const [saving, setSaving] = React.useState(false);

  const valid = boundariesInOrder(draft);
  const dirty =
    draft.midday !== boundaries.midday ||
    draft.evening !== boundaries.evening ||
    draft.night !== boundaries.night;
  const { allowLeave } = useDiscardGuard(dirty && !saving);

  const set = (id: EditableCompartment) => (date: Date) =>
    setDraft((d) => ({ ...d, [id]: toHHmm(date) }));

  const save = async () => {
    if (!valid || saving) return;
    if (!dirty) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      await setBoundaries(draft);
      allowLeave();
      toast.show({ title: c('saved') });
      router.back();
    } catch (error) {
      console.error('Failed to save compartment times:', error);
      toast.show({ title: i18n.t('ui.you.preferences.saveFailed') });
      setSaving(false);
    }
  };

  const f = formatTimeString;
  const rules: Record<EditableCompartment, string> = {
    midday: y('middayRule', { from: f(draft.midday), to: f(draft.evening) }),
    evening: y('eveningRule', { from: f(draft.evening), to: f(draft.night) }),
    night: y('nightRule', { from: f(draft.night) }),
  };

  return (
    <Screen
      header={<NavHeader />}
      footer={
        <>
          <StatusLine text={valid ? null : c('invalid')} />
          <Button label={y('save')} disabled={!valid} loading={saving} onPress={save} />
        </>
      }>
      <View style={{ gap: 8, marginBottom: 24, paddingTop: 8 }}>
        <Text variant="title1">{c('settingTitle')}</Text>
        <Text variant="body" tone="secondary">
          {c('settingSubtitle')}
        </Text>
      </View>

      <View style={{ gap: 28 }}>
        <View style={{ gap: 10 }}>
          <Text variant="title3" accessibilityRole="header">
            {c('morning')}
          </Text>
          <Text variant="footnote" tone="secondary" tabular>
            {y('morningFixed', { time: f(draft.midday) })}
          </Text>
        </View>

        {(['midday', 'evening', 'night'] as const).map((id) => (
          <View key={id} style={{ gap: 10 }}>
            <Text variant="title3" accessibilityRole="header">
              {c(id)}
            </Text>
            <DateTimeField
              mode="time"
              label={c('startsAt', { name: c(id) })}
              value={fromHHmm(draft[id])}
              onChange={set(id)}
              disabled={saving}
            />
            <Text variant="footnote" tone="secondary">
              {rules[id]}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
