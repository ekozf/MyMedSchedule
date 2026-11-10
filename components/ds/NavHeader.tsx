/**
 * Header for pages without a tab bar (docs/DESIGN.md §4): 56 tall, round 48 back button on
 * `field` (chevron or ×), optional centre title (17/700 ink2), optional right text action.
 *
 * @example
 * <NavHeader />
 * <NavHeader title="1 of 4" />
 * <NavHeader backIcon="close" rightAction={{ label: 'Save', onPress: save }} />
 * <NavHeader right={<IconButton … />} />          // custom right node
 */
import * as React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { IconButton } from './IconButton';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface NavHeaderProps {
  title?: string;
  /** Default: router.back() (or go home when there is no history). */
  onBack?: () => void;
  /** Hide the back button. */
  hideBack?: boolean;
  /** 'close' shows an × (first step of a flow, modals). Default 'back'. */
  backIcon?: 'back' | 'close';
  /** Text action on the right, in accent 17/700 ("Edit", "Save", "+ Add"). */
  rightAction?: { label: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string };
  /** Custom right node (wins over `rightAction`). */
  right?: React.ReactNode;
}

export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function HeaderTextAction({
  label,
  onPress,
  disabled,
  accessibilityLabel,
}: NonNullable<NavHeaderProps['rightAction']>) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        minHeight: 48,
        minWidth: 48,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : 1,
      }}>
      <Text variant="callout" weight="700" color={colors.accent}>
        {label}
      </Text>
    </PressableScale>
  );
}

export function NavHeader({
  title,
  onBack,
  hideBack = false,
  backIcon = 'back',
  rightAction,
  right,
}: NavHeaderProps) {
  return (
    <View style={{ paddingTop: 4, paddingBottom: 0 }}>
      <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ minWidth: 48, alignItems: 'flex-start' }}>
          {hideBack ? null : (
            <IconButton
              icon={backIcon === 'close' ? X : ChevronLeft}
              accessibilityLabel={i18n.t(
                backIcon === 'close' ? 'ui.common.a11y.close' : 'ui.common.a11y.back'
              )}
              onPress={onBack ?? goBackOrHome}
            />
          )}
        </View>
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
          {title ? (
            <Text variant="callout" weight="700" tone="secondary" accessibilityRole="header">
              {title}
            </Text>
          ) : null}
        </View>
        <View style={{ minWidth: 48, alignItems: 'flex-end' }}>
          {right ?? (rightAction ? <HeaderTextAction {...rightAction} /> : null)}
        </View>
      </View>
    </View>
  );
}
