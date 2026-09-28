import { Tabs } from 'expo-router';
import i18n from '@/lib/i18n';
import { FloatingTabBar } from '@/components/shell/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}>
      <Tabs.Screen name="dashboard" options={{ title: i18n.t('ui.shell.tabs.today') }} />
      <Tabs.Screen name="medications" options={{ title: i18n.t('ui.shell.tabs.medicines') }} />
      <Tabs.Screen name="history" options={{ title: i18n.t('ui.shell.tabs.journal') }} />
    </Tabs>
  );
}
