/**
 * Export a report (spec §5.6), presentational pieces: `ExportBody` (title, sentence, a plain
 * "What's inside" list, then the one warning card "Before you share" with three bullets and a
 * "More about sharing safely" link that expands the rest, and the footnote "This is a report to
 * read or print. It is not a backup the app can restore.") and `ExportActions` for the sticky
 * footer (the "isn't encrypted" checkbox directly above "Save PDF" + "Share PDF", both disabled
 * until the box is ticked).
 *
 * @example
 * <Screen footer={<ExportActions acknowledged={ok} onAcknowledgedChange={setOk} busy={busy}
 *   onSave={save} onShare={share} />}>
 *   <ExportBody profileName="Margaret" />
 * </Screen>
 */
import * as React from 'react';
import { View } from 'react-native';
import i18n from '@/lib/i18n';
import { Button, Card, CheckboxCard, Text, useTheme } from '@/components/ds';

export type ExportBusy = 'save' | 'share' | null;

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(`ui.you.export.${key}`, opts);

export interface ExportBodyProps {
  profileName: string;
}

/** Always shown in "Before you share"; the rest is behind "More about sharing safely". */
const MAIN_RISKS = ['notEncrypted', 'readable', 'trusted'];
const MORE_RISKS = ['copies', 'remains'];

export function ExportBody({ profileName }: ExportBodyProps) {
  const [more, setMore] = React.useState(false);
  return (
    <View style={{ gap: 20, paddingTop: 8 }}>
      <View style={{ gap: 8 }}>
        <Text variant="title1">{t('title')}</Text>
        <Text variant="body" tone="secondary">
          {t('description', { name: profileName })}
        </Text>
      </View>
      <BulletList
        title={t('insideTitle')}
        items={['medicines', 'entries', 'adherence'].map((k) => t(`inside.${k}`))}
      />
      <BulletCard
        title={t('shareTitle')}
        items={(more ? [...MAIN_RISKS, ...MORE_RISKS] : MAIN_RISKS).map((k) => t(`risks.${k}`))}>
        <Button
          variant="link"
          size="sm"
          label={t(more ? 'lessAboutSharing' : 'moreAboutSharing')}
          onPress={() => setMore((v) => !v)}
          accessibilityState={{ expanded: more }}
        />
      </BulletCard>
      <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 4 }}>
        {t('notBackup')}
      </Text>
    </View>
  );
}

function BulletCard(props: { title: string; items: string[]; children?: React.ReactNode }) {
  return (
    <Card>
      <BulletList {...props} />
    </Card>
  );
}

function BulletList({
  title,
  items,
  children,
}: {
  title: string;
  items: string[];
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <>
      <View style={{ gap: 12 }}>
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
        {items.map((item) => (
          <View key={item} style={{ flexDirection: 'row', gap: 12 }} accessible>
            {/* Bullet aligned with the first line of 18/25 body text. */}
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.ink2,
                marginTop: 9,
              }}
            />
            <Text variant="body" style={{ flex: 1 }}>
              {item}
            </Text>
          </View>
        ))}
        {children ? <View style={{ alignItems: 'flex-start' }}>{children}</View> : null}
      </View>
    </>
  );
}

export interface ExportActionsProps {
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  busy: ExportBusy;
  onSave: () => void;
  onShare: () => void;
}

export function ExportActions({
  acknowledged,
  onAcknowledgedChange,
  busy,
  onSave,
  onShare,
}: ExportActionsProps) {
  const locked = !acknowledged || busy !== null;
  return (
    <>
      <CheckboxCard
        label={t('acknowledge')}
        checked={acknowledged}
        onChange={onAcknowledgedChange}
        disabled={busy !== null}
      />
      <Button
        variant="secondary"
        label={busy === 'save' ? t('preparing') : t('savePdf')}
        loading={busy === 'save'}
        disabled={locked && busy !== 'save'}
        onPress={onSave}
      />
      <Button
        label={busy === 'share' ? t('preparing') : t('sharePdf')}
        loading={busy === 'share'}
        disabled={locked && busy !== 'share'}
        onPress={onShare}
      />
    </>
  );
}
