import { Tabs } from 'expo-router';
import { HomeIcon, PillIcon, ClockIcon, SettingsIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import i18n from '@/lib/i18n';

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#fff' : '#000';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        headerShown: false,
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: i18n.t('tabs.dashboard'),
          tabBarIcon: ({ color }) => <HomeIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: i18n.t('tabs.medications'),
          tabBarIcon: ({ color }) => <PillIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: i18n.t('tabs.history'),
          tabBarIcon: ({ color }) => <ClockIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: i18n.t('tabs.settings'),
          tabBarIcon: ({ color }) => <SettingsIcon size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
