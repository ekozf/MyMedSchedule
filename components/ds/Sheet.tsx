/**
 * Bottom sheet on a transparent RN `Modal`: spring slide-up, fading backdrop (tap to close),
 * grabber, drag-down-to-dismiss (from the header region, or from the content when it is scrolled
 * to the top), keyboard aware, max 92% height, sticky footer.
 *
 * The sheet stays mounted while its exit animation runs; `onDismissed` fires once it's gone
 * (use it to chain another sheet / navigation / toast safely).
 *
 * The sheet's modal hosts the app overlays (`OverlayHost`): a confirm, action sheet or toast shown
 * while it is open is presented from this sheet's modal, so it appears above it (iOS can't present
 * a second modal from the root while this one is up).
 *
 * @example
 * const [open, setOpen] = useState(false);
 * <Sheet
 *   visible={open}
 *   onClose={() => setOpen(false)}
 *   title="Supply"
 *   subtitle="Metformin"
 *   footer={<Button label="Save" size="lg" fullWidth onPress={save} />}>
 *   <Stepper value={n} onChange={setN} min={0} max={999} />
 * </Sheet>
 */
import * as React from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type KeyboardEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  ScrollView as GHScrollView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '@/lib/i18n';
import { SPRING, radii, useTheme, withAlpha } from '@/lib/theme';
import { Text } from './Text';
import { OverlayScope } from './OverlayHost';

export interface SheetProps {
  visible: boolean;
  /** Called when the user asks to close (backdrop tap, drag down, Android back). Set `visible=false`. */
  onClose: () => void;
  /** Called after the exit animation finished and the modal unmounted. */
  onDismissed?: () => void;
  title?: string;
  subtitle?: string;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  /** Sticky bottom area (actions); respects the bottom safe area. */
  footer?: React.ReactNode;
  /** Content scrolls when taller than the sheet. Default true. */
  scrollable?: boolean;
  /** Backdrop tap / drag / back button close the sheet. Default true. */
  dismissible?: boolean;
  /** Content padding. Default 20 horizontal. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Hide the grabber handle. */
  hideGrabber?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  /**
   * Host app overlays (confirm, action sheet, toast) inside this sheet while it is open.
   * Default true. Only the sheets rendered by those overlays themselves pass false.
   */
  registerOverlayHost?: boolean;
}

const DISMISS_DISTANCE = 0.25; // of sheet height
const DISMISS_VELOCITY = 900;

export function Sheet({
  visible,
  onClose,
  onDismissed,
  title,
  subtitle,
  headerLeft,
  headerRight,
  children,
  footer,
  scrollable = true,
  dismissible = true,
  contentContainerStyle,
  hideGrabber = false,
  accessibilityLabel,
  testID,
  registerOverlayHost = true,
}: SheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const [mounted, setMounted] = React.useState(visible);
  const [containerHeight, setContainerHeight] = React.useState(windowHeight);

  const offset = useSharedValue(windowHeight); // translateY of the sheet
  const appear = useSharedValue(0); // reduced-motion fade 0..1
  const sheetHeight = useSharedValue(windowHeight * 0.5);
  const scrollY = useSharedValue(0);
  const keyboardLift = useSharedValue(0);

  const visibleRef = React.useRef(visible);
  visibleRef.current = visible;
  const onDismissedRef = React.useRef(onDismissed);
  onDismissedRef.current = onDismissed;
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  // An exit callback can land after unmount (e.g. the sheet's overlay host moved); ignore it then.
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const finishExit = React.useCallback(() => {
    if (!alive.current || visibleRef.current) return; // unmounted, or re-opened during the exit
    setMounted(false);
    onDismissedRef.current?.();
  }, []);

  // Enter / exit
  React.useEffect(() => {
    if (visible) {
      if (!mounted) {
        setMounted(true);
        return; // animate once mounted
      }
      if (reduceMotion) {
        offset.value = 0;
        appear.value = withTiming(1, { duration: 200 });
      } else {
        appear.value = 1;
        offset.value = withSpring(0, SPRING);
      }
    } else if (mounted) {
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(finishExit);
      };
      if (reduceMotion) {
        appear.value = withTiming(0, { duration: 180 }, done);
      } else {
        offset.value = withTiming(
          Math.max(sheetHeight.value, 200) + 40,
          { duration: 240, easing: Easing.in(Easing.quad) },
          done
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted]);

  // Reset position when (re)mounting
  React.useLayoutEffect(() => {
    if (mounted && visible) {
      scrollY.value = 0;
      if (!reduceMotion) offset.value = windowHeight;
      else appear.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Keyboard: lift the sheet by the keyboard height minus any window shrink the OS already did.
  const kbHeight = React.useRef(0);
  const baseHeight = React.useRef(windowHeight);
  const currentHeight = React.useRef(windowHeight);
  const applyLift = React.useCallback(
    (duration = 250) => {
      const shrink = Math.max(0, baseHeight.current - currentHeight.current);
      const lift = Math.max(0, kbHeight.current - shrink);
      keyboardLift.value = withTiming(lift, { duration, easing: Easing.out(Easing.cubic) });
    },
    [keyboardLift]
  );

  React.useEffect(() => {
    if (!mounted) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt, (e: KeyboardEvent) => {
      kbHeight.current = e.endCoordinates.height;
      applyLift(e.duration || 250);
    });
    const s2 = Keyboard.addListener(hideEvt, (e: KeyboardEvent) => {
      kbHeight.current = 0;
      applyLift(e?.duration || 200);
    });
    return () => {
      s1.remove();
      s2.remove();
      kbHeight.current = 0;
      keyboardLift.value = 0;
    };
  }, [mounted, applyLift, keyboardLift]);

  const onContainerLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    currentHeight.current = h;
    if (h > baseHeight.current || kbHeight.current === 0) baseHeight.current = h;
    setContainerHeight(h);
    if (kbHeight.current > 0) applyLift(0);
  };

  const requestClose = React.useCallback(() => {
    if (dismissible) onCloseRef.current();
  }, [dismissible]);

  // Drag-to-dismiss
  const startedAtTop = useSharedValue(true);
  const endDrag = (translationY: number, velocityY: number) => {
    'worklet';
    const shouldClose =
      dismissible &&
      (translationY > sheetHeight.value * DISMISS_DISTANCE || velocityY > DISMISS_VELOCITY);
    if (shouldClose) {
      scheduleOnRN(requestClose);
    }
    // Snap back; if the parent closes, the exit animation takes over from here.
    offset.value = withSpring(0, SPRING);
  };

  const makeHandlePan = () =>
    Gesture.Pan()
      .enabled(dismissible && !reduceMotion)
      .activeOffsetY([-8, 8])
      .onUpdate((e) => {
        offset.value = e.translationY > 0 ? e.translationY : e.translationY / 6;
      })
      .onEnd((e) => endDrag(e.translationY, e.velocityY));
  const headerPan = makeHandlePan();
  const bodyPan = makeHandlePan();

  // Scrollable body: the pan only drags the sheet when the gesture started with the content at the top.
  const nativeScroll = Gesture.Native();
  const contentPan = Gesture.Pan()
    .enabled(dismissible && !reduceMotion)
    .activeOffsetY(8)
    .failOffsetX([-16, 16])
    .onStart(() => {
      startedAtTop.value = scrollY.value <= 0.5;
    })
    .onUpdate((e) => {
      if (startedAtTop.value && e.translationY > 0) offset.value = e.translationY;
    })
    .onEnd((e) => {
      if (startedAtTop.value && e.translationY > 0) endDrag(e.translationY, e.velocityY);
    });
  const scrollGesture = Gesture.Simultaneous(nativeScroll, contentPan);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    opacity: reduceMotion ? appear.value : 1,
    marginBottom: keyboardLift.value,
  }));

  const backdropStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: appear.value };
    return {
      opacity: interpolate(
        offset.value,
        [0, Math.max(sheetHeight.value, 1)],
        [1, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  const maxHeightStyle = useAnimatedStyle(() => {
    const available = containerHeight - insets.top - 8 - keyboardLift.value;
    return { maxHeight: Math.min(containerHeight * 0.92, available) };
  });

  if (!mounted) return null;

  const hasHeader = !!(title || subtitle || headerLeft || headerRight);
  const bottomPad = footer ? 0 : Math.max(insets.bottom, 12) + 12;

  const header = (
    <View>
      {hideGrabber ? (
        <View style={{ height: 12 }} />
      ) : (
        <View
          style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 6 }}
          accessible={dismissible}
          accessibilityRole={dismissible ? 'button' : undefined}
          accessibilityLabel={dismissible ? i18n.t('ui.common.a11y.dragToClose') : undefined}
          onAccessibilityTap={dismissible ? requestClose : undefined}>
          <View
            style={{
              width: 36,
              height: 5,
              borderRadius: 3,
              backgroundColor: withAlpha(colors.ink, isDark ? 0.25 : 0.18),
            }}
          />
        </View>
      )}
      {hasHeader ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 6,
            paddingBottom: 12,
            gap: 12,
            minHeight: 48,
          }}>
          {headerLeft}
          <View style={{ flex: 1 }}>
            {title ? (
              <Text variant="title3" accessibilityRole="header" numberOfLines={2}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="subhead" tone="secondary" style={{ marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerRight}
        </View>
      ) : null}
    </View>
  );

  const padding: StyleProp<ViewStyle> = [
    { paddingHorizontal: 20, paddingBottom: bottomPad, paddingTop: hasHeader ? 0 : 4 },
    contentContainerStyle,
  ];

  const content = scrollable ? (
    <GestureDetector gesture={scrollGesture}>
      <GHScrollView
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={padding}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}>
        {children}
      </GHScrollView>
    </GestureDetector>
  ) : (
    <GestureDetector gesture={bodyPan}>
      <View style={[padding, { flexShrink: 1 }]}>{children}</View>
    </GestureDetector>
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
      testID={testID}>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onContainerLayout}>
        <OverlayScope host={registerOverlayHost}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop }, backdropStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={requestClose}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('ui.common.a11y.close')}
              importantForAccessibility={dismissible ? 'yes' : 'no-hide-descendants'}
              accessibilityElementsHidden={!dismissible}
            />
          </Animated.View>
          <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <Animated.View
              accessibilityViewIsModal
              accessibilityLabel={accessibilityLabel ?? title}
              onAccessibilityEscape={requestClose}
              onLayout={(e) => {
                sheetHeight.value = e.nativeEvent.layout.height;
              }}
              style={[
                {
                  backgroundColor: colors.surfaceSolid,
                  borderTopLeftRadius: radii.sheet,
                  borderTopRightRadius: radii.sheet,
                  overflow: 'hidden',
                  shadowColor: colors.shadow,
                  shadowOpacity: isDark ? 0 : 0.12,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: -4 },
                },
                maxHeightStyle,
                sheetStyle,
              ]}>
              <GestureDetector gesture={headerPan}>{header}</GestureDetector>
              {content}
              {footer ? (
                <View
                  style={{
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: Math.max(insets.bottom, 12) + 8,
                    gap: 8,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.separator,
                  }}>
                  {footer}
                </View>
              ) : null}
            </Animated.View>
          </View>
        </OverlayScope>
      </GestureHandlerRootView>
    </Modal>
  );
}
