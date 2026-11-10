import { Tabs } from 'expo-router';
import i18n from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { TabBar } from '@/components/shell/TabBar';
import { SupplyNudgeHost } from '@/components/medicines/SupplyNudge';

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.bg },
        }}>
        <Tabs.Screen name="dashboard" options={{ title: i18n.t('ui.shell.tabs.today') }} />
        <Tabs.Screen name="medications" options={{ title: i18n.t('ui.shell.tabs.medicines') }} />
        <Tabs.Screen name="history" options={{ title: i18n.t('ui.shell.tabs.journal') }} />
        <Tabs.Screen name="you" options={{ title: i18n.t('ui.shell.tabs.you') }} />
      </Tabs>
      {/* "Count my supply" after adding a medicine (the add flow returns to these screens). */}
      <SupplyNudgeHost />
    </>
  );
}
