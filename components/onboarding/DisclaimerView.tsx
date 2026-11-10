/**
 * Consent (spec §5.1 step 2) and "Good to know" (§5.6).
 * Onboarding: one page, "Before you start": four short bold claims with one plain sentence each,
 * a link to the full text, the "I understand and agree" checkbox and primary "Continue".
 * `viewOnly` (You → About, or "Read the full text" from the consent page) shows the full legal
 * text as one scrolling page; `fullText` words its subtitle for a reader who hasn't agreed yet.
 *
 * @example
 * <DisclaimerView onContinue={acknowledge} continuing={saving} onExit={toWelcome} onReadFull={…} />
 * <DisclaimerView viewOnly onClose={router.back} />
 */
import * as React from 'react';
import { BackHandler, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import i18n from '@/lib/i18n';
import { Button, Card, CheckboxCard, NavHeader, Screen, Text } from '@/components/ds';
import {
  DISCLAIMER_PAGES,
  disclaimerParagraphs,
  disclaimerSummary,
  disclaimerTitle,
  type DisclaimerPage,
} from './disclaimer-content';

export interface DisclaimerViewProps {
  viewOnly?: boolean;
  /** View-only opened from the consent page (before agreeing): changes the subtitle. */
  fullText?: boolean;
  /** Onboarding: called with the box ticked. */
  onContinue?: () => void;
  continuing?: boolean;
  /** Onboarding: back (to Welcome). */
  onExit?: () => void;
  /** Onboarding: "Read the full text". */
  onReadFull?: () => void;
  /** View-only: back. */
  onClose?: () => void;
}

export function DisclaimerView(props: DisclaimerViewProps) {
  return props.viewOnly ? <DisclaimerReadOnly {...props} /> : <DisclaimerConsent {...props} />;
}

/** The `field` card with a page's paragraphs. */
function DisclaimerCard({ page }: { page: DisclaimerPage }) {
  return (
    <Card>
      <View style={{ gap: 14 }}>
        {disclaimerParagraphs(page).map((p, i) => (
          <Text key={i} variant="body">
            {p}
          </Text>
        ))}
      </View>
    </Card>
  );
}

function DisclaimerReadOnly({ onClose, fullText }: DisclaimerViewProps) {
  return (
    <Screen header={<NavHeader onBack={onClose} />}>
      <View style={{ gap: 8, marginBottom: 24 }}>
        <Text variant="title1">{i18n.t('ui.onboarding.disclaimer.title')}</Text>
        <Text variant="body" tone="secondary">
          {i18n.t(
            fullText
              ? 'ui.onboarding.disclaimer.fullSubtitle'
              : 'ui.onboarding.disclaimer.viewSubtitle'
          )}
        </Text>
      </View>
      <View style={{ gap: 28 }}>
        {DISCLAIMER_PAGES.map((page) => (
          <View key={page.key} style={{ gap: 12 }}>
            <Text variant="title3" accessibilityRole="header">
              {disclaimerTitle(page)}
            </Text>
            <DisclaimerCard page={page} />
          </View>
        ))}
      </View>
    </Screen>
  );
}

function DisclaimerConsent({ onContinue, continuing, onExit, onReadFull }: DisclaimerViewProps) {
  const [agreed, setAgreed] = React.useState(false);

  // Only while focused: the full-text page is pushed on top and must get the back press itself.
  useFocusEffect(
    React.useCallback(() => {
      if (!onExit) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onExit();
        return true;
      });
      return () => sub.remove();
    }, [onExit])
  );

  return (
    <Screen
      header={<NavHeader onBack={onExit} />}
      footer={
        <Button
          label={i18n.t('ui.onboarding.disclaimer.continue')}
          disabled={!agreed}
          loading={continuing}
          onPress={() => agreed && onContinue?.()}
        />
      }>
      <View style={{ gap: 20, paddingTop: 8 }}>
        <Text variant="title1">{i18n.t('ui.onboarding.disclaimer.consentTitle')}</Text>
        <View style={{ gap: 18 }}>
          {DISCLAIMER_PAGES.map((page) => (
            <View key={page.key} style={{ gap: 4 }}>
              <Text variant="headline" accessibilityRole="header">
                {disclaimerTitle(page)}
              </Text>
              <Text variant="body" tone="secondary">
                {disclaimerSummary(page)}
              </Text>
            </View>
          ))}
        </View>
        {onReadFull ? (
          <Button
            label={i18n.t('ui.onboarding.disclaimer.readFull')}
            variant="link"
            onPress={onReadFull}
          />
        ) : null}
        <CheckboxCard
          label={i18n.t('ui.onboarding.disclaimer.agree')}
          checked={agreed}
          onChange={setAgreed}
          disabled={continuing}
        />
      </View>
    </Screen>
  );
}
