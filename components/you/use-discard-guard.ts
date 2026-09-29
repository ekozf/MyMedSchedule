/**
 * Asks "Discard your changes?" when leaving a form with unsaved changes (back/close button,
 * Android back, iOS swipe-down). Call `allowLeave()` right before navigating away after saving.
 *
 * @example
 * const { allowLeave } = useDiscardGuard(dirty && !saving);
 * await save(); allowLeave(); router.back();
 */
import * as React from 'react';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { Undo2 } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useConfirm } from '@/components/ds';

export function useDiscardGuard(active: boolean) {
  const navigation = useNavigation();
  const confirm = useConfirm();
  const allowed = React.useRef(false);

  usePreventRemove(active, ({ data }) => {
    if (allowed.current) {
      navigation.dispatch(data.action);
      return;
    }
    confirm({
      title: i18n.t('ui.you.form.discardTitle'),
      message: i18n.t('ui.you.form.discardMessage'),
      confirmLabel: i18n.t('ui.you.form.discardConfirm'),
      cancelLabel: i18n.t('ui.you.form.keepEditing'),
      tone: 'danger',
      icon: Undo2,
    }).then((ok) => {
      if (!ok) return;
      allowed.current = true;
      navigation.dispatch(data.action);
    });
  });

  const allowLeave = React.useCallback(() => {
    allowed.current = true;
  }, []);

  return { allowLeave };
}
