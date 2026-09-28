/**
 * DEV ONLY — preview of the add / edit medicine editors with mock data (no DB writes).
 * Open /dev/editor. Every section owns its own form state, so all controls are interactive.
 */
import * as React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Languages, Moon, Plus, Sun } from 'lucide-react-native';
import { addDays, startOfDay } from 'date-fns';
import { getCurrentLocale, setLocale } from '@/lib/i18n';
import type { ScheduleType } from '@/types';
import {
  Button,
  Chip,
  ChipRow,
  IconButton,
  NavHeader,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ds';
import {
  SCHEDULE_TYPES,
  createEmptyForm,
  defaultConfigFor,
  validateStep,
  type MedicineForm,
} from '@/components/editor/form-model';
import { useMedicineForm, type MedicineFormUpdater } from '@/components/editor/useMedicineForm';
import {
  DoseStep,
  NameStep,
  ScheduleDetailsStep,
  ScheduleTypeStep,
} from '@/components/editor/steps';
import { SupplyStep } from '@/components/editor/SupplyStep';
import { ExtrasStep } from '@/components/editor/ExtrasStep';
import { ReviewStep } from '@/components/editor/ReviewStep';
import { scheduleTypeTitle } from '@/components/editor/describe';

const today = startOfDay(new Date());

function mockForm(patch: Partial<MedicineForm> = {}): MedicineForm {
  const type = patch.scheduleType ?? 'once_daily';
  return {
    ...createEmptyForm(),
    name: 'Metformin',
    dosageAmount: 1,
    dosageUnit: 'pills',
    scheduleType: type,
    scheduleConfig: defaultConfigFor(type, { dosageAmount: patch.dosageAmount ?? 4 }),
    ...patch,
  };
}

/** Local form state for one preview block. */
function Preview({
  initial,
  children,
}: {
  initial: MedicineForm;
  children: (form: MedicineForm, update: MedicineFormUpdater) => React.ReactNode;
}) {
  const { form, update } = useMedicineForm(initial);
  return <>{children(form, update)}</>;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

const TYPE_MOCKS: Partial<Record<ScheduleType, Partial<MedicineForm>>> = {
  specific_weekdays: {
    scheduleConfig: { weekdays: [1, 3, 5], time: '09:00' },
  },
  multiple_daily: {
    scheduleConfig: {
      times: [{ time: '08:00' }, { time: '13:00', dosageAmount: 2 }, { time: '20:00' }],
    },
  },
  tapering: { dosageAmount: 4 },
};

export default function EditorPreviewScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const filled = mockForm({
    name: 'Metformin',
    notes: 'Take with breakfast',
    dosageAmount: 1,
    scheduleType: 'multiple_daily',
    scheduleConfig: { times: [{ time: '08:00' }, { time: '20:00' }] },
    inventoryCount: 42,
    packageSize: 60,
    refillReminderType: 'days',
    refillReminderValue: 7,
    expirationDate: addDays(today, 200),
    maxDailyDose: 3,
    minHoursBetweenDoses: 6,
    bypassDnd: true,
  });

  return (
    <Screen
      header={
        <NavHeader
          title="Editor preview"
          right={
            <IconButton
              icon={isDark ? Sun : Moon}
              accessibilityLabel="Toggle colour scheme"
              onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
            />
          }
        />
      }>
      <ChipRow>
        {(['en', 'nl', 'tr'] as const).map((l) => (
          <Chip
            key={l}
            label={l.toUpperCase()}
            icon={Languages}
            selected={getCurrentLocale() === l}
            check
            onPress={() => setLocale(l)}
          />
        ))}
      </ChipRow>
      <View style={{ marginTop: 12 }}>
        <Button
          label="Open the real add flow"
          icon={Plus}
          variant="secondary"
          onPress={() => router.push('/medication/add')}
        />
        <Text variant="footnote" tone="secondary" style={{ marginTop: 6 }}>
          The flow only writes to the database when you press “Save medicine”.
        </Text>
      </View>

      <Block title="1 · Name + photo (empty)">
        <Preview initial={createEmptyForm()}>
          {(form, update) => <NameStep form={form} update={update} />}
        </Preview>
      </Block>

      <Block title="2 · Dose">
        <Preview initial={mockForm()}>
          {(form, update) => <DoseStep form={form} update={update} />}
        </Preview>
      </Block>

      <Block title="3 · How often?">
        <Preview initial={mockForm()}>
          {(form, update) => (
            <ScheduleTypeStep form={form} onSelect={(type) => update.setScheduleType(type)} />
          )}
        </Preview>
      </Block>

      {SCHEDULE_TYPES.map((type) => (
        <Block key={type} title={`4 · When? — ${scheduleTypeTitle(type)}`}>
          <Preview initial={mockForm({ scheduleType: type, ...TYPE_MOCKS[type] })}>
            {(form, update) => (
              <ScheduleDetailsStep form={form} update={update} minStartDate={today} />
            )}
          </Preview>
        </Block>
      ))}

      <Block title="4 · When? — no weekday picked (Next disabled)">
        <Preview initial={mockForm({ scheduleType: 'specific_weekdays' })}>
          {(form, update) => (
            <ScheduleDetailsStep
              form={form}
              update={update}
              minStartDate={today}
              issue={validateStep('when', form).issue}
            />
          )}
        </Preview>
      </Block>

      <Block title="5 · Supply">
        <Preview
          initial={mockForm({
            inventoryCount: 30,
            refillReminderType: 'doses',
            refillReminderValue: 5,
          })}>
          {(form, update) => <SupplyStep form={form} update={update} />}
        </Preview>
      </Block>

      <Block title="5 · Supply — as needed (no “Days left”)">
        <Preview initial={mockForm({ scheduleType: 'prn' })}>
          {(form, update) => <SupplyStep form={form} update={update} />}
        </Preview>
      </Block>

      <Block title="6 · Extras">
        <Preview initial={mockForm()}>
          {(form, update) => <ExtrasStep form={form} update={update} />}
        </Preview>
      </Block>

      <Block title="6 · Extras — filled">
        <Preview initial={filled}>
          {(form, update) => <ExtrasStep form={form} update={update} />}
        </Preview>
      </Block>

      <Block title="7 · Review">
        <Preview initial={filled}>{(form) => <ReviewStep form={form} onEdit={() => {}} />}</Preview>
      </Block>

      <Block title="Edit page sections (inline)">
        <Preview initial={filled}>
          {(form, update) => (
            <View style={{ gap: 12 }}>
              <NameStep form={form} update={update} variant="inline" />
              <DoseStep form={form} update={update} variant="inline" />
              <ScheduleDetailsStep
                form={form}
                update={update}
                variant="inline"
                minStartDate={today}
              />
            </View>
          )}
        </Preview>
      </Block>
    </Screen>
  );
}
