/**
 * Glass toast that slides in from the top (below the safe area), auto-hides (4s, 6s with an
 * action), swipe up to dismiss. One at a time: a new toast replaces the current one.
 * Mount `<ToastProvider>` once (root layout does this).
 *
 * The toast renders in the topmost `OverlayHost`: inside an open Sheet or modal screen, else on the
 * current screen. When that sheet/modal closes, the toast moves to the host underneath, so a toast
 * shown right before `router.back()` / closing a sheet stays visible on the screen below.
 *
 * @example
 * const toast = useToast();
 * toast.show({
 *   title: 'Metformin taken',
 *   tone: 'success',
 *   action: { label: 'Undo', onPress: undo },
 * });
 */
import * as React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { SPRING, statusColors, useTheme, withAlpha } from '@/lib/theme';
import { Text } from './Text';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { useOverlayLayer } from './OverlayHost';

export type ToastTone = 'default' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  /** Default icon per tone; pass `null` for none. */
  icon?: LucideIcon | null;
  action?: { label: string; onPress: () => void };
  /** ms. Default 4000, or 6000 when there is an action. */
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

const DEFAULT_ICON: Record<ToastTone, LucideIcon> = {
  default: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [toast, setToast] = React.useState<(ToastOptions & { id: number }) | null>(null);
  const idRef = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(-160);
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
    if (reduceMotion) {
      opacity.value = withTiming(0, { duration: 180 }, done);
    } else {
      opacity.value = withTiming(0, { duration: 220 });
      translateY.value = withTiming(-160, { duration: 220 }, done);
    }
  }, [opacity, reduceMotion, translateY, unmount]);

  const show = React.useCallback(
    (options: ToastOptions) => {
      clearTimer();
      idRef.current += 1;
      const id = idRef.current;
      setToast({ ...options, id });
      drag.value = 0;
      if (reduceMotion) {
        translateY.value = 0;
        opacity.value = withTiming(1, { duration: 200 });
      } else {
        translateY.value = -160;
        opacity.value = withTiming(1, { duration: 150 });
        translateY.value = withSpring(0, SPRING);
      }
      const a11y = [options.title, options.message].filter(Boolean).join('. ');
      AccessibilityInfo.announceForAccessibility?.(a11y);
      const duration = options.duration ?? (options.action ? 6000 : 4000);
      timer.current = setTimeout(hide, duration);
    },
    [drag, hide, opacity, reduceMotion, translateY]
  );

  React.useEffect(() => clearTimer, []);

  const api = React.useMemo<ToastApi>(() => ({ show, hide }), [show, hide]);

  const pan = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onUpdate((e) => {
      drag.value = e.translationY < 0 ? e.translationY : e.translationY / 8;
    })
    .onEnd((e) => {
      if (e.translationY < -24 || e.velocityY < -500) {
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
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 8, paddingHorizontal: 16 }]}>
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
      </View>
    ) : null
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

function ToastView({ toast, onAction }: { toast: ToastOptions; onAction: () => void }) {
  const { colors, isDark } = useTheme();
  const tone = toast.tone ?? 'default';
  const sc = statusColors(colors, tone === 'default' ? 'accent' : tone);
  const icon = toast.icon === null ? null : (toast.icon ?? DEFAULT_ICON[tone]);
  const ios = Platform.OS === 'ios';

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        alignSelf: 'center',
        width: '100%',
        maxWidth: 520,
        minHeight: 56,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: colors.stroke,
        backgroundColor: ios ? 'transparent' : colors.surfaceSolid,
        shadowColor: colors.shadow,
        shadowOpacity: isDark ? 0.4 : 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}>
      {ios ? (
        <>
          <BlurView
            intensity={40}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: withAlpha(colors.surfaceSolid, isDark ? 0.7 : 0.8) },
            ]}
          />
        </>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: icon ? 12 : 20,
          paddingRight: toast.action ? 6 : 20,
          paddingVertical: 8,
          gap: 12,
          minHeight: 56,
        }}>
        {icon ? (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: sc.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon as={icon} size={20} color={sc.fg} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text variant="headline" numberOfLines={2}>
            {toast.title}
          </Text>
          {toast.message ? (
            <Text variant="footnote" tone="secondary" numberOfLines={2}>
              {toast.message}
            </Text>
          ) : null}
        </View>
        {toast.action ? (
          <PressableScale
            onPress={onAction}
            accessibilityLabel={toast.action.label}
            style={{
              minHeight: 44,
              minWidth: 64,
              paddingHorizontal: 16,
              borderRadius: 22,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text variant="subhead" weight="600" tone="accent">
              {toast.action.label}
            </Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}
