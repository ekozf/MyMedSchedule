/**
 * Optional number as a list row ("Max per day · Not set") that opens a sheet with a big stepper,
 * Save and Remove. Keeps rarely used numbers out of the way until someone needs them.
 *
 * @example
 * <ListGroup header="Safety">
 *   <OptionalNumberRow
 *     icon={ShieldAlert}
 *     title="Max per day"
 *     hint="We'll check with you before you take more than this."
 *     value={form.maxDailyDose}
 *     defaultValue={4}
 *     format={(n) => formatDose(n, 'pills')}
 *     unit={(n) => formatUnit(n, 'pills')}
 *     onChange={(maxDailyDose) => update.set({ maxDailyDose })}
 *   />
 * </ListGroup>
 */
import * as React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { Button, ListRow, Sheet, Stepper, Text } from '@/components/ds';

export interface OptionalNumberRowProps {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  iconTint?: string;
  value: number | null;
  /** Value the stepper starts at when nothing is set yet. */
  defaultValue: number;
  /** Row value text for a set number (e.g. "4 pills"). */
  format: (n: number) => string;
  /** Unit label under the stepper number. */
  unit?: (n: number) => string;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  allowDecimal?: boolean;
  /** Text shown when not set. Default "Not set". */
  emptyLabel?: string;
}

export function OptionalNumberRow({
  title,
  hint,
  icon,
  iconTint,
  value,
  defaultValue,
  format,
  unit,
  onChange,
  min = 0.5,
  max = 100000,
  step = 1,
  allowDecimal,
  emptyLabel,
}: OptionalNumberRowProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? defaultValue);

  const show = () => {
    setDraft(value ?? defaultValue);
    setOpen(true);
  };

  return (
    <>
      <ListRow
        icon={icon}
        iconTint={iconTint}
        title={title}
        value={value !== null ? format(value) : (emptyLabel ?? i18n.t('ui.editor.extras.notSet'))}
        onPress={show}
      />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <View style={{ gap: 8 }}>
            <Button
              label={i18n.t('ui.editor.extras.set')}
              size="lg"
              fullWidth
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            />
            {value !== null ? (
              <Button
                label={i18n.t('ui.editor.extras.remove')}
                variant="plain"
                size="lg"
                fullWidth
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
              />
            ) : null}
          </View>
        }>
        <View style={{ gap: 16, paddingBottom: 8 }}>
          {hint ? (
            <Text variant="body" tone="secondary">
              {hint}
            </Text>
          ) : null}
          <Stepper
            value={draft}
            onChange={setDraft}
            min={min}
            max={max}
            step={step}
            allowDecimal={allowDecimal}
            unit={unit?.(draft)}
            accessibilityLabel={title}
          />
        </View>
      </Sheet>
    </>
  );
}
