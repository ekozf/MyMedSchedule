/**
 * Medicines tab (docs/DESIGN.md §5.3): "+ Add" in the header, "Medicines" with "4 regular · 1 when
 * needed" (title and "+ Add" on one row), the cards in Regular / When needed / Stopped sections.
 * A search field appears once the list gets long. Empty: one sentence and "Add a medicine".
 */
import * as React from 'react';
import { RefreshControl, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import {
  EmptyState,
  HeaderTextAction,
  Icon,
  IconButton,
  Screen,
  TabHeader,
  TextField,
  useTheme,
} from '@/components/ds';
import { MedicineList, groupMedicines } from '@/components/medicines/MedicineList';
import { ProfileChip } from '@/components/shell/ProfileChip';

/** Show the search field once the list gets long. */
const SEARCH_THRESHOLD = 8;

export default function MedicinesScreen() {
  const { colors } = useTheme();
  const medications = useStore((s) => s.medications);
  const profileId = useStore((s) => s.activeProfile?.id);
  const loadMedications = useStore((s) => s.loadMedications);
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState('');

  // Reload on focus (e.g. back from add/edit) and whenever the active profile changes.
  useFocusEffect(
    React.useCallback(() => {
      if (profileId) loadMedications(profileId);
    }, [profileId, loadMedications])
  );

  const onRefresh = React.useCallback(async () => {
    if (!profileId) return;
    setRefreshing(true);
    try {
      await loadMedications(profileId);
    } finally {
      setRefreshing(false);
    }
  }, [profileId, loadMedications]);

  const groups = React.useMemo(() => groupMedicines(medications), [medications]);
  const subtitle = [
    groups.regular.length
      ? i18n.t('ui.medicines.list.regular', { count: groups.regular.length })
      : null,
    groups.whenNeeded.length
      ? i18n.t('ui.medicines.list.whenNeeded', { count: groups.whenNeeded.length })
      : null,
    groups.stopped.length
      ? i18n.t('ui.medicines.list.stopped', { count: groups.stopped.length })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const empty = medications.length === 0;
  const showSearch = medications.length > SEARCH_THRESHOLD;
  const addMedicine = () => router.push('/medication/add');

  return (
    <Screen
      bottomInset="tabBar"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }>
      <TabHeader
        title={i18n.t('ui.medicines.title')}
        subtitle={subtitle || undefined}
        rightInline
        right={
          <>
            <ProfileChip />
            {empty ? null : (
              <HeaderTextAction
                label={i18n.t('ui.medicines.list.add')}
                accessibilityLabel={i18n.t('ui.medicines.a11y.addMedicine')}
                onPress={addMedicine}
              />
            )}
          </>
        }
      />

      {empty ? (
        <EmptyState
          title={i18n.t('ui.medicines.empty.title')}
          message={i18n.t('ui.medicines.empty.message')}
          action={{ label: i18n.t('ui.medicines.addMedicine'), onPress: addMedicine }}
        />
      ) : (
        <View style={{ gap: 16 }}>
          {showSearch ? (
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder={i18n.t('ui.medicines.search.placeholder')}
              accessibilityLabel={i18n.t('ui.medicines.search.placeholder')}
              returnKeyType="search"
              autoCorrect={false}
              leading={<Icon as={Search} size={22} tone="secondary" />}
              trailing={
                query ? (
                  <IconButton
                    icon={X}
                    size="sm"
                    variant="plain"
                    accessibilityLabel={i18n.t('ui.medicines.search.clear')}
                    onPress={() => setQuery('')}
                  />
                ) : null
              }
            />
          ) : null}
          <MedicineList
            medications={medications}
            query={showSearch ? query : ''}
            onOpen={(m) => router.push(`/medication/${m.id}`)}
          />
        </View>
      )}
    </Screen>
  );
}
