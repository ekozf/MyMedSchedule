/**
 * Edit medicine: a summary list, not a long form. "Edit Metformin", then grouped rows — Medicine
 * (Name and photo, Strength, Amount), Schedule (type + times), Supply (Supply, Refill reminder),
 * Extras (Note, Limits, Reminder sound). Each row opens its page (`/medication/edit/[id]/[section]`,
 * a `SectionPage` with its own Save); the list reloads when you come back. "Reminder sound" is a
 * switch right in the list (a page holding one switch would be a detour); it saves straight away.
 *
 * Safety kept from the previous build: every save goes through `saveEditedMedicine` with the form
 * as it was loaded, so the schedule and the supply count are only written when they changed (see
 * `toUpdateInput`) — saving doesn't reset the schedule start, a moved dose or doses logged while
 * the page was open; an unchanged past start date stays valid.
 *
 * Used by `app/medication/edit/[id]/index.tsx` and `app/medication/edit/[id]/[section].tsx`.
 */
import * as React from 'react';
import { View } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { getMedicationById } from '@/lib/db/operations';
import { formatDose, useTimeFormat } from '@/lib/ui/format';
import { useStore } from '@/store';
import {
  EmptyState,
  ListGroup,
  ListRow,
  MedIcon,
  NavHeader,
  Screen,
  Text,
  goBackOrHome,
  useConfirm,
  useTheme,
  useToast,
} from '@/components/ds';
import {
  formFromMedication,
  formsEqual,
  getStartDate,
  isStartDateUnchanged,
  tracksSupply,
  type MedicineForm,
  type SectionId,
} from './form-model';
import { describeSchedule, limitsSummary, refillValue, scheduleTypeTitle } from './describe';
import { SectionPage } from './SectionPage';
import { saveEditedMedicine } from './save';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.${key}`, opts);

type LoadState = 'loading' | 'ready' | 'notFound' | 'error';

/** Loads the medicine as a form; `reload` re-reads it (on focus for the list). */
function useMedicineFormLoader(id: string | undefined, { onFocus }: { onFocus: boolean }) {
  const [state, setState] = React.useState<LoadState>('loading');
  const [form, setForm] = React.useState<MedicineForm | null>(null);
  const loaded = React.useRef(false);

  const reload = React.useCallback(async () => {
    if (!id) {
      setState('notFound');
      return;
    }
    try {
      const med = await getMedicationById(id);
      if (!med) {
        setState('notFound');
        return;
      }
      setForm(formFromMedication(med));
      setState('ready');
    } catch (error) {
      console.error('Failed to load medication:', error);
      // Keep what is on screen when a refresh fails.
      if (!loaded.current) setState('error');
    } finally {
      loaded.current = true;
    }
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      if (onFocus || !loaded.current) void reload();
    }, [onFocus, reload])
  );

  return { state, form, setForm, reload };
}

/** Loading / not found / couldn't load. */
function LoadFallback({ state }: { state: LoadState }) {
  return (
    <Screen header={<NavHeader title={t('edit.title')} />} scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {state === 'loading' ? (
          <Text variant="body" tone="secondary" align="center">
            {i18n.t('ui.common.loading')}
          </Text>
        ) : (
          <EmptyState
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

/** Shows the medicine's settings as a list; each row opens its page. */
export function EditMedicineScreen({ id }: { id: string | undefined }) {
  const { state, form, setForm } = useMedicineFormLoader(id, { onFocus: true });
  const { formatTimeString } = useTimeFormat();
  const { colors } = useTheme();
  const confirm = useConfirm();
  const [savingSound, setSavingSound] = React.useState(false);

  if (state !== 'ready' || !form || !id) return <LoadFallback state={state} />;

  const open = (section: SectionId) =>
    router.push({ pathname: '/medication/edit/[id]/[section]', params: { id, section } });

  const notSet = t('review.notSet');
  const strength = form.strength.trim();
  const notes = form.notes.trim();
  const limits = limitsSummary(form);
  const isPrn = form.scheduleType === 'prn';
  const tracked = tracksSupply(form);
  const schedule = isPrn
    ? undefined
    : describeSchedule(form.scheduleType, form.scheduleConfig, formatTimeString, form.dosageUnit);

  const setSound = async (bypassDnd: boolean) => {
    const profile = useStore.getState().activeProfile;
    if (!profile || savingSound) return;
    const before = form;
    const next = { ...form, bypassDnd };
    setForm(next);
    setSavingSound(true);
    try {
      await saveEditedMedicine(id, next, before, profile.id);
    } catch (error) {
      console.error('Failed to update medication:', error);
      setForm(before);
      await confirm({
        title: t('save.errorTitle'),
        message: i18n.t('ui.safety.couldNotSave'),
        confirmLabel: i18n.t('ui.common.close'),
      });
    } finally {
      setSavingSound(false);
    }
  };

  return (
    <Screen header={<NavHeader />}>
      <View style={{ gap: 24 }}>
        <Text variant="title1" accessibilityRole="header" style={{ paddingTop: 4 }}>
          {t('screens.editTitle', { name: form.name.trim() })}
        </Text>

        <ListGroup header={t('review.medicine')}>
          <ListRow
            title={t('screens.sectionName')}
            subtitle={form.name.trim()}
            leading={
              <MedIcon
                name={form.name}
                uri={form.imageUri}
                size="sm"
                initial
                style={{ backgroundColor: colors.bg }}
              />
            }
            onPress={() => open('name')}
          />
          <ListRow
            title={t('review.strength')}
            value={strength || notSet}
            onPress={() => open('name')}
          />
          <ListRow
            title={t('screens.sectionAmount')}
            value={formatDose(form.dosageAmount, form.dosageUnit)}
            onPress={() => open('dose')}
          />
        </ListGroup>

        <ListGroup header={t('review.schedule')}>
          <ListRow
            title={scheduleTypeTitle(form.scheduleType)}
            subtitle={schedule}
            accessibilityLabel={[
              t('screens.sectionSchedule'),
              scheduleTypeTitle(form.scheduleType),
              schedule,
            ]
              .filter(Boolean)
              .join(', ')}
            onPress={() => open('schedule')}
          />
        </ListGroup>

        <ListGroup header={t('review.supply')}>
          <ListRow
            title={t('screens.sectionSupply')}
            value={
              tracked ? formatDose(form.inventoryCount, form.dosageUnit) : t('review.notTracked')
            }
            onPress={() => open('supply')}
          />
          <ListRow
            title={t('review.refill')}
            value={refillValue(form)}
            onPress={() => open('supply')}
          />
        </ListGroup>

        <ListGroup header={t('review.extras')}>
          <ListRow
            title={t('edit.noteTitle')}
            subtitle={notes || undefined}
            value={notes ? undefined : notSet}
            onPress={() => open('note')}
          />
          <ListRow
            title={t('edit.limits')}
            subtitle={limits ?? undefined}
            value={limits ? undefined : notSet}
            onPress={() => open('limits')}
          />
          <ListRow
            title={t('extras.sound')}
            subtitle={t('extras.dnd')}
            switchValue={form.bypassDnd}
            disabled={savingSound}
            onSwitchChange={(v) => void setSound(v)}
          />
        </ListGroup>
      </View>
    </Screen>
  );
}

/** One page behind the edit list, saved on its own. */
export function EditSectionScreen({ id, section }: { id: string | undefined; section: SectionId }) {
  const { state, form: initial } = useMedicineFormLoader(id, { onFocus: false });
  if (state !== 'ready' || !initial || !id) return <LoadFallback state={state} />;
  return <EditSection id={id} section={section} initial={initial} />;
}

function EditSection({
  id,
  section,
  initial,
}: {
  id: string;
  section: SectionId;
  initial: MedicineForm;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const navigation = useNavigation();
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const savingRef = React.useRef(false);

  const minStartDate = React.useMemo(() => {
    const today = startOfDay(new Date());
    const stored = getStartDate(initial.scheduleType, initial.scheduleConfig);
    if (stored) {
      const d = startOfDay(new Date(stored));
      if (!Number.isNaN(d.getTime()) && d < today) return d;
    }
    return today;
  }, [initial.scheduleType, initial.scheduleConfig]);

  const allowPastStartDate = React.useCallback(
    (draft: MedicineForm) =>
      isStartDateUnchanged(
        draft.scheduleType,
        draft.scheduleConfig,
        initial.scheduleType,
        initial.scheduleConfig
      ),
    [initial.scheduleType, initial.scheduleConfig]
  );

  React.useEffect(() => {
    if (!leaving) return;
    const tid = setTimeout(goBackOrHome, 0);
    return () => clearTimeout(tid);
  }, [leaving]);

  usePreventRemove(dirty && !leaving, ({ data }) => {
    if (savingRef.current) return;
    confirm({
      title: t('edit.discardTitle'),
      message: t('edit.discardMessage', { name: initial.name.trim() }),
      confirmLabel: t('edit.discardConfirm'),
      cancelLabel: t('flow.keepEditing'),
      tone: 'danger',
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action);
    });
  });

  const save = async (draft: MedicineForm) => {
    if (savingRef.current) return;
    // Nothing changed: don't rewrite (that would reset the schedule start and any moved dose).
    if (formsEqual(draft, initial)) {
      setLeaving(true);
      return;
    }
    const profile = useStore.getState().activeProfile;
    if (!profile) {
      await confirm({
        title: t('save.errorTitle'),
        message: t('save.noProfileMessage'),
        confirmLabel: i18n.t('ui.common.close'),
      });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await saveEditedMedicine(id, draft, initial, profile.id);
      setLeaving(true);
      setTimeout(() => toast.show({ title: t('save.updated', { name: draft.name.trim() }) }), 300);
    } catch (error) {
      console.error('Failed to update medication:', error);
      savingRef.current = false;
      setSaving(false);
      const retry = await confirm({
        title: t('save.errorTitle'),
        message: t('save.errorMessage'),
        confirmLabel: i18n.t('ui.common.tryAgain'),
        cancelLabel: i18n.t('ui.common.close'),
      });
      if (retry) void save(draft);
    }
  };

  return (
    <SectionPage
      section={section}
      initial={initial}
      navTitle={t('screens.editTitle', { name: initial.name.trim() })}
      minStartDate={minStartDate}
      allowPastStartDate={allowPastStartDate}
      onSave={(draft) => void save(draft)}
      // The leave guard asks first when something changed.
      onCancel={goBackOrHome}
      onDirtyChange={setDirty}
      guardLeave={false}
      saving={saving}
    />
  );
}
