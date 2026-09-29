/**
 * Quick add sheet opened by the tab bar's + button.
 * Routes: /medication/add · /log/as-needed[?medicationId=] (only with active as-needed medicines)
 * · /log/past. Navigation happens after the sheet has closed.
 */
import * as React from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight, History, PillBottle, Plus, type LucideIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import { statusColors, useTheme } from '@/lib/theme';
import { Sheet, PressableScale, Text, Icon } from '@/components/ds';

export interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function QuickAddSheet({ visible, onClose }: QuickAddSheetProps) {
  const medications = useStore((s) => s.medications);
  const prnMeds = React.useMemo(
    () => medications.filter((m) => m.isActive && m.isPrn),
    [medications]
  );
  const pending = React.useRef<Href | null>(null);

  const go = (href: Href) => {
    pending.current = href;
    onClose();
  };

  const onDismissed = () => {
    const href = pending.current;
    pending.current = null;
    if (href) router.push(href);
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        pending.current = null;
        onClose();
      }}
      onDismissed={onDismissed}
      title={i18n.t('ui.shell.quickAdd.title')}>
      <View style={{ gap: 10 }}>
        <QuickRow
          icon={Plus}
          tint="accent"
          title={i18n.t('ui.shell.quickAdd.addMedicine')}
          hint={i18n.t('ui.shell.quickAdd.addMedicineHint')}
          onPress={() => go('/medication/add')}
        />
        {prnMeds.length > 0 ? (
          <QuickRow
            icon={PillBottle}
            tint="success"
            title={i18n.t('ui.shell.quickAdd.logAsNeeded')}
            hint={i18n.t('ui.shell.quickAdd.logAsNeededHint')}
            onPress={() =>
              go(
                prnMeds.length === 1
                  ? { pathname: '/log/as-needed', params: { medicationId: prnMeds[0].id } }
                  : '/log/as-needed'
              )
            }
          />
        ) : null}
        <QuickRow
          icon={History}
          tint="warning"
          title={i18n.t('ui.shell.quickAdd.logPast')}
          hint={i18n.t('ui.shell.quickAdd.logPastHint')}
          onPress={() => go('/log/past')}
        />
      </View>
    </Sheet>
  );
}

function QuickRow({
  icon,
  tint,
  title,
  hint,
  onPress,
}: {
  icon: LucideIcon;
  tint: 'accent' | 'success' | 'warning';
  title: string;
  hint: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const color = colors[tint];
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={hint}
      style={{
        minHeight: 76,
        borderRadius: 20,
        backgroundColor: colors.surfaceSunken,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 14,
      }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: statusColors(colors, tint).bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon as={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="headline">{title}</Text>
        <Text variant="subhead" tone="secondary">
          {hint}
        </Text>
      </View>
      <Icon as={ChevronRight} size={20} tone="tertiary" />
    </PressableScale>
  );
}
