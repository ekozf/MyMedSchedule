/**
 * Guided "Add a medicine" flow (docs/DESIGN.md §5.4): four short questions on full pages — what
 * it's called, how much each time, when you take it (type choice with the chosen type's settings
 * right under it; as-needed has nothing more to set) and "Does this look right?". "Step n of 4"
 * text (no segment bar), a sticky Next (disabled with the reason until the step is valid), and a
 * review whose rows jump back to their step. Supply and extras are not steps: the review's
 * "Supply · Not tracked" / "Extras · None" rows open them as pages with their own Save.
 *
 * Saving returns to where the flow started. A new scheduled medicine without a counted supply
 * then gets the "Count my supply" sheet (see `SupplyNudge`, after "Allow reminders?" if that shows);
 * otherwise the toast "Metformin added. We'll remind you at 08:00 and 20:00." Used by
 * `app/medication/add.tsx`.
 */
import * as React from 'react';
import { BackHandler, Keyboard, ScrollView } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { useTimeFormat } from '@/lib/ui/format';
import { useStore } from '@/store';
import { goBackOrHome, useConfirm, useToast } from '@/components/ds';
import { ModalScope } from '@/components/you/ModalScope';
import { scheduleTimes } from '@/components/medicines/schedule-summary';
import { requestSupplyNudge } from '@/components/medicines/SupplyNudge';
import {
  FLOW_STEPS,
  validateAll,
  wantsSupplyNudge,
  validateStep,
  dropRedundantAmounts,
  type MedicineForm,
  type StepId,
} from './form-model';
import { useMedicineForm } from './useMedicineForm';
import { joinList } from './describe';
import { StepScreen } from './StepScreen';
import { DoseSection, NameSection, ScheduleSection } from './steps';
import { ReviewSection } from './ReviewStep';
import { SectionPage } from './SectionPage';
import { saveNewMedicine } from './save';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.${key}`, opts);

/** Question and one-sentence subtitle per step. */
const STEP_COPY: Record<
  'name' | 'dose' | 'schedule' | 'review',
  { title: string; helper: string }
> = {
  name: { title: 'name.title', helper: 'name.helper' },
  dose: { title: 'dose.title', helper: 'dose.helper' },
  schedule: { title: 'when.title', helper: 'type.helper' },
  review: { title: 'review.title', helper: 'review.helper' },
};

type FlowStep = keyof typeof STEP_COPY;

/** Up to this many times are listed in the "added" toast; more read as a generic sentence. */
const TOAST_MAX_TIMES = 4;

/** Toast after saving: "Metformin added. We'll remind you at 08:00 and 20:00." */
export function addedToastTitle(
  form: MedicineForm,
  name: string,
  notificationsAllowed: boolean,
  fmt: (time: string) => string
): { title: string; message?: string } {
  if (form.scheduleType === 'prn') return { title: t('screens.addedPrn', { name }) };
  if (!notificationsAllowed) return { title: t('screens.addedOff', { name }) };
  const times = scheduleTimes(form.scheduleType, form.scheduleConfig);
  if (!times.length || times.length > TOAST_MAX_TIMES) {
    return { title: t('save.added', { name }), message: t('save.addedMessage') };
  }
  return { title: t('screens.addedAt', { name, times: joinList(times.map(fmt)) }) };
}

/** Modal route: hosts the app overlays so confirms and toasts appear above it. */
export function AddMedicineFlow() {
  return (
    <ModalScope>
      <AddMedicineFlowScreen />
    </ModalScope>
  );
}

function AddMedicineFlowScreen() {
  const { form, update, isDirty } = useMedicineForm();
  const confirm = useConfirm();
  const toast = useToast();
  const navigation = useNavigation();
  const { formatTimeString } = useTimeFormat();
  const scrollRef = React.useRef<ScrollView>(null);
  const today = React.useMemo(() => startOfDay(new Date()), []);

  const [step, setStep] = React.useState<FlowStep>('name');
  const [direction, setDirection] = React.useState<1 | -1>(1);
  // Supply / extras page opened from the review.
  const [page, setPage] = React.useState<'supply' | 'extras' | null>(null);
  // Set when the user jumped back from Review: Next returns there.
  const [returnToReview, setReturnToReview] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const savingRef = React.useRef(false);

  // Latest values for the hardware back handler and async save (avoid stale closures).
  const latest = React.useRef({ form, step, returnToReview });
  latest.current = { form, step, returnToReview };

  const index = Math.max(0, FLOW_STEPS.indexOf(step));
  const validation = validateStep(step, form);

  // Leave only after the prevent-remove guard has been lifted.
  React.useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(goBackOrHome, 0);
    return () => clearTimeout(id);
  }, [leaving]);

  usePreventRemove(isDirty && !leaving, ({ data }) => {
    if (savingRef.current) return;
    confirm({
      title: t('flow.discardTitle'),
      message: t('flow.discardMessage'),
      confirmLabel: t('flow.discardConfirm'),
      cancelLabel: t('flow.keepEditing'),
      tone: 'danger',
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action);
    });
  });

  const go = React.useCallback((next: FlowStep, dir: 1 | -1) => {
    if (next !== 'name') Keyboard.dismiss();
    setDirection(dir);
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const save = React.useCallback(async () => {
    const f = latest.current.form;
    if (savingRef.current) return;
    const all = validateAll(f);
    if (!all.result.ok) {
      const target = all.step;
      if (target === 'supply' || target === 'extras') setPage(target);
      else if (target) go(target as FlowStep, -1);
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
      const { medication, notificationsAllowed } = await saveNewMedicine(f, profile.id);
      setLeaving(true);
      if (wantsSupplyNudge(f)) {
        // Shown on the screen we return to, after "Allow reminders?" if that appears.
        requestSupplyNudge({ medicationId: medication.id, name: medication.name });
      } else {
        const message = addedToastTitle(f, medication.name, notificationsAllowed, formatTimeString);
        // Toasts render inside the modal: show it once we're back on the screen we came from.
        setTimeout(() => toast.show(message), 400);
      }
    } catch (error) {
      console.error('Failed to create medication:', error);
      savingRef.current = false;
      setSaving(false);
      const retry = await confirm({
        title: t('save.errorTitle'),
        message: t('save.errorMessage'),
        confirmLabel: i18n.t('ui.common.tryAgain'),
        cancelLabel: i18n.t('ui.common.close'),
      });
      if (retry) void save();
    }
  }, [confirm, go, toast, formatTimeString]);

  const goNext = React.useCallback(() => {
    const { form: f, step: cur, returnToReview: back } = latest.current;
    if (!validateStep(cur, f).ok) return;
    if (cur === 'schedule') {
      // "Different amount at this time?" left at the usual amount means no override.
      const cleaned = dropRedundantAmounts(f);
      if (cleaned !== f) update.set({ scheduleConfig: cleaned.scheduleConfig });
    }
    if (cur === 'review') {
      void save();
      return;
    }
    if (back) {
      setReturnToReview(false);
      go('review', 1);
      return;
    }
    const next = FLOW_STEPS[FLOW_STEPS.indexOf(cur) + 1] as FlowStep | undefined;
    if (next) go(next, 1);
  }, [go, save, update]);

  const goBack = React.useCallback(() => {
    const { step: cur, returnToReview: back } = latest.current;
    if (back) {
      setReturnToReview(false);
      go('review', -1);
      return true;
    }
    const i = FLOW_STEPS.indexOf(cur);
    if (i > 0) {
      go(FLOW_STEPS[i - 1] as FlowStep, -1);
      return true;
    }
    return false;
  }, [go]);

  // Android back steps back through the flow before leaving it (a supply / extras page handles
  // its own back while open).
  React.useEffect(() => {
    if (page) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => goBack());
    return () => sub.remove();
  }, [goBack, page]);

  const jumpTo = (target: StepId) => {
    if (target === 'supply' || target === 'extras') {
      Keyboard.dismiss();
      setPage(target);
      return;
    }
    if (target === 'review') return;
    setReturnToReview(true);
    go(target as FlowStep, -1);
  };

  if (page) {
    return (
      <SectionPage
        key={page}
        section={page}
        initial={form}
        minStartDate={today}
        onSave={(draft) => {
          update.set(draft);
          setPage(null);
        }}
        onCancel={() => setPage(null)}
      />
    );
  }

  let label = i18n.t('ui.common.next');
  if (step === 'review') label = t('flow.saveMedicine');
  else if (returnToReview) label = t('flow.backToReview');

  let content: React.ReactNode = null;
  switch (step) {
    case 'name':
      content = <NameSection form={form} update={update} autoFocus onSubmit={goNext} />;
      break;
    case 'dose':
      content = <DoseSection form={form} update={update} />;
      break;
    case 'schedule':
      content = <ScheduleSection form={form} update={update} minStartDate={today} />;
      break;
    case 'review':
      content = <ReviewSection form={form} onEdit={jumpTo} />;
      break;
  }

  const isFirst = index === 0 && !returnToReview;
  const stepLabel = t('flow.stepOf', { step: index + 1, total: FLOW_STEPS.length });

  return (
    <StepScreen
      stepLabel={stepLabel}
      step={{ index: index + 1, total: FLOW_STEPS.length }}
      title={t(STEP_COPY[step].title)}
      subtitle={t(STEP_COPY[step].helper)}
      backIcon={isFirst ? 'close' : 'back'}
      onBack={() => {
        if (!goBack()) goBackOrHome();
      }}
      action={{
        label,
        onPress: goNext,
        disabled: !validation.ok,
        loading: saving,
        issue: validation.ok ? null : validation.issue,
      }}
      stepKey={step}
      direction={direction}
      scrollRef={scrollRef}>
      {content}
    </StepScreen>
  );
}
