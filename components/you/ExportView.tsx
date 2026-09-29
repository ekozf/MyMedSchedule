/**
 * Export report screen pieces (presentational): `ExportBody` (what's inside, risks, tips,
 * acknowledgement switch) and `ExportActions` (Save to device / Share, sticky footer).
 */
import * as React from 'react';
import { Platform, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import {
  CalendarDays,
  Cloud,
  Download,
  Eye,
  FileText,
  HandHeart,
  LockOpen,
  Percent,
  Pill,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import i18n from '@/lib/i18n';
import {
  Button,
  Card,
  Divider,
  Icon,
  ListGroup,
  ListRow,
  Text,
  useTheme,
  withAlpha,
} from '@/components/ds';

export type ExportBusy = 'save' | 'share' | null;

export interface ExportBodyProps {
  profileName: string;
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ExportBody({
  profileName,
  acknowledged,
  onAcknowledgedChange,
  disabled,
}: ExportBodyProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const enter = (i: number) =>
    reduceMotion ? FadeIn.duration(200) : FadeInDown.duration(280).delay(i * 50);

  return (
    <View style={{ gap: 20 }}>
      <Animated.View entering={enter(0)} style={{ alignItems: 'center', gap: 10, paddingTop: 4 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon as={FileText} size={38} tone="accent" />
        </View>
        <Text variant="title1" align="center" accessibilityRole="header">
          {i18n.t('ui.you.export.title')}
        </Text>
        <Text variant="body" tone="secondary" align="center">
          {i18n.t('ui.you.export.description', { name: profileName })}
        </Text>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <Card>
          <View style={{ gap: 14 }}>
            <Text variant="title3" accessibilityRole="header">
              {i18n.t('ui.you.export.insideTitle')}
            </Text>
            <Bullet
              icon={Pill}
              tint={colors.accent}
              text={i18n.t('ui.you.export.inside.medicines')}
            />
            <Bullet
              icon={CalendarDays}
              tint={colors.accent}
              text={i18n.t('ui.you.export.inside.entries')}
            />
            <Bullet
              icon={Percent}
              tint={colors.accent}
              text={i18n.t('ui.you.export.inside.adherence')}
            />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <Card>
          <View style={{ gap: 14 }}>
            <Text variant="title3" accessibilityRole="header">
              {i18n.t('ui.you.export.shareTitle')}
            </Text>
            <Bullet
              icon={LockOpen}
              tint={colors.warning}
              text={i18n.t('ui.you.export.risks.notEncrypted')}
            />
            <Bullet
              icon={Eye}
              tint={colors.warning}
              text={i18n.t('ui.you.export.risks.readable')}
            />
            <Bullet
              icon={Cloud}
              tint={colors.warning}
              text={i18n.t('ui.you.export.risks.copies')}
            />
            <Bullet
              icon={Smartphone}
              tint={colors.warning}
              text={i18n.t('ui.you.export.risks.remains')}
            />
            <Divider style={{ marginVertical: 2 }} />
            <Text variant="headline" accessibilityRole="header">
              {i18n.t('ui.you.export.tipsTitle')}
            </Text>
            <Bullet
              icon={Stethoscope}
              tint={colors.success}
              text={i18n.t('ui.you.export.tips.trusted')}
            />
            <Bullet
              icon={Trash2}
              tint={colors.success}
              text={i18n.t('ui.you.export.tips.delete')}
            />
            <Bullet
              icon={HandHeart}
              tint={colors.success}
              text={i18n.t('ui.you.export.tips.secure')}
            />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <ListGroup>
          <ListRow
            icon={acknowledged ? ShieldCheck : ShieldAlert}
            iconTint={acknowledged ? colors.success : colors.warning}
            title={i18n.t('ui.you.export.acknowledge')}
            switchValue={acknowledged}
            onSwitchChange={onAcknowledgedChange}
            disabled={disabled}
          />
        </ListGroup>
      </Animated.View>
    </View>
  );
}

function Bullet({ icon, tint, text }: { icon: LucideIcon; tint: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: withAlpha(tint, 0.14),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon as={icon} size={18} color={tint} />
      </View>
      <Text variant="callout" style={{ flex: 1, paddingTop: 5 }}>
        {text}
      </Text>
    </View>
  );
}

export interface ExportActionsProps {
  acknowledged: boolean;
  busy: ExportBusy;
  onSave: () => void;
  onShare: () => void;
}

export function ExportActions({ acknowledged, busy, onSave, onShare }: ExportActionsProps) {
  const preparing = i18n.t('ui.you.export.preparing');
  let hint: string | null = null;
  if (busy) hint = preparing;
  else if (!acknowledged) hint = i18n.t('ui.you.export.ackHint');
  else if (Platform.OS === 'ios') hint = i18n.t('ui.you.export.iosSaveHint');

  return (
    <View style={{ gap: 10 }}>
      {hint ? (
        <Text
          variant="footnote"
          tone={busy ? 'accent' : 'secondary'}
          align="center"
          accessibilityLiveRegion="polite">
          {hint}
        </Text>
      ) : null}
      <Button
        label={i18n.t('ui.you.export.save')}
        icon={Download}
        size="lg"
        fullWidth
        loading={busy === 'save'}
        disabled={!acknowledged || (busy !== null && busy !== 'save')}
        accessibilityLabel={busy === 'save' ? preparing : undefined}
        onPress={onSave}
      />
      <Button
        label={i18n.t('ui.you.export.share')}
        icon={Share2}
        variant="secondary"
        size="lg"
        fullWidth
        loading={busy === 'share'}
        disabled={!acknowledged || (busy !== null && busy !== 'share')}
        accessibilityLabel={busy === 'share' ? preparing : undefined}
        onPress={onShare}
      />
    </View>
  );
}
