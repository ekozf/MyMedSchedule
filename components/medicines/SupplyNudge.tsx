/**
 * "Count my supply" after adding a scheduled medicine without a count: a sheet on the screen the
 * add flow returns to — "Metformin saved", "Want to count how many you have left? We'll show how
 * many days remain.", primary "Count my supply" (opens the supply sheet's first-count mode, which
 * turns tracking on and can set the refill reminder) and quiet "Not now".
 *
 * Never stacks with "Allow reminders?" (Today): when that sheet is going to show (reminders not
 * asked yet and not put off), this waits until it has been answered and, after "Continue", until
 * the phone's own dialog is answered too.
 *
 * The add flow calls `requestSupplyNudge(...)`; `<SupplyNudgeHost />` is mounted once in the tabs
 * layout (the screens the flow returns to live there).
 *
 * @example
 * requestSupplyNudge({ medicationId: med.id, name: med.name });
 */
import * as React from 'react';
import { View } from 'react-native';
import { create } from 'zustand';
import i18n from '@/lib/i18n';
import { formatDose } from '@/lib/ui/format';
import {
  getNotificationPermissionState,
  isAskingForPermission,
  onPermissionAskEnd,
} from '@/lib/notifications/permissions';
import { reminderPrompt } from '@/lib/notifications/use-permission';
import { exactAlarmSheet } from '@/lib/notifications/exact-alarm-prompt';
import { useStore } from '@/store';
import { Button, Sheet, Text, useToast } from '@/components/ds';
import { saveSupply } from './actions';
import { SupplySheet } from './SupplySheet';

export interface SupplyNudgeRequest {
  medicationId: string;
  name: string;
}

const useNudgeStore = create<{
  pending: SupplyNudgeRequest | null;
  set: (p: SupplyNudgeRequest | null) => void;
}>((set) => ({ pending: null, set: (pending) => set({ pending }) }));

/** Queue the sheet for the screen the add flow returns to. */
export function requestSupplyNudge(request: SupplyNudgeRequest) {
  useNudgeStore.getState().set(request);
}

/** Lets the add modal finish closing before another modal is presented. */
const AFTER_CLOSE_MS = 600;
/** After "Allow reminders?" (or the phone's dialog) has gone. */
const AFTER_PROMPT_MS = 350;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Whether Today's "Allow reminders?" sheet is about to show (or showing) for a new medicine. */
export async function reminderPromptPending(): Promise<boolean> {
  if (reminderPrompt.dismissed) return false;
  try {
    return (await getNotificationPermissionState()) === 'undetermined';
  } catch {
    return false; // not available (web / tests)
  }
}

/** Resolves once "Allow reminders?" and any phone dialog after it are done. */
export function waitForReminderPrompt(): Promise<void> {
  return new Promise((resolve) => {
    const afterAnswer = () => {
      // "Continue" starts the phone's dialog right after the answer.
      setTimeout(() => {
        if (!isAskingForPermission()) {
          resolve();
          return;
        }
        const off = onPermissionAskEnd(() => {
          off();
          resolve();
        });
      }, 0);
    };
    if (reminderPrompt.dismissed) {
      afterAnswer();
      return;
    }
    const off = reminderPrompt.subscribe(() => {
      off();
      afterAnswer();
    });
  });
}

export function SupplyNudgeHost() {
  const pending = useNudgeStore((s) => s.pending);
  const clear = useNudgeStore((s) => s.set);
  const toast = useToast();
  const profileId = useStore((s) => s.activeProfile?.id);
  const [shown, setShown] = React.useState<SupplyNudgeRequest | null>(null);
  const [open, setOpen] = React.useState(false);
  const [supplyOpen, setSupplyOpen] = React.useState(false);
  const countNext = React.useRef(false);
  const medication = useStore((s) =>
    shown ? (s.medications.find((m) => m.id === shown.medicationId) ?? null) : null
  );

  React.useEffect(() => {
    if (!pending) return;
    let alive = true;
    (async () => {
      await wait(AFTER_CLOSE_MS);
      if (await reminderPromptPending()) {
        await waitForReminderPrompt();
        await wait(AFTER_PROMPT_MS);
      }
      // The one-time "Let reminders arrive on time" sheet may follow the phone's dialog.
      if (exactAlarmSheet.open) {
        await exactAlarmSheet.whenClosed();
        await wait(AFTER_PROMPT_MS);
      }
      if (!alive) return;
      clear(null);
      countNext.current = false;
      setShown(pending);
      setOpen(true);
    })();
    return () => {
      alive = false;
    };
  }, [pending, clear]);

  return (
    <>
      <Sheet
        visible={open && !!shown}
        onClose={() => setOpen(false)}
        onDismissed={() => {
          if (countNext.current) {
            countNext.current = false;
            setSupplyOpen(true);
          }
        }}
        title={i18n.t('ui.editor.nudge.title', { name: shown?.name ?? '' })}
        scrollable={false}>
        <View style={{ gap: 20, paddingTop: 4 }}>
          <Text variant="body" tone="secondary">
            {i18n.t('ui.editor.nudge.body')}
          </Text>
          <View style={{ gap: 4 }}>
            <Button
              label={i18n.t('ui.editor.nudge.count')}
              onPress={() => {
                countNext.current = true;
                setOpen(false);
              }}
            />
            <Button
              label={i18n.t('ui.editor.nudge.notNow')}
              variant="quiet"
              onPress={() => setOpen(false)}
            />
          </View>
        </View>
      </Sheet>
      <SupplySheet
        visible={supplyOpen && !!medication}
        medication={medication}
        initialMode="set"
        onClose={() => setSupplyOpen(false)}
        onSave={async (newCount, change) => {
          if (medication) await saveSupply(medication, newCount, profileId, change);
        }}
        onSaved={(newCount) => {
          if (!medication) return;
          toast.show({
            title: i18n.t('ui.medicines.toast.supplyUpdated'),
            message: i18n.t('ui.medicines.toast.supplyNow', {
              amount: formatDose(newCount, medication.dosageUnit),
            }),
          });
        }}
      />
    </>
  );
}
