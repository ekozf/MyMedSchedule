/**
 * The 2×2 pill-box tray on Today (docs/DESIGN.md §5.2): Morning, Midday / Evening, Night.
 * Count = doses still to take ("1 dose to take"), or taken / total once finished; sub line names the
 * medicines (name plus strength), then the status ("Metformin 500 mg · from 20:00");
 * `now` / `done` / `skipped` / `empty` states. Empty compartments are not pressable. A row whose
 * two compartments are both empty collapses to 84 tall (see `trayRowHeights`).
 *
 * @example
 * <Tray groups={groups} medsById={medsById} nowId={nowId} onOpen={(id) => openCompartment(id)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { Compartment } from '@/components/ds';
import { compartmentA11yLabel } from '@/components/ds/compartment-label';
import { compartmentLabelKey } from '@/lib/settings/compartments';
import { useTimeFormat } from '@/lib/ui/format';
import type { CompartmentId, Medication } from '@/types';
import { doseNamer } from './names';
import {
  compartmentTileSub,
  compartmentTileSubA11y,
  trayRowHeights,
  trayState,
  type CompartmentGroup,
} from './logic';

const EMPTY_KEY: Record<CompartmentId, string> = {
  morning: 'ui.compartments.emptyMorning',
  midday: 'ui.compartments.emptyMidday',
  evening: 'ui.compartments.emptyEvening',
  night: 'ui.compartments.emptyNight',
};

export interface TrayProps {
  /** Four groups in compartment order (see `groupByCompartment`). */
  groups: CompartmentGroup[];
  /** For the medicine names (name plus strength) in the sub lines. */
  medsById: Map<string, Medication>;
  nowId: CompartmentId | null;
  onOpen: (id: CompartmentId) => void;
}

export function Tray({ groups, medsById, nowId, onOpen }: TrayProps) {
  const { formatTime } = useTimeFormat();
  const nameOf = React.useMemo(() => doseNamer(medsById), [medsById]);
  const rows = [groups.slice(0, 2), groups.slice(2, 4)];
  const heights = trayRowHeights(groups);
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 12 }}>
          {row.map((g) => {
            const state = trayState(g, nowId);
            const label = i18n.t(compartmentLabelKey(g.id));
            const emptyText = i18n.t(EMPTY_KEY[g.id]);
            const taken = g.done - g.partial;
            return (
              <Compartment
                key={g.id}
                style={{ flex: 1 }}
                label={label}
                state={state}
                taken={taken}
                total={g.total}
                toTake={g.pending.length}
                sub={compartmentTileSub(g, formatTime, nameOf)}
                emptyText={emptyText}
                minHeight={heights[r]}
                accessibilityLabel={compartmentA11yLabel({
                  label,
                  state,
                  taken,
                  total: g.total,
                  left: g.pending.length,
                  sub: compartmentTileSubA11y(g, formatTime, nameOf),
                  emptyText,
                })}
                onPress={state === 'empty' ? undefined : () => onOpen(g.id)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
