/**
 * DEV ONLY — onboarding + lock preview with mock data (no DB, no secure store, no store writes).
 * `/dev/onboarding` lists every state; `/dev/onboarding?state=<key>` renders one full screen
 * (handy for screenshots). Mock PIN is 1234.
 */
import * as React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { KeyRound, Moon, ScanFace, Sun } from 'lucide-react-native';
import i18n, { getCurrentLocale, setLocale } from '@/lib/i18n';
import {
  Chip,
  ChipRow,
  IconButton,
  ListGroup,
  ListRow,
  NavHeader,
  Screen,
  useToast,
} from '@/components/ds';
import {
  AboutYouView,
  BrandedLoading,
  DisclaimerView,
  LanguageSheet,
  LockView,
  ProtectView,
  WelcomeView,
  languageName,
  toAppLocale,
  type BiometricInfo,
  type ProtectStage,
  type ProtectViewProps,
} from '@/components/onboarding';

const FACE: BiometricInfo = { label: 'Face ID', icon: ScanFace };
const MOCK_PIN = '1234';

const STATES = {
  welcome: 'Welcome',
  'welcome-language': 'Welcome · language sheet',
  disclaimer: 'Good to know · page 1',
  'disclaimer-last': 'Good to know · last page',
  'disclaimer-agreed': 'Good to know · agreed',
  'disclaimer-view': 'Good to know · view only (from You)',
  protect: 'Protect · choices (Face ID)',
  'protect-no-bio': 'Protect · choices (no biometrics)',
  'protect-error': 'Protect · biometric failed',
  'protect-pin-create': 'Protect · choose PIN',
  'protect-pin-mismatch': 'Protect · PINs don’t match',
  'reconfigure-verify-pin': 'App lock · confirm current PIN',
  'reconfigure-verify-bio': 'App lock · confirm with Face ID',
  'reconfigure-choose': 'App lock · choices (current PIN)',
  'about-empty': 'About you · empty',
  'about-filled': 'About you · filled',
  'about-error': 'About you · error',
  'lock-pin': 'Lock · PIN',
  'lock-pin-error': 'Lock · wrong PIN',
  'lock-cooldown': 'Lock · cool-down',
  'lock-bio': 'Lock · Face ID',
  'lock-bio-error': 'Lock · Face ID failed',
  'lock-loading': 'Lock · loading',
  loading: 'Launch · loading',
} as const;

type StateKey = keyof typeof STATES;

export default function OnboardingPreview() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  if (state && state in STATES) return <PreviewState state={state as StateKey} />;
  return <StateList />;
}

function StateList() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const locale = toAppLocale(getCurrentLocale());
  return (
    <Screen
      header={
        <NavHeader
          title="Onboarding preview"
          right={
            <IconButton
              icon={isDark ? Sun : Moon}
              accessibilityLabel="Toggle colour scheme"
              onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
            />
          }
        />
      }>
      <ChipRow>
        {(['en', 'nl', 'tr'] as const).map((l) => (
          <Chip
            key={l}
            label={languageName(l)}
            selected={locale === l}
            check
            onPress={() => setLocale(l)}
          />
        ))}
      </ChipRow>
      <View style={{ height: 16 }} />
      <ListGroup header="States" footer={`Mock PIN: ${MOCK_PIN}`}>
        {(Object.keys(STATES) as StateKey[]).map((k) => (
          <ListRow
            key={k}
            title={STATES[k]}
            subtitle={`?state=${k}`}
            onPress={() => router.push(`/dev/onboarding?state=${k}` as unknown as Href)}
          />
        ))}
      </ListGroup>
    </Screen>
  );
}

const noop = () => {};

function PreviewState({ state }: { state: StateKey }) {
  const toast = useToast();
  const note = (title: string) => toast.show({ title });
  const back = () => router.back();

  switch (state) {
    case 'welcome':
    case 'welcome-language':
      return <WelcomePreview initialSheet={state === 'welcome-language'} />;
    case 'disclaimer':
      return <DisclaimerView onContinue={() => note('Continue')} onExit={back} />;
    case 'disclaimer-last':
      return <DisclaimerView initialPage={3} onContinue={() => note('Continue')} onExit={back} />;
    case 'disclaimer-agreed':
      return (
        <DisclaimerView
          initialPage={3}
          initialAgreed
          onContinue={() => note('Continue')}
          onExit={back}
        />
      );
    case 'disclaimer-view':
      return <DisclaimerView viewOnly onClose={back} />;
    case 'protect':
      return <ProtectPreview stage="choose" biometric={FACE} />;
    case 'protect-no-bio':
      return <ProtectPreview stage="choose" biometric={null} />;
    case 'protect-error':
      return (
        <ProtectPreview
          stage="choose"
          biometric={FACE}
          message={i18n.t('ui.onboarding.protect.biometricFailed', { method: FACE.label })}
        />
      );
    case 'protect-pin-create':
      return <ProtectPreview stage="pin-create" biometric={FACE} initialPin="12" />;
    case 'protect-pin-mismatch':
      return (
        <ProtectPreview
          stage="pin-confirm"
          biometric={FACE}
          initialPin="4321"
          pinError
          pinMessage={i18n.t('ui.onboarding.protect.mismatch')}
        />
      );
    case 'reconfigure-verify-pin':
      return <ProtectPreview reconfigure current="pin" stage="verify-pin" biometric={FACE} />;
    case 'reconfigure-verify-bio':
      return (
        <ProtectPreview reconfigure current="biometric" stage="verify-biometric" biometric={FACE} />
      );
    case 'reconfigure-choose':
      return <ProtectPreview reconfigure current="pin" stage="choose" biometric={FACE} />;
    case 'about-empty':
      return <AboutPreview />;
    case 'about-filled':
      return <AboutPreview initialName="Emma de Vries" />;
    case 'about-error':
      return (
        <AboutPreview initialName="Emma" error={i18n.t('ui.onboarding.profile.createError')} />
      );
    case 'lock-pin':
      return <LockPreview mode="pin" />;
    case 'lock-pin-error':
      return <LockPreview mode="pin" initialPin="9999" error />;
    case 'lock-cooldown':
      return <LockPreview mode="pin" cooldown={24} />;
    case 'lock-bio':
      return <LockPreview mode="biometric" />;
    case 'lock-bio-error':
      return (
        <LockPreview mode="biometric" message={i18n.t('ui.onboarding.lock.biometricFailed')} />
      );
    case 'lock-loading':
      return <LockView mode="loading" name="Emma de Vries" />;
    case 'loading':
      return <BrandedLoading />;
  }
}

function WelcomePreview({ initialSheet }: { initialSheet: boolean }) {
  const [open, setOpen] = React.useState(initialSheet);
  const current = toAppLocale(getCurrentLocale());
  const pending = React.useRef<ReturnType<typeof toAppLocale> | null>(null);
  return (
    <>
      <WelcomeView
        languageLabel={languageName(current)}
        onLanguagePress={() => setOpen(true)}
        onGetStarted={noop}
      />
      <LanguageSheet
        visible={open}
        current={current}
        onSelect={(l) => {
          pending.current = l;
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        onDismissed={() => {
          if (pending.current && pending.current !== current) setLocale(pending.current);
          pending.current = null;
        }}
      />
    </>
  );
}

function ProtectPreview({
  stage: initialStage,
  initialPin = '',
  pinError: initialError = false,
  pinMessage: initialMessage = null,
  ...rest
}: Partial<ProtectViewProps> & {
  stage: ProtectStage;
  biometric: BiometricInfo | null;
  initialPin?: string;
}) {
  const [stage, setStage] = React.useState<ProtectStage>(initialStage);
  const [pin, setPin] = React.useState(initialPin);
  const [pinError, setPinError] = React.useState(initialError);
  const [pinMessage, setPinMessage] = React.useState<string | null>(initialMessage ?? null);
  return (
    <ProtectView
      {...rest}
      stage={stage}
      onBack={() => (stage === 'choose' ? router.back() : setStage('choose'))}
      onChooseBiometric={noop}
      onChoosePin={() => setStage('pin-create')}
      onChooseOff={noop}
      pin={pin}
      onPinChange={(v) => {
        setPin(v);
        setPinError(false);
        setPinMessage(null);
      }}
      onPinSubmit={() => {
        setPin('');
        setStage(stage === 'pin-create' ? 'pin-confirm' : 'choose');
      }}
      pinError={pinError}
      pinMessage={pinMessage}
      confirmLength={4}
      onVerifyBiometric={() => setStage('choose')}
      onUsePin={stage === 'verify-biometric' ? () => setStage('verify-pin') : undefined}
    />
  );
}

function AboutPreview({ initialName = '', error }: { initialName?: string; error?: string }) {
  const [name, setName] = React.useState(initialName);
  return (
    <AboutYouView
      name={name}
      onNameChange={setName}
      onAvatarPress={noop}
      onStart={noop}
      error={error}
      autoFocus={false}
    />
  );
}

function LockPreview({
  mode: initialMode,
  initialPin = '',
  error = false,
  cooldown = 0,
  message: initialMessage,
}: {
  mode: 'pin' | 'biometric';
  initialPin?: string;
  error?: boolean;
  cooldown?: number;
  message?: string;
}) {
  const toast = useToast();
  const [mode, setMode] = React.useState(initialMode);
  const [pin, setPin] = React.useState(initialPin);
  const [pinError, setPinError] = React.useState(error);
  const [message, setMessage] = React.useState<string | null>(
    initialMessage ?? (error ? i18n.t('ui.onboarding.lock.wrongPin') : null)
  );
  const submit = (v: string) => {
    if (v === MOCK_PIN) {
      toast.show({ title: 'Unlocked', tone: 'success', icon: KeyRound });
      setPin('');
      return;
    }
    setPinError(true);
    setMessage(i18n.t('ui.onboarding.lock.wrongPin'));
    setTimeout(() => setPin(''), 450);
  };
  return (
    <LockView
      mode={mode}
      name="Emma de Vries"
      biometric={FACE}
      onBiometric={() => setMode('biometric')}
      onUsePin={mode === 'biometric' ? () => setMode('pin') : undefined}
      pin={pin}
      onPinChange={(v) => {
        const next = pinError ? v.slice(-1) : v;
        setPin(next);
        setPinError(false);
        setMessage(null);
        if (next.length === 6) submit(next);
      }}
      onPinSubmit={submit}
      pinError={pinError}
      message={message}
      cooldownSeconds={cooldown}
    />
  );
}
