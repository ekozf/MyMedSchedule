/**
 * Edit medicine: one grouped page using the same section editors as the guided add flow.
 * Save in the header and as a sticky button; discard confirm when leaving with changes.
 * Used by `app/medication/edit/[id].tsx`.
 */
import * as React from 'react';
import { View } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { startOfDay } from 'date-fns';
import {
  CalendarClock,
  ChevronRight,
  CircleHelp,
  Package,
  Pill,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { getMedicationById } from '@/lib/db/operations';
import { useStore } from '@/store';
import type { ScheduleType } from '@/types';
import {
  Button,
  EmptyState,
  Icon,
  NavHeader,
  PressableScale,
  Screen,
  SectionHeader,
  Sheet,
  Text,
  goBackOrHome,
  haptics,
  radii,
  useConfirm,
  useTheme,
  useToast,
  withAlpha,
} from '@/components/ds';
import {
  formFromMedication,
  getStartDate,
  isStartDateUnchanged,
  validateAll,
  type MedicineForm,
  type StepId,
} from './form-model';
import { useMedicineForm } from './useMedicineForm';
import { IssueHint } from './parts';
import { DoseStep, NameStep, ScheduleDetailsStep } from './steps';
import { SupplyStep } from './SupplyStep';
import { ExtrasStep } from './ExtrasStep';
import { ScheduleTypeCards, SCHEDULE_TYPE_ICONS } from './ScheduleTypeCards';
import { scheduleTypeTitle } from './describe';
import { saveEditedMedicine } from './save';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.${key}`, opts);

type LoadState = 'loading' | 'ready' | 'notFound' | 'error';

/** Loads the medicine, then renders the grouped editor. */
export function EditMedicineScreen({ id }: { id: string | undefined }) {
  const [state, setState] = React.useState<LoadState>('loading');
  const [initial, setInitial] = React.useState<MedicineForm | null>(null);

  React.useEffect(() => {
    let alive = true;
    if (!id) {
      setState('notFound');
      return;
    }
    setState('loading');
    getMedicationById(id)
      .then((med) => {
        if (!alive) return;
        if (!med) {
          setState('notFound');
          return;
        }
        setInitial(formFromMedication(med));
        setState('ready');
      })
      .catch((error) => {
        console.error('Failed to load medication:', error);
        if (alive) setState('error');
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (state === 'ready' && initial && id) {
    return <EditMedicineForm id={id} initial={initial} />;
  }

  return (
    <Screen header={<NavHeader title={t('edit.title')} />} scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {state === 'loading' ? (
          <Text variant="body" tone="secondary" align="center">
            {i18n.t('ui.common.loading')}
          </Text>
        ) : (
          <EmptyState
            icon={CircleHelp}
            title={t(state === 'notFound' ? 'edit.notFoundTitle' : 'edit.loadErrorTitle')}
            message={state === 'notFound' ? t('edit.notFoundMessage') : undefined}
            action={{
              label: i18n.t('ui.common.back'),
              onPress: goBackOrHome,
              variant: 'secondary',
            }}
          />
        )}
      </View>
    </Screen>
  );
}

/** Compact "How often" row that opens the schedule-type sheet. */
function ScheduleTypeRow({ type, onPress }: { type: ScheduleType; onPress: () => void }) {
  const { colors } = useTheme();
  const title = scheduleTypeTitle(type);
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={t('edit.changeTypeA11y', { type: title })}
      style={{
        minHeight: 72,
        borderRadius: radii.row,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.stroke,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: withAlpha(colors.accent, 0.12),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon as={SCHEDULE_TYPE_ICONS[type]} size={22} tone="accent" />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="headline">{title}</Text>
      </View>
      <Text variant="body" tone="accent" weight="600">
        {t('edit.change')}
      </Text>
      <Icon as={ChevronRight} size={20} tone="tertiary" />
    </PressableScale>
  );
}

export function EditMedicineForm({ id, initial }: { id: string; initial: MedicineForm }) {
  const { form, update, isDirty } = useMedicineForm(initial);
  const confirm = useConfirm();
  const toast = useToast();
  const navigation = useNavigation();
  const [saving, setSaving] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const savingRef = React.useRef(false);
  const [typeSheet, setTypeSheet] = React.useState(false);
  const pendingType = React.useRef<ScheduleType | null>(null);

  // Keep an existing (past) start date valid as long as the user didn't change it.
  const allowPastStartDate = isStartDateUnchanged(
    form.scheduleType,
    form.scheduleConfig,
    initial.scheduleType,
    initial.scheduleConfig
  );
  const validation = validateAll(form, { allowPastStartDate });
  const issueFor = (step: StepId) =>
    !validation.result.ok && validation.step === step ? validation.result.issue : null;

  const minStartDate = React.useMemo(() => {
    const today = startOfDay(new Date());
    const stored = getStartDate(initial.scheduleType, initial.scheduleConfig);
    if (stored && form.scheduleType === initial.scheduleType) {
      const d = startOfDay(new Date(stored));
      if (!Number.isNaN(d.getTime()) && d < today) return d;
    }
    return today;
  }, [form.scheduleType, initial.scheduleType, initial.scheduleConfig]);

  React.useEffect(() => {
    if (!leaving) return;
    const tid = setTimeout(goBackOrHome, 0);
    return () => clearTimeout(tid);
  }, [leaving]);

  usePreventRemove(isDirty && !leaving, ({ data }) => {
    if (savingRef.current) return;
    confirm({
      title: t('edit.discardTitle'),
      message: t('edit.discardMessage', { name: initial.name }),
      confirmLabel: t('edit.discardConfirm'),
      cancelLabel: t('flow.keepEditing'),
      tone: 'danger',
      icon: Trash2,
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action);
    });
  });

  const save = async () => {
    if (savingRef.current) return;
    if (!validation.result.ok) {
      haptics.warning();
      return;
    }
    // Nothing changed: don't rewrite (that would reset the schedule start and any moved dose).
    if (!isDirty) {
      goBackOrHome();
      return;
    }
    const profile = useStore.getState().activeProfile;
    if (!profile) {
      await confirm({
        title: t('save.errorTitle'),
        message: t('save.noProfileMessage'),
        confirmLabel: i18n.t('ui.common.ok'),
        tone: 'warning',
      });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await saveEditedMedicine(id, form, initial, profile.id);
      haptics.success();
      setLeaving(true);
      setTimeout(
        () => toast.show({ title: t('save.updated', { name: form.name.trim() }), tone: 'success' }),
        300
      );
    } catch (error) {
      console.error('Failed to update medication:', error);
      savingRef.current = false;
      setSaving(false);
      haptics.error();
      const retry = await confirm({
        title: t('save.errorTitle'),
        message: t('save.errorMessage'),
        confirmLabel: i18n.t('ui.common.tryAgain'),
        cancelLabel: i18n.t('ui.common.close'),
        tone: 'warning',
      });
      if (retry) void save();
    }
  };

  const onTypeSheetDismissed = async () => {
    const next = pendingType.current;
    pendingType.current = null;
    if (!next || next === form.scheduleType) return;
    if (form.scheduleType !== 'prn') {
      const ok = await confirm({
        title: t('edit.changeTypeTitle'),
        message: t('edit.changeTypeMessage'),
        confirmLabel: t('edit.changeTypeConfirm'),
      });
      if (!ok) return;
    }
    update.setScheduleType(next);
  };

  const saveDisabled = !validation.result.ok;

  return (
    <Screen
      keyboardAware
      header={
        <NavHeader
          title={t('edit.title')}
          right={
            <Button
              variant="plain"
              size="sm"
              label={i18n.t('ui.common.save')}
              disabled={saveDisabled || saving}
              onPress={save}
            />
          }
        />
      }
      footer={
        <View style={{ gap: 10 }}>
          <IssueHint issue={validation.result.ok ? null : validation.result.issue} />
          <Button
            size="lg"
            fullWidth
            label={i18n.t('ui.common.save')}
            loading={saving}
            disabled={saveDisabled}
            onPress={save}
          />
        </View>
      }>
      <SectionHeader title={t('edit.basics')} icon={Tag} style={{ marginTop: 4 }} />
      <NameStep form={form} update={update} variant="inline" issue={issueFor('name')} />

      <SectionHeader title={t('edit.dose')} icon={Pill} />
      <DoseStep form={form} update={update} variant="inline" />

      <SectionHeader title={t('edit.schedule')} icon={CalendarClock} />
      <View style={{ gap: 12 }}>
        <ScheduleTypeRow type={form.scheduleType} onPress={() => setTypeSheet(true)} />
        <ScheduleDetailsStep
          form={form}
          update={update}
          variant="inline"
          minStartDate={minStartDate}
          issue={issueFor('when')}
        />
      </View>

      <SectionHeader title={t('edit.supply')} icon={Package} />
      <SupplyStep form={form} update={update} variant="inline" issue={issueFor('supply')} />

      <SectionHeader title={t('edit.extras')} icon={Sparkles} />
      <ExtrasStep
        form={form}
        update={update}
        variant="inline"
        issue={issueFor('extras')}
        canClearExpiry
      />

      <Sheet
        visible={typeSheet}
        onClose={() => setTypeSheet(false)}
        onDismissed={onTypeSheetDismissed}
        title={t('type.title')}
        subtitle={t('type.helper')}>
        <ScheduleTypeCards
          value={form.scheduleType}
          onSelect={(type) => {
            pendingType.current = type;
            setTypeSheet(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}
