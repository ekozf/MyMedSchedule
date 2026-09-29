/**
 * Medicines tab (docs/DESIGN.md §4.3): every medicine as a glass card with its schedule, next dose
 * and supply; stopped medicines tucked into a collapsible section at the bottom.
 */
import * as React from 'react';
import { RefreshControl, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Pill, Plus, Search, X } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { useStore } from '@/store';
import {
  Card,
  EmptyState,
  Icon,
  IconButton,
  Screen,
  TabHeader,
  TextField,
  useTheme,
} from '@/components/ds';
import { MedicineList } from '@/components/medicines/MedicineList';

/** Show the search field once the list gets long. */
const SEARCH_THRESHOLD = 6;

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

  const activeCount = medications.filter((m) => m.isActive).length;
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
        overline={
          medications.length > 0
            ? i18n.t('ui.medicines.activeCount', { count: activeCount })
            : undefined
        }
        right={
          medications.length > 0 ? (
            <IconButton
              icon={Plus}
              variant="tinted"
              accessibilityLabel={i18n.t('ui.medicines.a11y.addMedicine')}
              onPress={addMedicine}
            />
          ) : null
        }
      />

      {medications.length === 0 ? (
        <Card style={{ marginTop: 8 }}>
          <EmptyState
            icon={Pill}
            title={i18n.t('ui.medicines.empty.title')}
            message={i18n.t('ui.medicines.empty.message')}
            action={{
              label: i18n.t('ui.medicines.empty.action'),
              icon: Plus,
              onPress: addMedicine,
            }}
          />
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {showSearch ? (
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder={i18n.t('ui.medicines.search.placeholder')}
              accessibilityLabel={i18n.t('ui.medicines.search.placeholder')}
              returnKeyType="search"
              autoCorrect={false}
              leading={<Icon as={Search} size={20} tone="tertiary" />}
              trailing={
                query ? (
                  <IconButton
                    icon={X}
                    size="sm"
                    variant="plain"
                    tone="default"
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
