import { Stack, router } from 'expo-router';
import { View } from 'react-native';
import { Compass } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import { EmptyState, Screen } from '@/components/ds';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: i18n.t('ui.onboarding.notFound.screenTitle') }} />
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={Compass}
            title={i18n.t('ui.onboarding.notFound.title')}
            message={i18n.t('ui.onboarding.notFound.message')}
            action={{
              label: i18n.t('ui.onboarding.notFound.action'),
              // The launch gate sends the user to Today, or to the lock / onboarding when needed.
              onPress: () => router.replace('/'),
            }}
          />
        </View>
      </Screen>
    </>
  );
}
