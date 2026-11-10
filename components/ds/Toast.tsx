/**
 * Toast (docs/DESIGN.md §4): `inverse` fill, `onInverse` text, radius 18, 2 px `bg` border, 16 from
 * the sides and 32 above the tab bar (or 24 above the bottom safe area). Title and message share
 * one line when they fit (two lines at most). Optional action such as Undo (underlined, 700).
 * Slides up 20 px and fades in (260 ms). Hides after 3.2 s, or 8 s when it has an action so there
 * is time to undo. Swipe down to dismiss. One at a time: a new toast replaces the current one.
 * Mount `<ToastProvider>` once (root layout does this).
 *
 * The toast renders in the topmost `OverlayHost`: inside an open Sheet or modal screen, else on the
 * current screen. When that sheet/modal closes, the toast moves to the host underneath.
 *
 * @example
 * const toast = useToast();
 * toast.show({ title: 'Metformin taken', action: { label: 'Undo', onPress: undo } });
 */
import * as React from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DURATION, SPRING, TOAST_SHADOW, radii, useTheme } from '@/lib/theme';
import { useTabBarHeight } from '@/lib/ui/layout';
import { Text } from './Text';
import { PressableScale } from './PressableScale';
import { useOverlayDepth, useOverlayLayer } from './OverlayHost';

export type ToastTone = 'default' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  title: string;
  message?: string;
  /** @deprecated remove after screen rewrite — toasts look the same for every tone (still passed by components/today/useDoseActions.ts) */
  tone?: ToastTone;
  action?: { label: string; onPress: () => void };
  /** ms. Default 3200, or 8000 when there is an action. */
  duration?: number;
}

export interface ToastApi {
  show: (options: ToastOptions) => void;
  hide: () => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const RISE = 20;
const EASE = Easing.out(Easing.cubic);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [toast, setToast] = React.useState<(ToastOptions & { id: number }) | null>(null);
  const idRef = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(RISE);
  const opacity = useSharedValue(0);
  const drag = useSharedValue(0);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const unmount = React.useCallback((id: number) => {
    setToast((t) => (t && t.id === id ? null : t));
  }, []);

  const hide = React.useCallback(() => {
    clearTimer();
    const id = idRef.current;
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(unmount, id);
    };
    const duration = reduceMotion ? 1 : 200;
    translateY.value = withTiming(reduceMotion ? 0 : RISE, { duration });
    opacity.value = withTiming(0, { duration }, done);
  }, [opacity, reduceMotion, translateY, unmount]);

  const show = React.useCallback(
    (options: ToastOptions) => {
      clearTimer();
      idRef.current += 1;
      const id = idRef.current;
      setToast({ ...options, id });
      drag.value = 0;
      const duration = reduceMotion ? 1 : DURATION.toast;
      translateY.value = reduceMotion ? 0 : RISE;
      opacity.value = 0;
      translateY.value = withTiming(0, { duration, easing: EASE });
      opacity.value = withTiming(1, { duration, easing: EASE });
      const a11y = [options.title, options.message].filter(Boolean).join('. ');
      AccessibilityInfo.announceForAccessibility?.(a11y);
      const hold = options.duration ?? (options.action ? 8000 : DURATION.toastHold);
      timer.current = setTimeout(hide, hold);
    },
    [drag, hide, opacity, reduceMotion, translateY]
  );

  React.useEffect(() => clearTimer, []);

  const api = React.useMemo<ToastApi>(() => ({ show, hide }), [show, hide]);

  const pan = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onUpdate((e) => {
      drag.value = e.translationY > 0 ? e.translationY : e.translationY / 8;
    })
    .onEnd((e) => {
      if (e.translationY > 24 || e.velocityY > 500) {
        scheduleOnRN(hide);
      } else {
        drag.value = withSpring(0, SPRING);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value + drag.value }],
  }));

  useOverlayLayer(
    toast ? (
      <ToastFrame>
        <GestureDetector gesture={pan}>
          <Animated.View style={animatedStyle}>
            <ToastView
              toast={toast}
              onAction={() => {
                toast.action?.onPress();
                hide();
              }}
            />
          </Animated.View>
        </GestureDetector>
      </ToastFrame>
    ) : null
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

/** Positions the toast above the tab bar (root host) or the bottom safe area (sheets, modals). */
function ToastFrame({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const depth = useOverlayDepth();
  const tabBar = useTabBarHeight((s) => s.height);
  // 32 above the tab bar (24 above the safe area in sheets/modals) so it never sits on content
  // that ends right above the bar.
  const bottom = depth === 0 && tabBar > 0 ? tabBar + 32 : insets.bottom + 24;
  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        { justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: bottom },
      ]}>
      {children}
    </View>
  );
}

function ToastView({ toast, onAction }: { toast: ToastOptions; onAction: () => void }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        alignSelf: 'center',
        width: '100%',
        maxWidth: 520,
        minHeight: 60,
        borderRadius: radii.field,
        backgroundColor: colors.inverse,
        borderWidth: 2,
        borderColor: colors.bg,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: toast.action ? 8 : 20,
        paddingVertical: 10,
        gap: 12,
        ...TOAST_SHADOW,
      }}>
      <View style={{ flex: 1 }}>
        {/* One line when it fits ("Ibuprofen logged · 1 pill at 13:05"), at most two. */}
        <Text variant="subhead" color={colors.onInverse} numberOfLines={2}>
          {toast.title}
          {toast.message ? (
            <Text variant="footnote" color={colors.onInverse}>
              {` · ${toast.message}`}
            </Text>
          ) : null}
        </Text>
      </View>
      {toast.action ? (
        <PressableScale
          onPress={onAction}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
          style={{
            minHeight: 48,
            minWidth: 48,
            paddingHorizontal: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text
            variant="subhead"
            weight="700"
            color={colors.onInverse}
            style={{ textDecorationLine: 'underline' }}>
            {toast.action.label}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}
