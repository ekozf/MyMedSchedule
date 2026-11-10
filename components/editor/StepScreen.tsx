/**
 * Chrome of one editor page: the add-medicine steps (docs/DESIGN.md §5.4) and the edit pages.
 * NavHeader (× on the first step, ‹ after; optional centre title), "Step n of 4" (add flow only),
 * the `title1` question with a one-sentence subtitle, the controls, and a sticky footer with the
 * primary action (disabled until valid, with the reason written above it). Under the step text,
 * four 8 px dots (accent for done and current, `field2` for the rest); they are decorative: the
 * step text says where you are, and the header carries it as its accessibility label.
 *
 * @example
 * <StepScreen
 *   stepLabel="Step 3 of 4"
 *   title="When do you take it?" subtitle="Pick what fits. You can change it later."
 *   onBack={back} action={{ label: 'Next', onPress: next, disabled: !ok, issue }}>
 *   …
 * </StepScreen>
 */
import * as React from 'react';
import { View, type ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  useReducedMotion,
} from 'react-native-reanimated';
import { Button, NavHeader, Screen, Text, useTheme } from '@/components/ds';
import type { StepIssue } from './form-model';
import { IssueHint } from './parts';

export interface StepScreenProps {
  /** "Step 3 of 4" (add flow). Also the header's accessibility label. Omit on edit pages. */
  stepLabel?: string;
  /** Position for the progress dots under the step text (1-based). Add flow only. */
  step?: { index: number; total: number };
  /** Small centre title in the NavHeader (edit pages: "Edit Metformin"). */
  navTitle?: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  backIcon?: 'back' | 'close';
  action: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    issue?: StepIssue | null;
  };
  /** Optional quiet action under the primary one ("Skip for now"). */
  secondaryAction?: { label: string; onPress: () => void; disabled?: boolean };
  /** Changes when the step changes (re-runs the enter animation). */
  stepKey: string;
  /** 1 = forward (content comes from the right), -1 = back. */
  direction?: 1 | -1;
  scrollRef?: React.Ref<ScrollView>;
  /** Apply the top safe area (false for iOS page-sheet modals). Default true. */
  safeTop?: boolean;
  children: React.ReactNode;
}

export function StepScreen({
  stepLabel,
  step,
  navTitle,
  title,
  subtitle,
  onBack,
  backIcon = 'back',
  action,
  secondaryAction,
  stepKey,
  direction = 1,
  scrollRef,
  safeTop = true,
  children,
}: StepScreenProps) {
  const reduceMotion = useReducedMotion();
  // The scroll content ends a footer's height (+16) above the bottom, so the last option is
  // always reachable above the sticky button, whatever the footer holds (hint, second button).
  const [footerHeight, setFooterHeight] = React.useState(0);
  const entering = reduceMotion
    ? undefined
    : (direction === 1 ? FadeInRight : FadeInLeft).duration(260);

  return (
    <Screen
      safeTop={safeTop}
      keyboardAware
      scrollRef={scrollRef}
      contentContainerStyle={{ paddingBottom: footerHeight + 16 }}
      header={
        <View accessibilityLabel={stepLabel}>
          <NavHeader title={navTitle} backIcon={backIcon} onBack={onBack} />
        </View>
      }
      footer={
        <View
          style={{ gap: 10 }}
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            setFooterHeight((prev) => (prev === h ? prev : h));
          }}>
          <IssueHint issue={action.disabled ? action.issue : null} />
          <Button
            label={action.label}
            onPress={action.onPress}
            disabled={action.disabled}
            loading={action.loading}
          />
          {secondaryAction ? (
            <Button
              label={secondaryAction.label}
              variant="quiet"
              onPress={secondaryAction.onPress}
              disabled={secondaryAction.disabled || action.loading}
              style={{ marginTop: -4 }}
            />
          ) : null}
        </View>
      }>
      <Animated.View
        key={stepKey}
        entering={reduceMotion ? FadeIn.duration(1) : entering}
        style={{ paddingTop: 8, gap: 20 }}>
        <View style={{ gap: 8 }}>
          {stepLabel ? (
            <View style={{ gap: 8 }}>
              <Text variant="footnote" weight="700" tone="secondary">
                {stepLabel}
              </Text>
              {step ? <StepDots index={step.index} total={step.total} /> : null}
            </View>
          ) : null}
          <Text variant="title1" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </Animated.View>
    </Screen>
  );
}

/** Four 8 px progress dots: accent up to the current step, `field2` after. Decorative. */
function StepDots({ index, total }: { index: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i < index ? colors.accent : colors.field2,
          }}
        />
      ))}
    </View>
  );
}
