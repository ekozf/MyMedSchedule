/**
 * "Pill Box" design system (docs/DESIGN.md §4). Import everything from here; see README.md for
 * a one-screen overview of every component.
 *
 * @example
 * import { Screen, Text, Button, Compartment, useToast } from '@/components/ds';
 */
export { Text, typography, type TextProps, type TextVariant, type TextTone } from './Text';
export { Icon, type IconProps } from './Icon';
export { Screen, type ScreenProps } from './Screen';
export { TabHeader, type TabHeaderProps } from './TabHeader';
export { NavHeader, HeaderTextAction, goBackOrHome, type NavHeaderProps } from './NavHeader';
export { Card, cardFill, type CardProps, type CardTone } from './Card';
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
export { Sheet, useSheetScroll, type SheetProps, type SheetScrollApi } from './Sheet';
export {
  OverlayHost,
  OverlayScope,
  useOverlayLayer,
  useOverlayDepth,
  useExitFallback,
} from './OverlayHost';
export {
  ConfirmProvider,
  useConfirm,
  useConfirmChoice,
  type ConfirmOptions,
  type ConfirmFn,
  type ConfirmChoice,
  type ConfirmChoiceFn,
} from './Confirm';
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
export {
  Chip,
  ChipRow,
  ChipGroup,
  type ChipProps,
  type ChipRowProps,
  type ChipOption,
} from './Chip';
export {
  ListGroup,
  ListRow,
  type ListGroupProps,
  type ListRowProps,
  type ListRowAccessory,
} from './List';
export { Switch, type SwitchProps } from './Switch';
export { TextField, type TextFieldProps } from './TextField';
export { Stepper, type StepperProps } from './Stepper';
export { Avatar, getInitials, AVATAR_SIZES, type AvatarProps, type AvatarSize } from './Avatar';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { DateTimeField, formatDateValue, type DateTimeFieldProps } from './DateTimeField';
export { PinPad, type PinPadProps } from './PinPad';
export { SectionHeader, type SectionHeaderProps } from './SectionHeader';
export { Divider, Spacer } from './Divider';
export {
  Calendar,
  CalendarSheet,
  getWeekStartsOn,
  type CalendarProps,
  type CalendarSheetProps,
} from './CalendarSheet';
export {
  Compartment,
  type CompartmentProps,
  type CompartmentState,
} from './Compartment';
export { OptionRow, Radio, type OptionRowProps } from './OptionRow';
export { CheckboxCard, type CheckboxCardProps } from './CheckboxCard';
export { SupplyBar, type SupplyBarProps } from './SupplyBar';
export { MiniTray, type MiniTrayProps, type MiniTraySlot } from './MiniTray';
export { MedIcon, MED_ICON_SIZES, type MedIconProps, type MedIconSize } from './MedIcon';
export { StatusPill, type StatusPillProps, type PillTone } from './StatusPill';

// Tokens & helpers re-exported for convenience
export {
  useTheme,
  ThemeScope,
  palette,
  type,
  fontFamily,
  fontForWeight,
  radii,
  spacing,
  SPRING,
  DURATION,
  withAlpha,
  toneColor,
  type Palette,
  type PaletteToken,
  type Tone,
  type TypeRole,
  type ColorScheme,
} from '@/lib/theme';
export { haptics } from '@/lib/ui/haptics';
