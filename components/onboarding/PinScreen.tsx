/**
 * Page layout for every PIN step (choose, repeat, confirm current, lock screen): optional avatar,
 * centred title and hint, the ds `PinPad` with the status line directly under its dots, and an
 * optional footer button. Scrolls
 * on short phones; the avatar drops to 72 when the screen is under 740 tall so the keys stay in
 * view.
 *
 * @example
 * <PinScreen header={<NavHeader />} title="Choose a PIN" hint="4 to 6 digits."
 *   pin={pin} onPinChange={setPin} footer={<Button label="Next" … />} />
 */
import * as React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Avatar, PinPad, Screen, Text, radii, useTheme } from '@/components/ds';
import { StatusLine } from './StatusLine';

export interface PinScreenProps {
  header?: React.ReactNode;
  avatar?: { name: string; uri?: string | null };
  title: string;
  hint?: string;
  pin: string;
  onPinChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  /** Known PIN length: fixes the dot count, blocks extra digits and calls `onSubmit` when reached. */
  autoSubmitAt?: number;
  error?: boolean;
  disabled?: boolean;
  /** Quiet bottom-left key instead of "Clear", e.g. "Use fingerprint". */
  leftKey?: { label: string; onPress: () => void };
  message?: string | null;
  /** Show `message` as a stronger error line (17/600, announced at once). */
  messageStrong?: boolean;
  footer?: React.ReactNode;
}

export function PinScreen({
  header,
  avatar,
  title,
  hint,
  pin,
  onPinChange,
  onSubmit,
  autoSubmitAt,
  error,
  disabled,
  leftKey,
  message,
  messageStrong,
  footer,
}: PinScreenProps) {
  const { height } = useWindowDimensions();
  const avatarSize = height < 740 ? 72 : 120;
  return (
    <Screen header={header} footer={footer} contentContainerStyle={{ justifyContent: 'center' }}>
      <View style={{ gap: 24, paddingVertical: 8 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          {avatar ? (
            <Avatar
              name={avatar.name}
              uri={avatar.uri}
              size={avatarSize}
              style={{ marginBottom: 8 }}
            />
          ) : null}
          <Text variant="title2" align="center">
            {title}
          </Text>
          {hint ? (
            <Text variant="body" tone="secondary" align="center">
              {hint}
            </Text>
          ) : null}
        </View>
        <PinPad
          value={pin}
          onChange={onPinChange}
          onSubmit={onSubmit}
          autoSubmitAt={autoSubmitAt}
          maxLength={autoSubmitAt ?? 6}
          error={error}
          disabled={disabled}
          leftKey={leftKey ? <QuietKey {...leftKey} disabled={disabled} /> : undefined}
          status={<StatusLine text={message} reserve strong={messageStrong} />}
        />
      </View>
    </Screen>
  );
}

/**
 * Quiet text key for the PinPad's bottom-left slot. Long labels ("Vinger gebruiken", or any label
 * at a large font scale) shrink to fit in two lines instead of breaking mid-word.
 */
function QuietKey({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  // Pressed state in React state: function `style` props are dropped by the NativeWind interop.
  const [pressed, setPressed] = React.useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.quietKey, { backgroundColor: pressed ? colors.field : 'transparent' }]}>
      <Text
        variant="callout"
        weight="700"
        tone="secondary"
        align="center"
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quietKey: {
    alignSelf: 'stretch',
    flex: 1,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
