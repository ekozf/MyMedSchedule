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

export default function MedicationsScreen() {
  const { medications, activeProfile, loadMedications } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  
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
      <View className="px-4 pt-4 pb-2 border-b border-border">
        <ProfileSwitcher />
      </View>
      
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {medications.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <View className="w-20 h-20 rounded-full bg-muted items-center justify-center mb-4">
              <Pill size={40} className="text-muted-foreground" />
            </View>
            <Text className="text-lg font-semibold text-foreground mb-2">
              {i18n.t('medications.noMedications')}
            </Text>
            <Text className="text-sm text-muted-foreground text-center mb-6">
              {i18n.t('medications.startAddingPrompt')}
            </Text>
            <Link href="/medication/add" asChild>
              <Button>
                <PlusIcon size={20} className="text-primary-foreground mr-2" />
                <Text className="text-primary-foreground font-semibold">
                  {i18n.t('medications.addNew')}
                </Text>
              </Button>
            </Link>
          </View>
        ) : (
          <>
            <Text className="text-sm text-muted-foreground mb-4">
              {medications.length} {medications.length === 1 ? i18n.t('medications.medicationSingular') : i18n.t('medications.medicationPlural')}
            </Text>
            {medications.map((medication) => (
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
            <Button size="lg" className="rounded-full h-14 w-14 shadow-lg">
              <Icon as={PlusIcon} className="text-primary-foreground" />
            </Button>
          </Link>
        </View>
      )}
    </View>
  );
}
