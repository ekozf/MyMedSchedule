/**
 * One editor page with its own Save: the add flow's supply / extras pages (opened from the review)
 * and every page behind the edit list ("Name and photo", "Amount", "Schedule", "Supply", "Expiry
 * date", "Note", "Limits"), plus "Remind me when running low" (just the refill reminder, from the medicine page). It edits a draft of the form; Save validates that page and hands the draft to
 * `onSave`, back discards it (asking first when something changed).
 *
 * Supply: Save with the count still at 0 first shows the sentence about a count of 0 (not tracked
 * / we'll ask before each dose) and stays; pressing Save again saves.
 *
 * @example
 * <SectionPage
 *   section="supply"
 *   initial={form}
 *   minStartDate={today}
 *   onSave={(draft) => update.set(draft)}
 *   onCancel={() => setPage(null)}
 * />
 */
import * as React from 'react';
import { BackHandler } from 'react-native';
import i18n from '@/lib/i18n';
import { useConfirm } from '@/components/ds';
import {
  dropRedundantAmounts,
  sectionStep,
  validateStep,
  type MedicineForm,
  type SectionId,
} from './form-model';
import { useMedicineForm } from './useMedicineForm';
import { StepScreen } from './StepScreen';
import { DoseSection, NameSection, ScheduleSection } from './steps';
import { SupplySection } from './SupplyStep';
import { ExtrasSection } from './ExtrasStep';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.editor.${key}`, opts);

export { isSectionId, sectionStep, type SectionId } from './form-model';

/** Question and subtitle per page (the add-flow wording; Note / Limits have their own). */
export const SECTION_COPY: Record<SectionId, { title: string; helper: string }> = {
  name: { title: 'name.title', helper: 'name.helper' },
  dose: { title: 'dose.title', helper: 'dose.helper' },
  schedule: { title: 'when.title', helper: 'type.helper' },
  supply: { title: 'supply.title', helper: 'supply.helper' },
  refill: { title: 'supply.refillTitle', helper: 'supply.refillPageHelper' },
  extras: { title: 'extras.title', helper: 'extras.helper' },
  note: { title: 'edit.noteTitle', helper: 'extras.notesHelper' },
  limits: { title: 'extras.safety', helper: 'extras.safetyHint' },
  expiry: { title: 'edit.expiryTitle', helper: 'edit.expiryHelper' },
};

export interface SectionPageProps {
  section: SectionId;
  initial: MedicineForm;
  /** Small centre title ("Edit Metformin"). */
  navTitle?: string;
  minStartDate: Date;
  /** Edit: keep an unchanged past start date valid. */
  allowPastStartDate?: (draft: MedicineForm) => boolean;
  onSave: (draft: MedicineForm) => void;
  /** Leave without saving (after the discard question when something changed). */
  onCancel: () => void;
  /** Reports unsaved changes (a route uses it for its leave guard). */
  onDirtyChange?: (dirty: boolean) => void;
  /**
   * Guard leaving here: Android back and ‹ ask before dropping changes. Off for routes, which
   * guard leaving with `usePreventRemove` (then ‹ just calls `onCancel`).
   */
  guardLeave?: boolean;
  saving?: boolean;
  safeTop?: boolean;
}

export function SectionPage({
  section,
  initial,
  navTitle,
  minStartDate,
  allowPastStartDate,
  onSave,
  onCancel,
  onDirtyChange,
  guardLeave = true,
  saving = false,
  safeTop,
}: SectionPageProps) {
  const { form, update, isDirty } = useMedicineForm(initial);
  const confirm = useConfirm();
  const [zeroNote, setZeroNote] = React.useState(false);
  const step = sectionStep(section);
  const validation = validateStep(step, form, {
    allowPastStartDate: allowPastStartDate?.(form),
  });

  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const latest = React.useRef({ isDirty, onCancel });
  latest.current = { isDirty, onCancel };

  const requestClose = React.useCallback(async () => {
    const { isDirty: dirty, onCancel: cancel } = latest.current;
    if (!dirty || !guardLeave) {
      cancel();
      return;
    }
    const ok = await confirm({
      title: t('edit.discardTitle'),
      message: t('edit.discardMessage', { name: initial.name.trim() || '—' }),
      confirmLabel: t('edit.discardConfirm'),
      cancelLabel: t('flow.keepEditing'),
      tone: 'danger',
    });
    if (ok) latest.current.onCancel();
  }, [confirm, guardLeave, initial.name]);

  React.useEffect(() => {
    if (!guardLeave) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      void requestClose();
      return true;
    });
    return () => sub.remove();
  }, [guardLeave, requestClose]);

  const save = () => {
    if (!validation.ok || saving) return;
    if (section === 'supply' && form.inventoryCount <= 0 && !zeroNote) {
      setZeroNote(true);
      return;
    }
    onSave(section === 'schedule' ? dropRedundantAmounts(form) : form);
  };

  const issue = validation.ok ? null : validation.issue;
  let content: React.ReactNode = null;
  switch (section) {
    case 'name':
      content = <NameSection form={form} update={update} issue={issue} onSubmit={save} />;
      break;
    case 'dose':
      content = <DoseSection form={form} update={update} />;
      break;
    case 'schedule':
      content = (
        <ScheduleSection form={form} update={update} minStartDate={minStartDate} issue={issue} />
      );
      break;
    case 'supply':
      content = <SupplySection form={form} update={update} issue={issue} showZeroNote={zeroNote} />;
      break;
    case 'refill':
      content = <SupplySection form={form} update={update} issue={issue} part="refill" />;
      break;
    case 'extras':
    case 'note':
    case 'limits':
    case 'expiry':
      content = (
        <ExtrasSection
          form={form}
          update={update}
          issue={issue}
          part={section === 'extras' ? 'all' : section}
        />
      );
      break;
  }

  return (
    <StepScreen
      navTitle={navTitle}
      title={t(SECTION_COPY[section].title)}
      subtitle={t(SECTION_COPY[section].helper)}
      backIcon="back"
      onBack={() => void requestClose()}
      stepKey={`section-${section}`}
      safeTop={safeTop}
      action={{
        label: i18n.t('ui.common.save'),
        onPress: save,
        disabled: !validation.ok,
        loading: saving,
        issue,
      }}>
      {content}
    </StepScreen>
  );
}
