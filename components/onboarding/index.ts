/** Onboarding, lock and launch UI. Views are presentational (data + callbacks via props). */
export { AppMark, type AppMarkProps } from './AppMark';
export { OnboardingHeader, OnboardingProgress, ONBOARDING_STEPS } from './OnboardingHeader';
export { WelcomeView, LanguageChip, type WelcomeViewProps } from './WelcomeView';
export {
  LanguageSheet,
  languageName,
  toAppLocale,
  APP_LOCALES,
  type AppLocale,
} from './LanguageSheet';
export { DisclaimerView, AgreeRow, type DisclaimerViewProps } from './DisclaimerView';
export { DisclaimerSectionCard } from './DisclaimerSectionCard';
export { DISCLAIMER_SECTIONS, type DisclaimerSection } from './disclaimer-content';
export {
  ProtectView,
  type ProtectViewProps,
  type ProtectStage,
  type ProtectBusy,
} from './ProtectView';
export { ChoiceCard } from './ChoiceCard';
export { AboutYouView, AvatarPicker, type AboutYouViewProps } from './AboutYouView';
export { LockView, type LockViewProps } from './LockView';
export { BrandedLoading } from './BrandedLoading';
export { StatusLine } from './StatusLine';
export { biometricInfo, isBiometricCancel, type BiometricInfo } from './biometric';
export {
  registerPinFailure,
  registerPinSuccess,
  cooldownSecondsLeft,
  useCooldownSeconds,
  MAX_ATTEMPTS,
  COOLDOWN_MS,
} from './pin-guard';
export { ONBOARDING_ROUTES } from './routes';
export { useEnter } from './motion';
