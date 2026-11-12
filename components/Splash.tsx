/**
 * JS continuation of the native splash: the same background and tray glyph at the same size and
 * place, plus the "MyMedSchedule" wordmark under it. The native splash is hidden once the glyph
 * image has loaded, so the handoff doesn't move anything; the wordmark then fades in (150 ms) as
 * soon as Atkinson Hyperlegible Next is loaded. When the app is ready the whole view fades out
 * (200 ms) and unmounts. No minimum on-screen time.
 *
 * Geometry: Android 12+ draws the splash icon in a 288 dp box centred in the window (the generated
 * `splashscreen_logo` is the whole 1024 px image at 288 dp); iOS draws it `imageWidth` (200 pt)
 * wide, centred. The scheme is fixed at mount from the phone's setting, like the native splash.
 *
 * @example
 * <Splash ready={appReady} fontReady={fontsLoaded && !fontError} />
 */
import * as React from 'react';
import { Appearance, Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { fontFamily, palette } from '@/lib/theme';

const ICON_LIGHT = require('@/assets/images/splash-icon.png');
const ICON_DARK = require('@/assets/images/splash-icon-dark.png');

/** Size of the splash image, matching the native splash per platform. */
const ICON_SIZE = Platform.OS === 'android' ? 288 : 200;
/** The tray glyph spans 482 of the image's 1024 px. */
const GLYPH_SIZE = ICON_SIZE * (482 / 1024);
const WORDMARK_GAP = 28;
/** Never keep the native splash up longer than this, even if the image doesn't report a load. */
const HIDE_NATIVE_FALLBACK_MS = 1500;

function hideNativeSplash() {
  SplashScreen.hideAsync().catch(() => {});
}

export function Splash({ ready, fontReady }: { ready: boolean; fontReady: boolean }) {
  const reduceMotion = useReducedMotion();
  const [scheme] = React.useState<'light' | 'dark'>(() =>
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  );
  const [gone, setGone] = React.useState(false);
  const colors = palette[scheme];

  const opacity = useSharedValue(1);
  const wordmarkOpacity = useSharedValue(0);

  // Hand over from the native splash once the glyph is on screen (or after a fallback delay).
  const handedOver = React.useRef(false);
  const handOver = React.useCallback(() => {
    if (handedOver.current) return;
    handedOver.current = true;
    hideNativeSplash();
  }, []);
  React.useEffect(() => {
    const timer = setTimeout(handOver, HIDE_NATIVE_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [handOver]);

  React.useEffect(() => {
    if (fontReady) wordmarkOpacity.value = withTiming(1, { duration: reduceMotion ? 0 : 150 });
  }, [fontReady, reduceMotion, wordmarkOpacity]);

  React.useEffect(() => {
    if (!ready) return;
    // Ready before the glyph loaded: hand over now; the fade still hides the switch.
    handOver();
    opacity.value = withTiming(0, { duration: reduceMotion ? 0 : 200 }, (finished) => {
      if (finished) scheduleOnRN(setGone, true);
    });
  }, [ready, reduceMotion, opacity, handOver]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const wordmarkStyle = useAnimatedStyle(() => ({ opacity: wordmarkOpacity.value }));

  if (gone) return null;

  return (
    <Animated.View
      pointerEvents={ready ? 'none' : 'auto'}
      accessible
      accessibilityLabel="MyMedSchedule"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, containerStyle]}>
      <View style={styles.center}>
        <Image
          source={scheme === 'dark' ? ICON_DARK : ICON_LIGHT}
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
          resizeMode="contain"
          fadeDuration={0}
          onLoad={handOver}
          onError={handOver}
        />
      </View>
      {fontReady ? (
        <Animated.View
          style={[
            styles.wordmarkRow,
            { top: '50%', marginTop: GLYPH_SIZE / 2 + WORDMARK_GAP },
            wordmarkStyle,
          ]}>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: fontFamily.extrabold,
              fontSize: 30,
              lineHeight: 36,
              letterSpacing: -0.3,
              color: colors.ink,
            }}>
            MyMedSchedule
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
