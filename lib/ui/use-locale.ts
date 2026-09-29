/**
 * Re-render on language change.
 *
 * @example
 * function MyScreen() {
 *   useLocaleVersion(); // component re-renders after setLocale()
 *   return <Text>{i18n.t('ui.common.done')}</Text>;
 * }
 *
 * The root layout already remounts the whole navigator on locale change (keyed on this value), so
 * screens normally don't need this. Use it in components that live *outside* the navigator
 * (providers, overlays) or inside long-lived memoized trees.
 */
import { useSyncExternalStore } from 'react';
import { onLocaleChange } from '@/lib/i18n';

let version = 0;
// Registered at module load, i.e. before any component subscribes, so the version is already
// bumped when component listeners read the snapshot.
onLocaleChange(() => {
  version += 1;
});

const getSnapshot = () => version;

export function useLocaleVersion(): number {
  return useSyncExternalStore(onLocaleChange, getSnapshot, getSnapshot);
}
