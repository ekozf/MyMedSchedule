import { View, ScrollView, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { MedicationCard } from '@/components/medication/MedicationCard';
import { ProfileSwitcher } from '@/components/profile/ProfileSwitcher';
import { Link, router } from 'expo-router';
import { PlusIcon, Pill } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useStore } from '@/store';
import { useState, useEffect } from 'react';
import i18n from '@/lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MedicationsScreen() {
  const insets = useSafeAreaInsets();
  const { medications, activeProfile, loadMedications } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const sortedMedications = [...medications].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  useEffect(() => {
    if (activeProfile) {
      loadMedications(activeProfile.id);
    }
  }, [activeProfile]);

  const onRefresh = async () => {
    if (!activeProfile) return;

    setRefreshing(true);
    try {
      await loadMedications(activeProfile.id);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMedicationPress = (medicationId: string) => {
    router.push(`/medication/${medicationId}`);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header with Profile Switcher */}
      <View className="border-b border-border px-4 pb-2" style={{ paddingTop: insets.top + 16 }}>
        <ProfileSwitcher />
      </View>

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {medications.length === 0 ? (
          <View className="mt-20 items-center justify-center">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Pill size={40} className="text-muted-foreground" />
            </View>
            <Text className="mb-2 text-lg font-semibold text-foreground">
              {i18n.t('medications.noMedications')}
            </Text>
            <Text className="mb-6 text-center text-sm text-muted-foreground">
              {i18n.t('medications.startAddingPrompt')}
            </Text>
            <Link href="/medication/add" asChild>
              <Button>
                <PlusIcon size={20} className="mr-2 text-primary-foreground" />
                <Text className="font-semibold text-primary-foreground">
                  {i18n.t('medications.addNew')}
                </Text>
              </Button>
            </Link>
          </View>
        ) : (
          <>
            <Text className="mb-4 text-sm text-muted-foreground">
              {medications.length}{' '}
              {medications.length === 1
                ? i18n.t('medications.medicationSingular')
                : i18n.t('medications.medicationPlural')}
            </Text>
            {sortedMedications.map((medication) => (
              <MedicationCard
                key={medication.id}
                medication={medication}
                onPress={() => handleMedicationPress(medication.id)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Floating action button */}
      {medications.length > 0 && (
        <View className="absolute bottom-6 right-6">
          <Link href="/medication/add" asChild>
            <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
              <Icon as={PlusIcon} className="text-primary-foreground" size={24} />
            </Button>
          </Link>
        </View>
      )}
    </View>
  );
}
