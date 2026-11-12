/** Onboarding, lock and launch UI. Views are presentational (data + callbacks via props). */
export { WelcomeView, LanguageChip, type WelcomeViewProps } from './WelcomeView';
export {
  LanguageSheet,
  LanguageOptions,
  languageName,
  languageLocalName,
  toAppLocale,
  isAppLocale,
  APP_LOCALES,
  type AppLocale,
} from './LanguageSheet';
export { DisclaimerView, type DisclaimerViewProps } from './DisclaimerView';
export {
  DISCLAIMER_CHANGES,
  DISCLAIMER_PAGES,
  disclaimerChange,
  disclaimerParagraphs,
  disclaimerSummary,
  disclaimerTitle,
  type DisclaimerPage,
} from './disclaimer-content';
export {
  ProtectView,
  type ProtectViewProps,
  type ProtectStage,
  type ProtectBusy,
} from './ProtectView';
export { PinScreen, type PinScreenProps } from './PinScreen';
export { AboutYouView, type AboutYouViewProps } from './AboutYouView';
export { LockView, type LockViewProps } from './LockView';
export { BrandedLoading } from './BrandedLoading';
export { StatusLine } from './StatusLine';
export { biometricInfo, passcodeInfo, isBiometricCancel, type BiometricInfo } from './biometric';
export {
  registerPinFailure,
  registerPinSuccess,
  cooldownSecondsLeft,
  useCooldownSeconds,
  MAX_ATTEMPTS,
  COOLDOWN_MS,
  PIN_ERROR_FLASH_MS,
} from './pin-guard';
export { ONBOARDING_ROUTES, hrefForLaunchRoute } from './routes';
export {
  DISCLAIMER_VERSION,
  launchRoute,
  type LaunchRoute,
  type LaunchState,
} from './launch-route';
