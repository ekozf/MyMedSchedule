/**
 * Optional number as a grouped row ("Most in one day · Not set") that opens a sheet with a big
 * stepper, a primary "Save" and a quiet clear action ("Remove limit" once set, "No limit" before).
 * Keeps rarely used numbers out
 * of the way until someone needs them. Render inside a `ListGroup`.
 *
 * @example
 * <ListGroup header="Safety">
 *   <OptionalNumberRow
 *     title="Most in one day"
 *     subtitle="We'll check with you before you go over"
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
import i18n from '@/lib/i18n';
import { Button, ListRow, Sheet, Stepper } from '@/components/ds';

export interface OptionalNumberRowProps {
  title: string;
  /** Description under the row title and above the stepper in the sheet. */
  subtitle?: string;
  /**
   * Show `subtitle` on the row only once a value is set (for descriptions of what the value does,
   * which would be a false promise while nothing is set). The sheet always shows it. Default false.
   */
  subtitleOnlyWhenSet?: boolean;
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
  /** Row value when not set. Default "Not set". */
  emptyLabel?: string;
  /**
   * Label of the quiet clear button, given whether a value is set; null hides it.
   * Default: "Remove limit" when set, "No limit" when not.
   */
  clearLabel?: (hasValue: boolean) => string | null;
}

export function OptionalNumberRow({
  title,
  subtitle,
  subtitleOnlyWhenSet = false,
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
  clearLabel,
}: OptionalNumberRowProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? defaultValue);
  const empty: string = emptyLabel ?? String(i18n.t('ui.editor.extras.notSet'));
  const clear =
    clearLabel?.(value !== null) ??
    (clearLabel
      ? null
      : String(
          i18n.t(value !== null ? 'ui.editor.screens.removeLimit' : 'ui.editor.screens.noLimit')
        ));

  const show = () => {
    setDraft(value ?? defaultValue);
    setOpen(true);
  };

  return (
    <>
      <ListRow
        title={title}
        subtitle={subtitleOnlyWhenSet && value === null ? undefined : subtitle}
        value={value !== null ? format(value) : empty}
        onPress={show}
      />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle={subtitle}
        footer={
          <View style={{ gap: 4 }}>
            <Button
              label={i18n.t('ui.editor.screens.saveValue')}
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            />
            {clear ? (
              <Button
                label={clear}
                variant="quiet"
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
              />
            ) : null}
          </View>
        }>
        <View style={{ paddingBottom: 8 }}>
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
