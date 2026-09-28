/**
 * Header for stack screens: circular glass back button, optional title, optional right action.
 *
 * @example
 * <NavHeader right={<Button variant="plain" size="sm" label="Edit" onPress={edit} />} />
 * <NavHeader title="Supply" />                 // small centred title
 * <NavHeader title="Edit medicine" largeTitle /> // large title below the bar
 * <NavHeader title="Export" backIcon="close" /> // modal: X instead of chevron
 */
import * as React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface NavHeaderProps {
  title?: string;
  /** Default: router.back() (or go home when there is no history). */
  onBack?: () => void;
  /** Hide the back button (e.g. first step of a flow that has its own close). */
  hideBack?: boolean;
  /** 'close' shows an X (for modals). Default 'back'. */
  backIcon?: 'back' | 'close';
  right?: React.ReactNode;
  /** Render `title` as a large title below the bar instead of centred. */
  largeTitle?: boolean;
}

export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function NavHeader({
  title,
  onBack,
  hideBack = false,
  backIcon = 'back',
  right,
  largeTitle = false,
}: NavHeaderProps) {
  return (
    <View style={{ paddingTop: 4, paddingBottom: largeTitle ? 8 : 4 }}>
      <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ minWidth: 48, alignItems: 'flex-start' }}>
          {hideBack ? null : (
            <IconButton
              icon={backIcon === 'close' ? X : ChevronLeft}
              variant="glass"
              accessibilityLabel={i18n.t(
                backIcon === 'close' ? 'ui.common.a11y.close' : 'ui.common.a11y.back'
              )}
              onPress={onBack ?? goBackOrHome}
            />
          )}
        </View>
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
          {title && !largeTitle ? (
            <Text variant="headline" numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
        </View>
        <View style={{ minWidth: 48, alignItems: 'flex-end' }}>{right}</View>
      </View>
      {title && largeTitle ? (
        <Text variant="largeTitle" style={{ marginTop: 8 }}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}
