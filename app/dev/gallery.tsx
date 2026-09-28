/**
 * DEV ONLY — design-system gallery. Open /dev/gallery (e.g. `router.push('/dev/gallery')`).
 * Shows every `components/ds` component with sample data; toggle scheme and language at the top.
 */
import * as React from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import {
  Bell,
  CalendarDays,
  Check,
  Clock,
  Ellipsis,
  Fingerprint,
  Languages,
  Moon,
  Pill,
  Plus,
  Sparkles,
  Sun,
  Sunrise,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import i18n, { getCurrentLocale, setLocale } from '@/lib/i18n';
import {
  formatDayLabel,
  formatDose,
  formatLongDate,
  formatShortDate,
  useTimeFormat,
} from '@/lib/ui/format';
import {
  Avatar,
  Button,
  CalendarSheet,
  Card,
  Chip,
  ChipRow,
  DateTimeField,
  Divider,
  EmptyState,
  IconButton,
  ListGroup,
  ListRow,
  MedTile,
  Meter,
  NavHeader,
  PinPad,
  ProgressRing,
  Screen,
  SectionHeader,
  SegmentedControl,
  Sheet,
  StatusChip,
  Stepper,
  SwipeableRow,
  TabHeader,
  Text,
  TextField,
  useActionSheet,
  useConfirm,
  useTheme,
  useToast,
  type TextVariant,
} from '@/components/ds';
import { QuickAddSheet } from '@/components/shell/QuickAddSheet';

const VARIANTS: TextVariant[] = [
  'largeTitle',
  'title1',
  'title2',
  'title3',
  'headline',
  'body',
  'callout',
  'subhead',
  'footnote',
  'caption',
  'time',
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <SectionHeader title={title} />
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      {children}
    </View>
  );
}

export default function GalleryScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { colors } = useTheme();
  const { formatTime } = useTimeFormat();
  const toast = useToast();
  const confirm = useConfirm();
  const showActionSheet = useActionSheet();

  const [segment, setSegment] = React.useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const [chip, setChip] = React.useState('all');
  const [switchOn, setSwitchOn] = React.useState(true);
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState(1.5);
  const [progress, setProgress] = React.useState(0.4);
  const [date, setDate] = React.useState<Date | null>(new Date());
  const [time, setTime] = React.useState<Date | null>(null);
  const [pin, setPin] = React.useState('');
  const [pinError, setPinError] = React.useState(false);
  const [sheet, setSheet] = React.useState(false);
  const [calendar, setCalendar] = React.useState(false);
  const [quickAdd, setQuickAdd] = React.useState(false);
  const [day, setDay] = React.useState(new Date());
  const [lastResult, setLastResult] = React.useState('');

  const isDark = colorScheme === 'dark';
  const now = new Date();

  return (
    <Screen
      header={
        <NavHeader
          title="Design system"
          right={
            <IconButton
              icon={isDark ? Sun : Moon}
              accessibilityLabel="Toggle colour scheme"
              onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
            />
          }
        />
      }>
      <TabHeader
        overline={formatLongDate(day)}
        onOverlinePress={() => setCalendar(true)}
        title={formatDayLabel(day)}
        right={
          <IconButton
            icon={CalendarDays}
            variant="tinted"
            accessibilityLabel="Pick a day"
            onPress={() => setCalendar(true)}
          />
        }
      />

      <Section title="Language / scheme">
        <ChipRow>
          {(['en', 'nl', 'tr'] as const).map((l) => (
            <Chip
              key={l}
              label={l.toUpperCase()}
              icon={Languages}
              selected={getCurrentLocale() === l}
              check
              onPress={() => setLocale(l)}
            />
          ))}
          <Chip
            label={isDark ? 'Dark' : 'Light'}
            icon={isDark ? Moon : Sun}
            onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
          />
        </ChipRow>
        <Text variant="footnote" tone="secondary">
          {i18n.t('ui.shell.tabs.today')} · {i18n.t('ui.shell.tabs.medicines')} ·{' '}
          {i18n.t('ui.shell.tabs.journal')} · {formatDose(1, 'pills')} · {formatDose(2, 'pills')} ·{' '}
          {formatDose(0.5, 'pills')} · {formatDose(500, 'milligrams')} · {formatShortDate(now)} ·{' '}
          {formatTime(now)}
        </Text>
      </Section>

      <Section title="Typography">
        <Card>
          {VARIANTS.map((v) => (
            <Text key={v} variant={v} numberOfLines={1}>
              {v === 'time' ? '08:00' : v}
            </Text>
          ))}
          <Divider style={{ marginVertical: 8 }} />
          <Row>
            {(
              [
                'primary',
                'secondary',
                'tertiary',
                'accent',
                'success',
                'warning',
                'danger',
              ] as const
            ).map((t) => (
              <Text key={t} tone={t} variant="subhead">
                {t}
              </Text>
            ))}
          </Row>
        </Card>
      </Section>

      <Section title="Buttons">
        <Button
          label="Take now"
          variant="success"
          size="lg"
          icon={Check}
          fullWidth
          onPress={() =>
            toast.show({
              title: 'Metformin taken',
              tone: 'success',
              action: { label: i18n.t('ui.common.undo'), onPress: () => {} },
            })
          }
        />
        <Button label="I took it at 08:00" variant="secondary" size="lg" fullWidth />
        <Row>
          <Button label="Primary" />
          <Button label="Danger" variant="danger" />
          <Button label="Skip" variant="secondaryDanger" icon={X} />
          <Button label="Plain" variant="plain" />
        </Row>
        <Row>
          <Button label="Small" size="sm" />
          <Button label="Loading" loading />
          <Button label="Disabled" disabled />
          <Button
            label="Next"
            icon={Sparkles}
            iconPosition="trailing"
            variant="secondary"
            size="sm"
          />
        </Row>
        <Row>
          <IconButton icon={Plus} accessibilityLabel="glass" />
          <IconButton icon={Plus} variant="tinted" accessibilityLabel="tinted" />
          <IconButton icon={Plus} variant="filled" accessibilityLabel="filled" />
          <IconButton icon={Plus} variant="plain" accessibilityLabel="plain" />
          <IconButton
            icon={Trash2}
            variant="tinted"
            tone="danger"
            size="sm"
            accessibilityLabel="delete"
          />
          <IconButton
            icon={Check}
            variant="filled"
            tone="success"
            size="lg"
            accessibilityLabel="ok"
          />
        </Row>
      </Section>

      <Section title="Cards & status">
        <Card onPress={() => {}} accessibilityLabel="Metformin">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MedTile name="Metformin" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline">Metformin</Text>
              <Text variant="subhead" tone="secondary">
                {formatDose(1, 'pills')} · with food
              </Text>
              <StatusChip tone="warning" icon={Clock} label="Late · 2 h" />
            </View>
            <Text variant="time">08:00</Text>
          </View>
        </Card>
        <Row>
          <StatusChip label="Moved" />
          <StatusChip tone="accent" icon={Bell} label="Now" />
          <StatusChip tone="success" icon={Check} label="Taken" />
          <StatusChip tone="danger" icon={X} label="Skipped" />
        </Row>
        {(['accent', 'success', 'warning', 'danger'] as const).map((t) => (
          <Card key={t} tone={t}>
            <Text variant="headline">Tone {t}</Text>
          </Card>
        ))}
      </Section>

      <Section title="Progress">
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <ProgressRing progress={progress} size={88} strokeWidth={10} tone="success">
              <Text variant="headline">{Math.round(progress * 5)}/5</Text>
            </ProgressRing>
            <View style={{ flex: 1, gap: 8 }}>
              <Text variant="title3">{Math.round(progress * 5)} of 5 taken</Text>
              <Meter progress={progress} tone="accent" />
              <Meter progress={0.15} tone="warning" />
              <Button
                label="Randomize"
                size="sm"
                variant="secondary"
                onPress={() => setProgress(Math.random())}
              />
            </View>
          </View>
        </Card>
      </Section>

      <Section title="Controls">
        <SegmentedControl
          value={segment}
          onChange={setSegment}
          options={[
            { value: '7d', label: '7 d' },
            { value: '30d', label: '30 d' },
            { value: '90d', label: '90 d' },
            { value: 'all', label: 'All' },
          ]}
        />
        <ChipRow>
          {['all', 'taken', 'skipped', 'partial'].map((c) => (
            <Chip key={c} label={c} selected={chip === c} onPress={() => setChip(c)} check />
          ))}
          <Chip label="Add a full pack (30)" icon={Plus} onPress={() => {}} />
        </ChipRow>
        <Stepper
          value={amount}
          onChange={setAmount}
          min={0.5}
          max={20}
          step={0.5}
          unit={i18n.t('ui.common.units.pills', { count: amount })}
        />
        <TextField
          label="Name"
          placeholder="e.g. Metformin"
          value={name}
          onChangeText={setName}
          helper="Shown in reminders"
        />
        <TextField size="lg" placeholder="Name" value={name} onChangeText={setName} />
        <TextField
          label="Max per day"
          keyboardType="decimal-pad"
          error="Must be more than 0"
          defaultValue="0"
        />
        <DateTimeField mode="date" label="Start date" value={date} onChange={setDate} />
        <DateTimeField
          mode="time"
          label="Time"
          value={time}
          onChange={setTime}
          placeholder="Add a time"
        />
      </Section>

      <Section title="Lists">
        <ListGroup
          header="Preferences"
          footer="Grouped list with switch, value, check and destructive rows.">
          <ListRow icon={Languages} title="Language" value="English" onPress={() => {}} />
          <ListRow
            icon={Clock}
            iconTint={colors.success}
            title="24-hour time"
            switchValue={switchOn}
            onSwitchChange={setSwitchOn}
          />
          <ListRow
            icon={Fingerprint}
            iconTint="#7C66DC"
            title="App lock"
            subtitle="Face ID"
            value="On"
            onPress={() => {}}
          />
          <ListRow title="Nederlands" accessory="check" onPress={() => {}} />
          <ListRow
            leading={<Avatar name="Emma de Vries" size="sm" />}
            title="Emma de Vries"
            subtitle="Active profile"
            onPress={() => {}}
          />
          <ListRow
            icon={Trash2}
            title="Delete medicine"
            destructive
            accessory="none"
            onPress={() => {}}
          />
        </ListGroup>
        <SwipeableRow
          leftAction={{
            label: 'Take',
            icon: Check,
            tone: 'success',
            onTrigger: () => toast.show({ title: 'Taken (swipe)', tone: 'success' }),
          }}
          rightActions={[
            {
              label: 'Skip',
              icon: X,
              tone: 'danger',
              onPress: () => toast.show({ title: 'Skipped', tone: 'danger' }),
            },
            { label: 'More', icon: Ellipsis, tone: 'default', onPress: () => setSheet(true) },
          ]}>
          <Card blur={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MedTile name="Lisinopril" size="sm" />
              <View style={{ flex: 1 }}>
                <Text variant="headline">Swipe me</Text>
                <Text variant="subhead" tone="secondary">
                  Right: take · Left: skip / more
                </Text>
              </View>
              <Text variant="time">20:00</Text>
            </View>
          </Card>
        </SwipeableRow>
      </Section>

      <Section title="Identity">
        <Row>
          <Avatar name="Emma de Vries" size="sm" />
          <Avatar name="Emma de Vries" size="md" ring />
          <Avatar name="Ali Yılmaz" size="lg" />
          <Avatar name="Sam" size="xl" />
        </Row>
        <Row>
          {['Metformin', 'Lisinopril', 'Ibuprofen', 'Vitamin D', 'Omeprazole'].map((n) => (
            <MedTile key={n} name={n} size="md" />
          ))}
          <MedTile name="Aspirin" size="lg" />
        </Row>
      </Section>

      <Section title="Overlays">
        <Row>
          <Button label="Sheet" variant="secondary" onPress={() => setSheet(true)} />
          <Button
            label="Confirm"
            variant="secondary"
            onPress={async () => {
              const ok = await confirm({
                title: 'Delete Metformin?',
                message: 'Its history will be removed too. This cannot be undone.',
                confirmLabel: 'Delete medicine',
                tone: 'danger',
                icon: Trash2,
              });
              setLastResult(`confirm → ${ok}`);
            }}
          />
          <Button
            label="Warning"
            variant="secondary"
            onPress={async () => {
              const ok = await confirm({
                title: 'That is more than your daily maximum',
                message: 'You have already taken 4 of 4 today.',
                confirmLabel: 'Take anyway',
                tone: 'warning',
                icon: TriangleAlert,
              });
              setLastResult(`warning → ${ok}`);
            }}
          />
          <Button
            label="Action sheet"
            variant="secondary"
            onPress={async () => {
              const choice = await showActionSheet({
                title: 'Profile photo',
                options: [
                  { key: 'camera', label: 'Take photo', icon: Sparkles },
                  { key: 'library', label: 'Choose from library', icon: Pill },
                  { key: 'remove', label: 'Remove photo', icon: Trash2, destructive: true },
                ],
              });
              setLastResult(`action → ${choice}`);
            }}
          />
          <Button label="Calendar" variant="secondary" onPress={() => setCalendar(true)} />
          <Button label="Quick add" variant="secondary" onPress={() => setQuickAdd(true)} />
        </Row>
        <Row>
          {(['default', 'success', 'warning', 'danger'] as const).map((t) => (
            <Button
              key={t}
              label={`Toast ${t}`}
              size="sm"
              variant="plain"
              onPress={() =>
                toast.show({
                  title: `A ${t} toast`,
                  message: 'With a second line of detail',
                  tone: t,
                })
              }
            />
          ))}
        </Row>
        {lastResult ? <Text tone="secondary">{lastResult}</Text> : null}
      </Section>

      <Section title="Empty state">
        <Card>
          <EmptyState
            icon={Pill}
            title="No medicines yet"
            message="Add your first medicine and we'll remind you when it's time."
            action={{ label: 'Add your first medicine', icon: Plus, onPress: () => {} }}
          />
        </Card>
        <EmptyState
          compact
          icon={Sunrise}
          tone="success"
          title="Nothing scheduled"
          message="Enjoy your day."
        />
      </Section>

      <Section title="PIN pad">
        <Card>
          <PinPad
            value={pin}
            onChange={(v) => {
              setPin(v);
              setPinError(false);
            }}
            autoSubmitAt={4}
            onSubmit={(v) => {
              if (v !== '1234') {
                setPinError(true);
                setPin('');
              } else toast.show({ title: 'Unlocked', tone: 'success' });
            }}
            error={pinError}
            leftKey={
              <IconButton
                icon={Fingerprint}
                variant="plain"
                size="lg"
                accessibilityLabel="Use biometrics"
              />
            }
          />
          <Text variant="footnote" tone="tertiary" align="center" style={{ marginTop: 12 }}>
            PIN is 1234
          </Text>
        </Card>
      </Section>

      <Sheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Metformin"
        subtitle="1 pill · scheduled 08:00"
        footer={
          <>
            <Button
              label="Take now"
              variant="success"
              size="lg"
              fullWidth
              icon={Check}
              onPress={() => setSheet(false)}
            />
            <Button
              label={i18n.t('ui.common.cancel')}
              variant="plain"
              size="lg"
              fullWidth
              onPress={() => setSheet(false)}
            />
          </>
        }>
        <View style={{ gap: 16 }}>
          <Text tone="secondary">
            Drag down from the top or the handle to close. Content scrolls when tall.
          </Text>
          {/* Overlays opened from here render in this sheet's OverlayHost (above the sheet). */}
          <Row>
            <Button
              label="Confirm over sheet"
              size="sm"
              variant="secondary"
              onPress={async () => {
                const ok = await confirm({
                  title: 'Skip this dose?',
                  confirmLabel: 'Skip dose',
                  tone: 'warning',
                });
                toast.show({ title: `confirm → ${ok}`, tone: ok ? 'success' : 'default' });
              }}
            />
            <Button
              label="Toast in sheet"
              size="sm"
              variant="plain"
              onPress={() => toast.show({ title: 'Shown above the sheet', tone: 'success' })}
            />
            <Button
              label="Close + toast"
              size="sm"
              variant="plain"
              onPress={() => {
                setSheet(false);
                toast.show({ title: 'Moves to the screen when the sheet is gone' });
              }}
            />
          </Row>
          <TextField label="Note" placeholder="Add a note" multiline />
          <Stepper value={amount} onChange={setAmount} min={0.5} max={20} step={0.5} unit="pills" />
          {Array.from({ length: 12 }).map((_, i) => (
            <Text key={i} tone="tertiary">
              Filler line {i + 1}
            </Text>
          ))}
        </View>
      </Sheet>
      <CalendarSheet
        visible={calendar}
        onClose={() => setCalendar(false)}
        value={day}
        onChange={setDay}
        renderDayDot={(d) =>
          d.getDate() % 5 === 0 ? 'warning' : d.getDate() % 3 === 0 ? 'success' : null
        }
      />
      <QuickAddSheet visible={quickAdd} onClose={() => setQuickAdd(false)} />
    </Screen>
  );
}
