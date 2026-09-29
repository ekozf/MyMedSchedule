/**
 * Guided "Add a medicine" flow: one question per screen, animated progress bar, back chevron,
 * big sticky Next (disabled with a gentle reason until the step is valid), review with jump-back
 * rows and Save. Used by `app/medication/add.tsx`.
 */
import * as React from 'react';
import { BackHandler, Keyboard, Platform, ScrollView, View } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ChevronLeft, Trash2, X } from 'lucide-react-native';
import { startOfDay } from 'date-fns';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import {
  Button,
  IconButton,
  Screen,
  Text,
  goBackOrHome,
  haptics,
  useConfirm,
  useTheme,
  useToast,
} from '@/components/ds';
import type { ScheduleType } from '@/types';
import { stepsFor, validateAll, validateStep, type MedicineForm, type StepId } from './form-model';
import { useMedicineForm } from './useMedicineForm';
import { IssueHint } from './parts';
import { DoseStep, NameStep, ScheduleDetailsStep, ScheduleTypeStep } from './steps';
import { SupplyStep } from './SupplyStep';
import { ExtrasStep } from './ExtrasStep';
import { ReviewStep } from './ReviewStep';
import { saveNewMedicine } from './save';
import { ModalScope } from '@/components/you/ModalScope';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.${key}`, opts);
const AUTO_ADVANCE_MS = 350;

/**
 * Optional steps untouched → the footer offers "Skip for now" instead of "Next". Not the supply
 * step: with 0 left no dose can be logged, so it always says Next (the step warns about 0).
 */
function isUntouched(step: StepId, form: MedicineForm): boolean {
  if (step === 'extras') {
    return (
      !form.notes.trim() &&
      form.expirationDate === null &&
      form.maxDailyDose === null &&
      form.minHoursBetweenDoses === null &&
      !form.bypassDnd
    );
  }
  return false;
}

function FlowProgress({ progress }: { progress: number }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const value = useSharedValue(progress);
  React.useEffect(() => {
    value.value = reduceMotion ? progress : withTiming(progress, { duration: 400 });
  }, [progress, reduceMotion, value]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(value.value * 1000) / 10}%` }));
  return (
    <View
      style={{
        flex: 1,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.surfaceSunken,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[{ height: 8, borderRadius: 4, backgroundColor: colors.accent }, fill]}
      />
    </View>
  );
}

/** Native modal route: hosts the app overlays so confirms/toasts appear above the modal. */
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
  const reduceMotion = useReducedMotion();
  const scrollRef = React.useRef<ScrollView>(null);
  const today = React.useMemo(() => startOfDay(new Date()), []);

  const [step, setStep] = React.useState<StepId>('name');
  const [direction, setDirection] = React.useState<1 | -1>(1);
  // Set when the user jumped back from Review: Next returns there.
  const [returnToReview, setReturnToReview] = React.useState(false);
  // Schedule type changed during a jump from Review → visit "When?" before returning.
  const [typeChanged, setTypeChanged] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const savingRef = React.useRef(false);

  // Latest values for timers / hardware back (avoid stale closures).
  const latest = React.useRef({ form, step, returnToReview, typeChanged });
  latest.current = { form, step, returnToReview, typeChanged };
  const advanceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    []
  );

  const steps = stepsFor(form);
  const index = Math.max(0, steps.indexOf(step));
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
      icon: Trash2,
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action);
    });
  });

  const go = React.useCallback((next: StepId, dir: 1 | -1) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
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
      haptics.warning();
      if (all.step) go(all.step, -1);
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
      const { medication, notificationsAllowed } = await saveNewMedicine(f, profile.id);
      haptics.success();
      const isPrn = f.scheduleType === 'prn';
      setLeaving(true);
      // Toasts render under the modal: show it once we're back.
      setTimeout(() => {
        toast.show(
          notificationsAllowed || isPrn
            ? {
                title: t('save.added', { name: medication.name }),
                message: t(isPrn ? 'save.addedPrnMessage' : 'save.addedMessage'),
                tone: 'success',
              }
            : {
                title: t('save.added', { name: medication.name }),
                message: `${t('save.remindersOffTitle')}. ${t('save.remindersOffMessage')}`,
                tone: 'warning',
              }
        );
      }, 400);
    } catch (error) {
      console.error('Failed to create medication:', error);
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
  }, [confirm, go, toast]);

  const goNext = React.useCallback(() => {
    const { form: f, step: cur, returnToReview: back, typeChanged: changed } = latest.current;
    if (!validateStep(cur, f).ok) {
      haptics.warning();
      return;
    }
    if (cur === 'review') {
      void save();
      return;
    }
    if (back) {
      if (cur === 'type' && changed && f.scheduleType !== 'prn') {
        setTypeChanged(false);
        go('when', 1);
        return;
      }
      setReturnToReview(false);
      setTypeChanged(false);
      go('review', 1);
      return;
    }
    const list = stepsFor(f);
    const next = list[list.indexOf(cur) + 1];
    if (next) go(next, 1);
  }, [go, save]);

  const goBack = React.useCallback(() => {
    const { form: f, step: cur, returnToReview: back } = latest.current;
    if (back) {
      setReturnToReview(false);
      setTypeChanged(false);
      go('review', -1);
      return true;
    }
    const list = stepsFor(f);
    const i = list.indexOf(cur);
    if (i > 0) {
      go(list[i - 1], -1);
      return true;
    }
    return false;
  }, [go]);

  // Android back steps back through the flow before leaving it.
  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => goBack());
    return () => sub.remove();
  }, [goBack]);

  const onHeaderBack = () => {
    if (!goBack()) goBackOrHome();
  };

  const onSelectType = (type: ScheduleType) => {
    if (type !== form.scheduleType) {
      update.setScheduleType(type);
      if (returnToReview) setTypeChanged(true);
    }
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      haptics.light();
      goNext();
    }, AUTO_ADVANCE_MS);
  };

  const jumpTo = (target: StepId) => {
    setReturnToReview(true);
    setTypeChanged(false);
    go(target, -1);
  };

  // ------------------------------------------------------------------ footer
  const untouched = isUntouched(step, form);
  const pendingWhen = step === 'type' && typeChanged && form.scheduleType !== 'prn';
  let label = i18n.t('ui.common.next');
  if (step === 'review') label = t('flow.saveMedicine');
  else if (returnToReview && !pendingWhen) label = t('flow.backToReview');
  else if (untouched) label = i18n.t('ui.common.skipForNow');

  const footer = (
    <View style={{ gap: 10 }}>
      <IssueHint issue={validation.ok ? null : validation.issue} />
      <Button
        size="lg"
        fullWidth
        label={label}
        variant={untouched && !returnToReview && step !== 'review' ? 'secondary' : 'primary'}
        disabled={!validation.ok}
        loading={saving}
        onPress={goNext}
      />
    </View>
  );

  // ------------------------------------------------------------------ content
  let content: React.ReactNode = null;
  switch (step) {
    case 'name':
      content = <NameStep form={form} update={update} autoFocus onSubmit={goNext} />;
      break;
    case 'dose':
      content = <DoseStep form={form} update={update} />;
      break;
    case 'type':
      content = <ScheduleTypeStep form={form} onSelect={onSelectType} />;
      break;
    case 'when':
      content = <ScheduleDetailsStep form={form} update={update} minStartDate={today} />;
      break;
    case 'supply':
      content = <SupplyStep form={form} update={update} />;
      break;
    case 'extras':
      content = <ExtrasStep form={form} update={update} />;
      break;
    case 'review':
      content = <ReviewStep form={form} onEdit={jumpTo} />;
      break;
  }

  const entering = reduceMotion
    ? FadeIn.duration(150)
    : (direction === 1 ? FadeInRight : FadeInLeft).duration(280);

  const isFirst = index === 0 && !returnToReview;

  return (
    <Screen
      safeTop={Platform.OS !== 'ios'}
      keyboardAware
      scrollRef={scrollRef}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}>
          <IconButton
            icon={isFirst ? X : ChevronLeft}
            variant="glass"
            accessibilityLabel={i18n.t(isFirst ? 'ui.common.a11y.close' : 'ui.common.a11y.back')}
            onPress={onHeaderBack}
          />
          <View
            style={{ flex: 1 }}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={t('flow.stepOf', { step: index + 1, total: steps.length })}
            accessibilityValue={{ min: 0, max: steps.length, now: index + 1 }}>
            <FlowProgress progress={(index + 1) / steps.length} />
          </View>
          <View style={{ width: 44 }} />
        </View>
      }
      footer={footer}>
      <Animated.View key={step} entering={entering} style={{ paddingTop: 12 }}>
        <Text variant="caption" tone="secondary" style={{ marginBottom: 6 }}>
          {t('flow.stepOf', { step: index + 1, total: steps.length })}
        </Text>
        {content}
      </Animated.View>
    </Screen>
  );
}
