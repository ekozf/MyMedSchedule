/**
 * Bottom sheet on a transparent RN `Modal` (docs/DESIGN.md §4): `bg`, top radius 28, grab handle
 * 44×5, header with `title2` + optional subtitle + round 44 close button, max 86% height.
 * Slides up in 320 ms, scrim fades; dismiss on scrim tap, drag down (from the header, or from the
 * content when it is scrolled to the top) and the back button. Keyboard aware, sticky footer.
 *
 * The sheet stays mounted while its exit animation runs; `onDismissed` fires once it's gone
 * (use it to chain another sheet / navigation / toast safely).
 *
 * The sheet's modal hosts the app overlays (`OverlayHost`): a confirm, action sheet or toast shown
 * while it is open is presented from this sheet's modal, so it appears above it (iOS can't present
 * a second modal from the root while this one is up).
 *
 * Content that expands inside a scrolling sheet (an inline editor) can call
 * `useSheetScroll()?.reveal(y, height)` with its position relative to the sheet content to scroll
 * it fully into view. Content gets 24 + the bottom safe-area inset of padding so the last button
 * never sits under the gesture bar.
 *
 * @example
 * const [open, setOpen] = useState(false);
 * <Sheet
 *   visible={open}
 *   onClose={() => setOpen(false)}
 *   title="Supply"
 *   subtitle="Metformin"
 *   footer={<Button label="Save" onPress={save} />}>
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
import { DURATION, SPRING, radii, useTheme } from '@/lib/theme';
import { X } from 'lucide-react-native';
import { Text } from './Text';
import { IconButton } from './IconButton';
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
  /** Round close button in the header. Default: true when dismissible and there is a title. */
  showClose?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  /**
   * Host app overlays (confirm, action sheet, toast) inside this sheet while it is open.
   * Default true. Only the sheets rendered by those overlays themselves pass false.
   */
  registerOverlayHost?: boolean;
}

export interface SheetScrollApi {
  /**
   * Scroll so the region [y, y + height] (relative to the top of the sheet's children) is fully
   * visible, preferring its bottom edge (where an editor's save button sits).
   */
  reveal: (y: number, height: number) => void;
}

const SheetScrollContext = React.createContext<SheetScrollApi | null>(null);

/** The open sheet's scroll helpers; null outside a scrollable sheet. */
export function useSheetScroll(): SheetScrollApi | null {
  return React.useContext(SheetScrollContext);
}

const DISMISS_DISTANCE = 0.25; // of sheet height
const SHEET_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
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
  showClose,
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
  const scrollRef = React.useRef<React.ComponentRef<typeof GHScrollView>>(null);
  const viewportHeight = React.useRef(0);
  const contentTop = React.useRef(0);
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
        appear.value = withTiming(1, { duration: 1 });
      } else {
        appear.value = 1;
        offset.value = withTiming(0, { duration: DURATION.sheet, easing: SHEET_EASING });
      }
    } else if (mounted) {
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(finishExit);
      };
      if (reduceMotion) {
        appear.value = withTiming(0, { duration: 1 }, done);
      } else {
        offset.value = withTiming(
          Math.max(sheetHeight.value, 200) + 40,
          { duration: DURATION.scrim, easing: Easing.in(Easing.quad) },
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

  const scrollApi = React.useMemo<SheetScrollApi>(
    () => ({
      reveal: (y, height) => {
        // Wait a frame so the sheet and the viewport have their new layout.
        setTimeout(() => {
          const viewport = viewportHeight.current;
          if (!scrollRef.current || viewport <= 0) return;
          const top = contentTop.current + y;
          const bottom = top + height + 24; // keep a little air under the last button
          const current = scrollY.value;
          let target: number | null = null;
          if (bottom > current + viewport) target = Math.min(top, bottom - viewport);
          else if (top < current) target = top;
          if (target !== null) {
            scrollRef.current.scrollTo({ y: Math.max(0, target), animated: !reduceMotion });
          }
        }, 60);
      },
    }),
    [scrollY, reduceMotion]
  );

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
    return { maxHeight: Math.min(containerHeight * 0.86, available) };
  });

  if (!mounted) return null;

  const closeVisible = showClose ?? (dismissible && !!title);
  const hasHeader = !!(title || subtitle || headerLeft || headerRight || closeVisible);
  const bottomPad = footer ? 0 : insets.bottom + 24;
  // Children start below the content padding (0 with a header, 4 without).
  contentTop.current = hasHeader ? 0 : 4;

  const header = (
    <View>
      {hideGrabber ? (
        <View style={{ height: 12 }} />
      ) : (
        <View
          style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}
          accessible={dismissible}
          accessibilityRole={dismissible ? 'button' : undefined}
          accessibilityLabel={dismissible ? i18n.t('ui.common.a11y.dragToClose') : undefined}
          onAccessibilityTap={dismissible ? requestClose : undefined}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line2 }} />
        </View>
      )}
      {hasHeader ? (
        // row-reverse: the close button comes first in focus order but sits on the right.
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'flex-start',
            paddingHorizontal: 20,
            paddingTop: 6,
            paddingBottom: 16,
            gap: 12,
            minHeight: 56,
          }}>
          {closeVisible ? (
            <IconButton
              icon={X}
              size="sm"
              accessibilityLabel={i18n.t('ui.common.a11y.close')}
              onPress={requestClose}
            />
          ) : null}
          {headerRight}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {headerLeft}
            <View style={{ flex: 1, paddingTop: 4 }}>
              {title ? (
                <Text variant="title2" accessibilityRole="header">
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
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
        ref={scrollRef}
        onLayout={(e) => {
          viewportHeight.current = e.nativeEvent.layout.height;
        }}
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
        <SheetScrollContext.Provider value={scrollApi}>{children}</SheetScrollContext.Provider>
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
                  backgroundColor: colors.bg,
                  borderTopLeftRadius: radii.sheet,
                  borderTopRightRadius: radii.sheet,
                  overflow: 'hidden',
                  // Dark mode: bg on a dark scrim has no edge, so draw a 1 px top border.
                  borderTopWidth: isDark ? 1 : 0,
                  borderLeftWidth: isDark ? 1 : 0,
                  borderRightWidth: isDark ? 1 : 0,
                  borderColor: isDark ? colors.line2 : 'transparent',
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
