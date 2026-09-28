/**
 * "Calm" design system (docs/DESIGN.md). Import everything from here:
 *
 * @example
 * import { Screen, TabHeader, Card, Text, Button, useToast } from '@/components/ds';
 */
export { Text, typography, type TextProps, type TextVariant, type TextTone } from './Text';
export { Icon, type IconProps } from './Icon';
export { GradientBackground } from './GradientBackground';
export { Screen, type ScreenProps } from './Screen';
export { TabHeader, ProfileAvatarButton, type TabHeaderProps } from './TabHeader';
export { NavHeader, goBackOrHome, type NavHeaderProps } from './NavHeader';
export { Card, type CardProps, type CardTone } from './Card';
export { PressableScale, type PressableScaleProps, type PressHaptic } from './PressableScale';
export {
  Button,
  buttonColors,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './Button';
export {
  IconButton,
  type IconButtonProps,
  type IconButtonVariant,
  type IconButtonSize,
} from './IconButton';
export { Sheet, type SheetProps } from './Sheet';
export { ConfirmProvider, useConfirm, type ConfirmOptions, type ConfirmFn } from './Confirm';
export {
  ActionSheetProvider,
  useActionSheet,
  type ActionSheetOption,
  type ActionSheetOptions,
  type ShowActionSheet,
} from './ActionSheet';
export { ToastProvider, useToast, type ToastOptions, type ToastApi, type ToastTone } from './Toast';
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentOption,
} from './SegmentedControl';
export { Chip, ChipRow, type ChipProps, type ChipRowProps } from './Chip';
export {
  ListGroup,
  ListRow,
  type ListGroupProps,
  type ListRowProps,
  type ListRowAccessory,
} from './List';
export { TextField, type TextFieldProps } from './TextField';
export { Stepper, type StepperProps } from './Stepper';
export { ProgressRing, type ProgressRingProps } from './ProgressRing';
export { Meter, type MeterProps } from './Meter';
export { Avatar, getInitials, AVATAR_SIZES, type AvatarProps, type AvatarSize } from './Avatar';
export {
  MedTile,
  getMedTint,
  MED_TILE_SIZES,
  type MedTileProps,
  type MedTileSize,
} from './MedTile';
export { StatusChip, type StatusChipProps } from './StatusChip';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { DateTimeField, formatDateValue, type DateTimeFieldProps } from './DateTimeField';
export { PinPad, type PinPadProps } from './PinPad';
export {
  SwipeableRow,
  type SwipeableRowProps,
  type SwipeLeftAction,
  type SwipeRightAction,
} from './SwipeableRow';
export { SectionHeader, type SectionHeaderProps } from './SectionHeader';
export { Divider, Spacer } from './Divider';
export {
  CalendarSheet,
  getWeekStartsOn,
  type CalendarSheetProps,
  type DayDotTone,
} from './CalendarSheet';

// Tokens & helpers re-exported for convenience
export {
  useTheme,
  ThemeScope,
  palette,
  medTints,
  radii,
  spacing,
  SPRING,
  withAlpha,
  statusColors,
  toneColor,
  type Palette,
  type Tone,
  type StatusTone,
  type ColorScheme,
} from '@/lib/theme';
export { haptics } from '@/lib/ui/haptics';
