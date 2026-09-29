/**
 * The Medicines tab list: active medicines as cards (sorted by name, gently staggered in), then a
 * collapsible "No longer taking (n)" section with dimmed cards. Presentational: data via props.
 *
 * @example
 * <MedicineList medications={meds} query={query} onOpen={(m) => router.push(`/medication/${m.id}`)} />
 */
import * as React from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown, CirclePause, SearchX } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { EmptyState, Icon, PressableScale, Text } from '@/components/ds';
import type { Medication } from '@/types';
import { MedicineCard } from './MedicineCard';
import { sortMedicines } from './medicine-info';

export interface MedicineListProps {
  medications: Medication[];
  /** Filters by name (case-insensitive). */
  query?: string;
  onOpen: (medication: Medication) => void;
  /** Start with the inactive section open (previews). */
  initiallyShowInactive?: boolean;
  now?: Date;
}

const MAX_STAGGER = 8;

function normalize(s: string) {
  return s.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function MedicineList({
  medications,
  query = '',
  onOpen,
  initiallyShowInactive = false,
  now,
}: MedicineListProps) {
  const reduceMotion = useReducedMotion();
  const q = normalize(query.trim());
  const filtered = React.useMemo(() => {
    const sorted = sortMedicines(medications);
    return q ? sorted.filter((m) => normalize(m.name).includes(q)) : sorted;
  }, [medications, q]);

  const active = filtered.filter((m) => m.isActive);
  const inactive = filtered.filter((m) => !m.isActive);

  if (q && filtered.length === 0) {
    return (
      <EmptyState
        compact
        icon={SearchX}
        tone="default"
        title={i18n.t('ui.medicines.search.noMatchesTitle')}
        message={i18n.t('ui.medicines.search.noMatches', { query: query.trim() })}
      />
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {active.map((m, i) => (
        <Animated.View
          key={m.id}
          entering={
            reduceMotion ? undefined : FadeInDown.delay(Math.min(i, MAX_STAGGER) * 20).duration(320)
          }
          layout={reduceMotion ? undefined : LinearTransition.springify().damping(18)}>
          <MedicineCard medication={m} onPress={() => onOpen(m)} now={now} />
        </Animated.View>
      ))}

      {active.length === 0 && !q ? (
        <EmptyState
          compact
          icon={CirclePause}
          tone="default"
          title={i18n.t('ui.medicines.noActive.title')}
          message={i18n.t('ui.medicines.noActive.message')}
        />
      ) : null}

      {inactive.length > 0 ? (
        <InactiveSection
          count={inactive.length}
          // While searching, show matches without an extra tap.
          forceOpen={!!q}
          initiallyOpen={initiallyShowInactive}>
          {inactive.map((m) => (
            <MedicineCard key={m.id} medication={m} onPress={() => onOpen(m)} now={now} />
          ))}
        </InactiveSection>
      ) : null}
    </View>
  );
}

function InactiveSection({
  count,
  children,
  forceOpen,
  initiallyOpen,
}: {
  count: number;
  children: React.ReactNode;
  forceOpen: boolean;
  initiallyOpen: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [openState, setOpen] = React.useState(initiallyOpen);
  const open = forceOpen || openState;
  const rotation = useSharedValue(open ? 1 : 0);

  React.useEffect(() => {
    rotation.value = reduceMotion ? (open ? 1 : 0) : withTiming(open ? 1 : 0, { duration: 220 });
  }, [open, reduceMotion, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  return (
    <Animated.View
      layout={reduceMotion ? undefined : LinearTransition}
      style={{ marginTop: 14, gap: 10 }}>
      <PressableScale
        haptic="tap"
        onPress={() => setOpen((o) => !o)}
        disabled={forceOpen}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={i18n.t('ui.medicines.inactiveSection', { count })}
        accessibilityHint={i18n.t(
          open ? 'ui.medicines.a11y.hideInactive' : 'ui.medicines.a11y.showInactive'
        )}
        style={{
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          gap: 12,
        }}>
        <Text variant="headline" tone="secondary" style={{ flexShrink: 1 }}>
          {i18n.t('ui.medicines.inactiveSection', { count })}
        </Text>
        <Animated.View style={chevronStyle}>
          <Icon as={ChevronDown} size={20} tone="secondary" />
        </Animated.View>
      </PressableScale>
      {open ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          exiting={reduceMotion ? undefined : FadeOut.duration(150)}
          style={{ gap: 10 }}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
