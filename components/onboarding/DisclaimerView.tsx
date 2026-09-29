/**
 * Onboarding step 2 — "Good to know": the four disclaimer sections as swipeable pages with page
 * dots and an always-visible Next. The last page adds the "I understand and agree" check and
 * Continue (disabled until checked). `viewOnly` shows every section in one scroll with Close.
 *
 * @example
 * <DisclaimerView onContinue={acknowledge} continuing={saving} onExit={router.back} />
 * <DisclaimerView viewOnly onClose={router.back} />
 */
import * as React from 'react';
import {
  BackHandler,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { ArrowRight, Check } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { GUTTER } from '@/lib/ui/layout';
import { Button, Icon, NavHeader, PressableScale, Screen, Text, useTheme } from '@/components/ds';
import { DISCLAIMER_SECTIONS } from './disclaimer-content';
import { DisclaimerSectionCard } from './DisclaimerSectionCard';
import { OnboardingHeader } from './OnboardingHeader';
import { useEnter } from './motion';

export interface DisclaimerViewProps {
  viewOnly?: boolean;
  /** Onboarding: called with the box ticked on the last page. */
  onContinue?: () => void;
  continuing?: boolean;
  /** Onboarding: back from the first page (e.g. to Welcome). */
  onExit?: () => void;
  /** View-only: Close. */
  onClose?: () => void;
  /** Preview helpers. */
  initialPage?: number;
  initialAgreed?: boolean;
}

export function DisclaimerView(props: DisclaimerViewProps) {
  return props.viewOnly ? <DisclaimerReadOnly {...props} /> : <DisclaimerPager {...props} />;
}

function DisclaimerReadOnly({ onClose }: DisclaimerViewProps) {
  return (
    <Screen
      header={<NavHeader title={i18n.t('ui.onboarding.disclaimer.title')} onBack={onClose} />}
      footer={
        <Button
          label={i18n.t('ui.common.close')}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={onClose}
        />
      }>
      <Text variant="body" tone="secondary" style={{ marginBottom: 16, paddingHorizontal: 4 }}>
        {i18n.t('ui.onboarding.disclaimer.viewSubtitle')}
      </Text>
      <View style={{ gap: 12 }}>
        {DISCLAIMER_SECTIONS.map((s) => (
          <DisclaimerSectionCard key={s.key} section={s} compact />
        ))}
      </View>
    </Screen>
  );
}

function DisclaimerPager({
  onContinue,
  continuing = false,
  onExit,
  initialPage = 0,
  initialAgreed = false,
}: DisclaimerViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const enter = useEnter();
  const pagerRef = React.useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = React.useState(windowWidth);
  const [page, setPage] = React.useState(initialPage);
  const [agreed, setAgreed] = React.useState(initialAgreed);

  const total = DISCLAIMER_SECTIONS.length;
  const isLast = page === total - 1;

  const goTo = React.useCallback(
    (next: number, animated = !reduceMotion) => {
      const clamped = Math.max(0, Math.min(total - 1, next));
      setPage(clamped);
      pagerRef.current?.scrollTo({ x: clamped * pageWidth, animated });
    },
    [pageWidth, reduceMotion, total]
  );

  // Keep the current page in view when the width changes (rotation, first layout).
  const pageRef = React.useRef(page);
  pageRef.current = page;
  React.useEffect(() => {
    pagerRef.current?.scrollTo({ x: pageRef.current * pageWidth, animated: false });
  }, [pageWidth]);

  // Android back: previous page first.
  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pageRef.current > 0) {
        goTo(pageRef.current - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [goTo]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return;
    const p = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (p !== pageRef.current && p >= 0 && p < total) setPage(p);
  };

  const back = page > 0 ? () => goTo(page - 1) : onExit;

  return (
    <Screen
      scroll={false}
      padded={false}
      header={
        <View style={{ paddingHorizontal: GUTTER }}>
          <OnboardingHeader step={1} onBack={back} />
        </View>
      }
      footer={
        <View style={{ gap: 12 }}>
          {isLast ? <AgreeRow value={agreed} onChange={setAgreed} disabled={continuing} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <PageDots page={page} total={total} onSelect={(p) => goTo(p)} />
            <View style={{ flex: 1 }} />
            {isLast ? (
              <Button
                label={i18n.t('ui.onboarding.disclaimer.continue')}
                size="lg"
                disabled={!agreed}
                loading={continuing}
                onPress={onContinue}
                style={{ minWidth: 160 }}
              />
            ) : (
              <Button
                label={i18n.t('ui.common.next')}
                size="lg"
                icon={ArrowRight}
                iconPosition="trailing"
                onPress={() => goTo(page + 1)}
                style={{ minWidth: 160 }}
              />
            )}
          </View>
        </View>
      }>
      <Animated.View entering={enter(0)} style={{ paddingHorizontal: GUTTER, paddingBottom: 12 }}>
        <Text variant="largeTitle">{i18n.t('ui.onboarding.disclaimer.title')}</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
          {i18n.t('ui.onboarding.disclaimer.subtitle')}
        </Text>
      </Animated.View>

      <View style={{ flex: 1 }} onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          contentOffset={{ x: initialPage * pageWidth, y: 0 }}
          style={{ flex: 1 }}>
          {DISCLAIMER_SECTIONS.map((section, i) => (
            <View
              key={section.key}
              style={{ width: pageWidth }}
              accessibilityElementsHidden={i !== page}
              importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: GUTTER,
                  paddingTop: 4,
                  paddingBottom: 20,
                }}>
                <Animated.View entering={enter(1)}>
                  <Text
                    variant="footnote"
                    tone="tertiary"
                    style={{ marginBottom: 8, paddingHorizontal: 4 }}>
                    {i18n.t('ui.onboarding.disclaimer.pageOf', { page: i + 1, total })}
                  </Text>
                  <DisclaimerSectionCard section={section} />
                </Animated.View>
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

function PageDots({
  page,
  total,
  onSelect,
}: {
  page: number;
  total: number;
  onSelect: (page: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === page;
        return (
          <PressableScale
            key={i}
            haptic="tap"
            onPress={() => onSelect(i)}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('ui.onboarding.disclaimer.goToPage', {
              page: i + 1,
              total,
            })}
            accessibilityState={{ selected: active }}
            style={{ width: 24, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: active ? 10 : 8,
                height: active ? 10 : 8,
                borderRadius: 5,
                backgroundColor: active ? colors.accent : colors.inkTertiary,
                opacity: active ? 1 : 0.5,
              }}
            />
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Large tappable "I understand and agree" check row. */
export function AgreeRow({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const label = i18n.t('ui.onboarding.disclaimer.agree');
  return (
    <PressableScale
      haptic="tap"
      disabled={disabled}
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={{
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: value ? colors.successSoft : colors.surfaceSolid,
        borderWidth: 1.5,
        borderColor: value ? colors.success : colors.separator,
      }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          borderWidth: 2,
          borderColor: value ? colors.success : colors.inkTertiary,
          backgroundColor: value ? colors.success : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {value ? <Icon as={Check} size={18} color={colors.onAccent} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="headline">{label}</Text>
        {!value ? (
          <Text variant="footnote" tone="secondary">
            {i18n.t('ui.onboarding.disclaimer.agreeHint')}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}
