/**
 * DEV ONLY — Medicines preview. Open /dev/medicines. Renders the Medicines tab list, the detail
 * layout, the supply sheet and the as-needed sheet with MOCK data (no database, no store writes).
 */
import * as React from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Languages, Moon, Pill, Plus, Sun } from 'lucide-react-native';
import { addDays, subDays } from 'date-fns';
import i18n, { getCurrentLocale, setLocale } from '@/lib/i18n';
import {
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  IconButton,
  NavHeader,
  Screen,
  SectionHeader,
  TabHeader,
  Text,
  useToast,
} from '@/components/ds';
import { MedicineList } from '@/components/medicines/MedicineList';
import { MedicineCard } from '@/components/medicines/MedicineCard';
import { MedicineDetailContent } from '@/components/medicines/MedicineDetailContent';
import { SupplySheet } from '@/components/medicines/SupplySheet';
import { AsNeededSheet, type AsNeededResult } from '@/components/medicines/AsNeededSheet';
import { formatDose } from '@/lib/ui/format';
import type { IntakeLog, Medication } from '@/types';

const PHOTO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAEM0lEQVR4nI3TMcujShSA4f2d29jY2NjY2NjYpEmTJrDEYkBicVBGYTBMhMEwCQyRMTAoKgyKCv6Ira6wXNhi797vbU73cBjOfPsOmwGLCZMF2obegdYF5UHtQ3UAcYTnCR5nYBe4I7hdgQCkGJJ9UIgYhByQgEDCj2/f482IFzOerFjbce/ErRsrL679uDrE4hg/T/HjHLNLfEfx7RoTiFMcJyQGGkcsDnmMRBzIeIfwZuDFxJOFtY17B7cuVh6ufVwdsDji5wk/zphd8B3h2xUTwCnGCcFAccRwyDESOJB4h7LNyBYzm6xM21nvZK2bKS+r/aw6ZOKYPU/Z45yxS3ZH2e2aEchSnCUkA5pFLAt5hkQWyGyHyGaQxSSTRbRNeoe0LlEeqX1SHYg4kueJPM6EXcgdkduVECApJsk+KYkYCTlBggSS7FC+Gfli5pOVazvvnbx1c+XltZ9Xh1wc8+cpf5xzdsnvKL9dcwJ5ivOE5EDziOUhz5HIA5nvEN0Muph0sqi2ae/Q1qXKo7VPqwMVR/r8+W+I3q503yTFNCEUKI0YDTlFggaS7lCxGcViFpNVaLvonaJ1C+UVtV9UP/8UFCkuElIALSJWhLxAoghksUNsM9hissli2ma9w1qXKY/Vf1R+hVlCGFAWMRZyhgQLJNuhcjPKxSwnq9R22Ttl65bqL8qvSAm0jFgZ8hKJMpDlDvHN4IvJJ4trm/cOb13+BYgD5RHjIedI8EDyHXptxmsxX5P10vard17t/yq/oq+IvUL+QuIVyNcOic0QiykmS2hb9I74MiQiJkIukBCBFDv03oz3Yr4n663td++8vwy9I/YO+RuJdyDfOyQ3Qy6mnCypbdk7snXlF95IApURkyGXSMhAyh36bMZnMT+T9dH2p3c+rfv5AvQB+onYJ+QfJD6B/OyQ2gy1mGqylLZV76jWVcpTf70jlRAFVEVMhVwhoQKpdqjZjGYxm8lqtN30TtO6jfKa2m/+47KbFDcJaYA2EWtC3iDRBLLZoW4zusXsJqvTdtc7Xet2yutqv6sOnTh2v/217nbtCHQp7hLSAe0i1oW8Q6ILZLdDw2YMizlM1qDtoXeG1h2UN9T+UB0GcRyep+FxHthluKPhdh0IDCkeEjIAHSI2hHxAYgjksEN6M/Ri6snS2ta9o1tXK0/Xvq4OWhz186QfZ80u+o707aoJ6BTrhGigOmI65BoJHUi9Q+NmjIs5Ttao7bF3xtYdlTfW/lgdRnEcn6fxcR7ZZbyj8XYdCYwpHhMyAh0jNoZ8RGIM5LhD82bMizlP1qztuXfm1p2VN9f+XB1mcZyfp/lxntllvqP5dp0JzCmeEzIDnSM2h3xGYg7kvEPrZqyLuU7Wqu21d9bWXZW31v5aHVZxXJ+n9XFe2WW9o/V2XQmsKV4TsgJdI7aGfEViDeT64x8LAxzVaFbwzwAAAABJRU5ErkJggg==';

const now = new Date();
const started = subDays(now, 60);

function mock(partial: Partial<Medication> & Pick<Medication, 'id' | 'name'>): Medication {
  return {
    profileId: 'preview',
    dosageAmount: 1,
    dosageUnit: 'pills',
    scheduleType: 'once_daily',
    scheduleConfig: JSON.stringify({ time: '08:00' }),
    inventoryCount: 30,
    bypassDnd: false,
    isActive: true,
    isPrn: false,
    scheduleStartDate: started,
    createdAt: started,
    updatedAt: started,
    ...partial,
  };
}

const MEDS: Medication[] = [
  mock({
    id: 'metformin',
    name: 'Metformin',
    dosageAmount: 500,
    dosageUnit: 'milligrams',
    scheduleType: 'multiple_daily',
    scheduleConfig: JSON.stringify({ times: [{ time: '08:00' }, { time: '20:00' }] }),
    inventoryCount: 42000,
    packageSize: 60000,
    refillReminderType: 'days',
    refillReminderValue: 7,
    notes: 'Take with food.',
  }),
  mock({
    id: 'lisinopril',
    name: 'Lisinopril',
    scheduleConfig: JSON.stringify({ time: '08:00' }),
    inventoryCount: 4,
    packageSize: 30,
    refillReminderType: 'days',
    refillReminderValue: 7,
    maxDailyDose: 2,
    minHoursBetweenDoses: 12,
  }),
  mock({
    id: 'ibuprofen',
    name: 'Ibuprofen',
    scheduleType: 'prn',
    scheduleConfig: '{}',
    isPrn: true,
    inventoryCount: 12,
    packageSize: 20,
    refillReminderType: 'doses',
    refillReminderValue: 5,
    maxDailyDose: 6,
    minHoursBetweenDoses: 6,
    notes: 'For headaches. Not on an empty stomach.',
  }),
  mock({
    id: 'paracetamol',
    name: 'Paracetamol',
    imageUri: PHOTO,
    scheduleType: 'prn',
    scheduleConfig: '{}',
    isPrn: true,
    dosageAmount: 2,
    inventoryCount: 3,
    refillReminderType: 'doses',
    refillReminderValue: 4,
  }),
  mock({
    id: 'vitamin-d',
    name: 'Vitamin D',
    dosageAmount: 2,
    dosageUnit: 'drops',
    scheduleType: 'specific_weekdays',
    scheduleConfig: JSON.stringify({ weekdays: [1, 3, 5], time: '09:00' }),
    inventoryCount: 0,
    expirationDate: subDays(now, 3),
  }),
  mock({
    id: 'prednisone',
    name: 'Prednisone',
    dosageAmount: 4,
    dosageUnit: 'milligrams',
    scheduleType: 'tapering',
    scheduleConfig: JSON.stringify({
      startDose: 20,
      decrementAmount: 5,
      decrementIntervalDays: 3,
      startDate: subDays(now, 2).toISOString(),
      time: '07:30',
    }),
    inventoryCount: 120,
    bypassDnd: true,
    expirationDate: addDays(now, 12),
  }),
  mock({
    id: 'omeprazole',
    name: 'Omeprazole',
    dosageAmount: 20,
    dosageUnit: 'milligrams',
    isActive: false,
    inventoryCount: 8,
  }),
  mock({
    id: 'amoxicillin',
    name: 'Amoxicillin',
    scheduleType: 'every_x_hours',
    scheduleConfig: JSON.stringify({ intervalHours: 8, firstDoseTime: '07:00' }),
    isActive: false,
    inventoryCount: 0,
    imageUri: PHOTO,
  }),
];

const LAST_TAKEN: IntakeLog = {
  id: 'log-1',
  medicationId: 'lisinopril',
  profileId: 'preview',
  actualTime: subDays(now, 1),
  scheduledTime: subDays(now, 1),
  action: 'taken',
  dosageAmount: 1,
  createdAt: now,
  updatedAt: now,
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <SectionHeader title={title} />
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

export default function MedicinesPreview() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const toast = useToast();
  const [meds, setMeds] = React.useState(MEDS);
  const [detailId, setDetailId] = React.useState('lisinopril');
  const [supply, setSupply] = React.useState<null | 'add' | 'set'>(null);
  const [asNeeded, setAsNeeded] = React.useState<null | {
    key: number;
    id?: string;
    empty?: boolean;
  }>(null);
  const [asNeededVisible, setAsNeededVisible] = React.useState(false);

  const detailMed = meds.find((m) => m.id === detailId) ?? meds[0];

  const openAsNeeded = (opts: { id?: string; empty?: boolean }) => {
    setAsNeeded({ key: Date.now(), ...opts });
    setAsNeededVisible(true);
  };

  const onAsNeededDismissed = (r: AsNeededResult) => {
    if (r.type === 'logged') {
      toast.show({
        title: i18n.t('ui.medicines.toast.logged', { name: r.medication.name }),
        tone: 'success',
        action: { label: i18n.t('ui.common.undo'), onPress: () => {} },
      });
    } else if (r.type === 'addMedicine') {
      toast.show({ title: '→ /medication/add' });
    } else if (r.type === 'updateSupply') {
      toast.show({ title: `→ /medication/${r.medicationId}` });
    }
  };

  return (
    <Screen
      header={
        <NavHeader
          title="Medicines preview"
          right={
            <IconButton
              icon={isDark ? Sun : Moon}
              accessibilityLabel="Toggle colour scheme"
              onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
            />
          }
        />
      }>
      <Section title="Language">
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
      </Section>

      <TabHeader
        title={i18n.t('ui.medicines.title')}
        overline={i18n.t('ui.medicines.activeCount', {
          count: meds.filter((m) => m.isActive).length,
        })}
        right={
          <IconButton
            icon={Plus}
            variant="tinted"
            accessibilityLabel={i18n.t('ui.medicines.a11y.addMedicine')}
            onPress={() => {}}
          />
        }
      />
      <MedicineList medications={meds} onOpen={(m) => setDetailId(m.id)} initiallyShowInactive />

      <Section title="Search: no matches">
        <MedicineList medications={meds} query="zzz" onOpen={() => {}} />
      </Section>

      <Section title="Only stopped medicines">
        <MedicineList medications={meds.filter((m) => !m.isActive)} onOpen={() => {}} />
      </Section>

      <Section title="Empty tab">
        <Card>
          <EmptyState
            icon={Pill}
            title={i18n.t('ui.medicines.empty.title')}
            message={i18n.t('ui.medicines.empty.message')}
            action={{ label: i18n.t('ui.medicines.empty.action'), icon: Plus, onPress: () => {} }}
          />
        </Card>
      </Section>

      <Section title="Single card">
        <MedicineCard medication={meds[1]} onPress={() => {}} />
      </Section>

      <Section title="Detail (tap a card above or pick)">
        <ChipRow>
          {meds.map((m) => (
            <Chip
              key={m.id}
              label={m.name}
              selected={m.id === detailId}
              onPress={() => setDetailId(m.id)}
            />
          ))}
        </ChipRow>
        <Card tone="accent" padded>
          <Text variant="footnote" tone="secondary">
            Screen header: circular back button · plain “{i18n.t('ui.common.edit')}” on the right.
          </Text>
        </Card>
        <MedicineDetailContent
          medication={detailMed}
          lastTaken={detailMed.id === 'lisinopril' ? LAST_TAKEN : null}
          onLogDose={() => openAsNeeded({ id: detailMed.id })}
          onUpdateSupply={() => setSupply('add')}
          onSeeJournal={() => toast.show({ title: '→ Journal (filtered)' })}
          onToggleActive={() =>
            setMeds((all) =>
              all.map((m) => (m.id === detailMed.id ? { ...m, isActive: !m.isActive } : m))
            )
          }
          onDelete={() =>
            toast.show({ title: 'Delete (confirm sheet in the app)', tone: 'danger' })
          }
        />
      </Section>

      <Section title="Sheets">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button label="Supply · Add" variant="secondary" onPress={() => setSupply('add')} />
          <Button label="Supply · Set" variant="secondary" onPress={() => setSupply('set')} />
          <Button
            label="As needed · Ibuprofen"
            variant="secondary"
            onPress={() => openAsNeeded({ id: 'ibuprofen' })}
          />
          <Button label="As needed · picker" variant="secondary" onPress={() => openAsNeeded({})} />
          <Button
            label="As needed · none"
            variant="secondary"
            onPress={() => openAsNeeded({ empty: true })}
          />
        </View>
      </Section>

      <SupplySheet
        visible={supply !== null}
        initialMode={supply ?? 'add'}
        medication={detailMed}
        onClose={() => setSupply(null)}
        onSave={async (n) => {
          await wait(500);
          setMeds((all) =>
            all.map((m) => (m.id === detailMed.id ? { ...m, inventoryCount: n } : m))
          );
        }}
        onSaved={(n) =>
          toast.show({
            title: i18n.t('ui.medicines.toast.supplyUpdated'),
            message: i18n.t('ui.medicines.toast.supplyNow', {
              amount: formatDose(n, detailMed.dosageUnit),
            }),
            tone: 'success',
          })
        }
      />
      {asNeeded ? (
        <AsNeededSheet
          key={asNeeded.key}
          visible={asNeededVisible}
          onClose={() => setAsNeededVisible(false)}
          onDismissed={onAsNeededDismissed}
          medications={asNeeded.empty ? meds.filter((m) => !m.isPrn) : meds}
          medicationId={asNeeded.id}
          onLog={async (m, amount, notes) => {
            await wait(500);
            return {
              id: 'mock',
              medicationId: m.id,
              profileId: 'preview',
              actualTime: new Date(),
              action: 'taken',
              dosageAmount: amount,
              notes,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }}
        />
      ) : null}
    </Screen>
  );
}
