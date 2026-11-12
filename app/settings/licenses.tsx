/**
 * Settings › About › Open-source licences: title, a search field, the native parts that npm
 * doesn't describe ("Built into the app": SQLCipher, Hermes, AndroidX, the font, …) and every npm
 * package (name, version, licence) in a FlatList. A row opens the full text
 * (app/settings/license/[id].tsx). Data: lib/legal/licenses.generated.json (`bun run licenses`).
 */
import * as React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '@/lib/i18n';
import { radii, useTheme } from '@/lib/theme';
import { GUTTER } from '@/lib/ui/layout';
import {
  Icon,
  NavHeader,
  PressableScale,
  Screen,
  SectionHeader,
  Text,
  TextField,
} from '@/components/ds';
import { filterLicenses, getLicenseData, licenseId, type LicenseInfo } from '@/lib/legal/licenses';
import { YOU_ROUTES } from '@/components/you/routes';

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.about.licenses.${key}`, opts);

interface Row {
  id: string;
  entry: LicenseInfo;
  first: boolean;
  last: boolean;
}

function toRows(entries: LicenseInfo[], kind: 'native' | 'npm'): Row[] {
  return entries.map((entry, i) => ({
    id: licenseId(entry, kind),
    entry,
    first: i === 0,
    last: i === entries.length - 1,
  }));
}

const LicenseRow = React.memo(function LicenseRow({ row }: { row: Row }) {
  const { colors } = useTheme();
  const { entry } = row;
  const detail = [entry.version, entry.license].filter(Boolean).join(' · ');
  return (
    <PressableScale
      activeScale={0.99}
      onPress={() => router.push(YOU_ROUTES.license(row.id))}
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${detail}`}
      style={{
        minHeight: 64,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.field,
        borderTopLeftRadius: row.first ? radii.group : 0,
        borderTopRightRadius: row.first ? radii.group : 0,
        borderBottomLeftRadius: row.last ? radii.group : 0,
        borderBottomRightRadius: row.last ? radii.group : 0,
      }}>
      {!row.first ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 16,
            right: 16,
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.line2,
          }}
        />
      ) : null}
      <View style={{ flex: 1, paddingVertical: 12 }}>
        <Text variant="headline" weight="600">
          {entry.name}
        </Text>
        {detail ? (
          <Text variant="footnote" weight="400" tone="secondary" style={{ marginTop: 2 }}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Icon as={ChevronRight} size={22} tone="secondary" />
    </PressableScale>
  );
});

type Item = Row | { id: string; header: string };

export default function LicensesRoute() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const data = React.useMemo(() => getLicenseData(), []);
  const [query, setQuery] = React.useState('');

  const items = React.useMemo<Item[]>(() => {
    const native = filterLicenses(data.native, query);
    const packages = filterLicenses(data.packages, query);
    const out: Item[] = [];
    if (native.length) {
      out.push({ id: 'h:native', header: t('nativeHeader') });
      out.push(...toRows(native, 'native'));
    }
    if (packages.length) {
      out.push({ id: 'h:npm', header: t('packagesHeader', { count: packages.length }) });
      out.push(...toRows(packages, 'npm'));
    }
    return out;
  }, [data, query]);

  const header = (
    <View style={{ gap: 20, paddingTop: 8, paddingBottom: 8 }}>
      <View style={{ gap: 8 }}>
        <Text variant="title1" accessibilityRole="header">
          {t('title')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('subtitle')}
        </Text>
      </View>
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder={t('searchPlaceholder')}
        accessibilityLabel={t('search')}
        leading={<Icon as={Search} size={24} tone="secondary" />}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        inputStyle={{ fontSize: 19 }}
      />
    </View>
  );

  return (
    <Screen
      header={<NavHeader />}
      scroll={false}
      padded={false}
      contentContainerStyle={{ paddingBottom: 0 }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          'header' in item ? (
            <View style={{ paddingTop: 24, paddingBottom: 8 }}>
              <SectionHeader title={item.header} />
            </View>
          ) : (
            <LicenseRow row={item} />
          )
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text variant="body" tone="secondary" style={{ paddingTop: 24 }}>
            {t('empty', { query: query.trim() })}
          </Text>
        }
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingBottom: insets.bottom + 24,
        }}
        style={{ backgroundColor: colors.bg }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={20}
        windowSize={11}
        removeClippedSubviews
        showsVerticalScrollIndicator
      />
    </Screen>
  );
}
