# Design system (`@/components/ds`)

"Pill Box" components, per `docs/DESIGN.md` §4. Import everything from `@/components/ds`.
Tokens: `useTheme().colors` (`bg field field2 ink ink2 line line2 accent onAccent done doneInk now
nowInk late danger dangerSoft inverse onInverse backdrop`), `type` (§3.2 scale), `radii`, `spacing`,
`fontFamily`, `fontForWeight(w)` (use in TextInput styles). No hex in screens. The old "Calm"
aliases are gone; the last three props still marked `@deprecated remove after screen rewrite`
(`EmptyState.icon`, toast `tone`, confirm `icon`) have no visual effect: don't use them in new code.

## Layout

- **Screen** — `children, header?, footer?, bottomInset?: 'tabBar'|'none', scroll?=true, refreshControl?, keyboardAware?, safeTop?=true, padded?=true, scrollRef?, scrollProps?`
  Flat `bg`, 20 side padding. Use `bottomInset="tabBar"` on tab screens; `footer` for the sticky primary button.
- **NavHeader** — `title?, onBack?, hideBack?, backIcon?: 'back'|'close', rightAction?: {label,onPress,disabled?}, right?`
  56 tall, round 48 back/× on `field`, centre title 17/700 ink2, accent text action right ("Edit", "Save", "+ Add").
- **HeaderTextAction** — `label, onPress, disabled?, accessibilityLabel?`
  The accent 17/700 text button NavHeader uses; also for tab-screen headers.
- **TabHeader** — `title, overline?, onOverlinePress?, subtitle?, right?, rightInline?=false`
  Top of a tab screen: optional (tappable) line above, `title1`, optional subtitle and right actions.
- **SectionHeader** — `title, size?: 'label'|'day', icon?, right?`
  16/700 ink2 label above a group; `day` = 20/800 journal day header.
- **Divider** / **Spacer** — `inset?, strong?` / `size?, horizontal?`
  Hairline (`line`, or `line2` when strong) and fixed space.
- **Card** — `children, tone?: 'default'|'done'|'now'|'danger'|'inverse'|'bg', selected?, onPress?, padded?=true, radius?=22`
  Flat `field` card, no shadow. `selected` = `bg` + 2 px accent border.

## Text & icons

- **Text** — `variant?: display|title1|title2|title3|headline|body|callout|subhead|footnote|caption, tone?, color?, weight?, align?, tabular?`
  Atkinson Hyperlegible Next; picks the font family per weight. Tones: primary, secondary, accent, onAccent, done, now, late, danger, onInverse.
- **Icon** — `as: LucideIcon, size?=24, tone?, color?, strokeWidth?=2`
  Monochrome lucide icon; decorative (parent carries the label). 28 in the tab bar.

## Actions

- **Button** — `label, onPress, variant?: 'primary'|'secondary'|'quiet'|'danger'|'dangerQuiet'|'link', size?: 'lg'|'sm', icon?, loading?, disabled?, fullWidth?`
  60 tall (52 quiet/dangerQuiet/link, 48 `sm`), radius 16, full width by default (`sm` and `link` hug content). One primary per screen. `dangerQuiet` = red text, no fill (a lesser destructive action, still confirmed).
- **IconButton** — `icon, accessibilityLabel, onPress, variant?: 'field'|'bg'|'accent'|'plain', size?: 'sm'|'md'|'lg', tone?, disabledLook?: 'fade'|'solid'` (`solid` = `line2` fill, `ink` glyph at 60%, ≥ 3:1; used by Stepper)
  Round: sm 44 (sheet close, calendar arrows), md 48 (header), lg 64 (stepper keys). Hit area ≥ 48.
- **PressableScale** — Pressable props + `activeScale?=0.98, haptic?='none'`
  Base pressable with the 0.98 press scale (opacity under Reduce Motion). Use `haptic="light"` only for take/skip/undo.

## Inputs & selection

- **TextField** — TextInput props + `label?, helper?, error?, multiline?, leading?, trailing?, ref?`
  `field` fill, radius 18, 68 tall, 22/600 text; focused = `bg` + accent border; multiline 110 tall, 18/400.
- **DateTimeField** — `mode: 'date'|'time', value, onChange, label?, placeholder?, minimumDate?, maximumDate?` (leading clock/calendar icon, trailing chevron)
  Looks like TextField; opens the native picker (Android dialog, iOS sheet). Honours the 24-hour setting.
- **Stepper** — `value, onChange, min?, max?, step?, unit?, hint?, label?, card?=true, editable?, autoFocusEdit?, autoFocusDelay?=350`
  `field` card, 64 round −/+ (accent glyphs), `display` value, unit below. Decimal steps, long-press repeats, tap number to type (the number shows a dotted 2 px `line2` underline and a 16 px pencil, so screens need no "tap the number" footnote). `autoFocusEdit` opens the number for typing on mount (after `autoFocusDelay` ms, so a sheet can slide in first); a value set from outside while typing (a quick chip) replaces the typed text.
- **SegmentedControl** — `options: {value,label}[], value, onChange, disabled?`
  `field` track radius 14, 48-tall segments, selected = `bg` (plus a 1 px `line` border in dark mode).
- **Chip** — `label, detail?, selected?, onPress, icon?, check?, size?, accessibilityRole?: 'button'|'radio'|'checkbox'`
  50 tall pill on `field`; selected = accent fill.
- **ChipRow** — `children, scroll?=false, bleed?=true, gap?`
  Wrapping row of chips (or one horizontal scrolling line with `scroll`).
- **ChipGroup** — `options: {value,label,detail?}[], value, onChange, multiple?, scroll?`
  Controlled single select (radio) or `multiple` (checkbox, value is an array).
- **OptionRow** — `title, description?, selected, onPress, badge?, disabled?`
  Radio card, 76 min height, 30 px radio right (2.5 px `line2` ring unselected); selected = `bg` + accent border. `badge` = "Recommended"/"Current" pill.
- **Radio** — `selected`
  The bare 30 px radio circle.
- **CheckboxCard** — `label, description?, checked, onChange, disabled?`
  "I understand and agree" card with a 30 px checkbox.
- **Switch** — `value, onValueChange, disabled?` (+ Pressable a11y props)
  56×34, drawn in JS: `line2` track with a 1 px `ink2` 30% border off, `accent` on, white knob.
- **PinPad** — `value, onChange, minLength?=4, maxLength?=6, autoSubmitAt?, onSubmit?, error?, disabled?, leftKey?: {label,onPress} | node, status?`
  18 px dots (grow 4→6) above a 3×4 grid of 76-tall `field` keys; "Clear" (or `leftKey`, e.g. "Use fingerprint") and backspace quiet. `error` shakes the dots and turns them `danger`; `status` renders directly under the dots.

## Lists

- **ListGroup** — `children, header?, footer?`
  `field` group radius 20 with `line2` hairlines between rows; header 16/700 ink2.
- **ListRow** — `title, subtitle?, value?, onPress?, accessory?: 'chevron'|'check'|'none'|node, switchValue?, onSwitchChange?, icon?, leading?, destructive?, disabled?`
  64 min height; title 19/600, subtitle 15 ink2, value 17/500 ink2 + chevron, or a Switch.

## Overlays

- **Sheet** — `visible, onClose, onDismissed?, title?, subtitle?, footer?, scrollable?=true, dismissible?=true, showClose?, headerLeft?, headerRight?`
  Bottom sheet: `bg`, radius 28 (dark mode: 1 px `line2` top border), grab handle, `title2` header with round 44 close, max 86%. Scrim tap / drag / back closes.
  Content gets 24 + bottom safe-area padding. Inline editors call `useSheetScroll()?.reveal(y, height)` (y relative to the sheet's children) to scroll themselves into view.
- **useConfirm()** → `confirm({ title, message?, confirmLabel, cancelLabel?, tone?: 'default'|'danger', secondaryLabel? }): Promise<boolean>`
  Sheet with title2, a sentence, one primary/danger button and quiet Cancel. Only for destructive actions.
- **useConfirmChoice()** → same options, resolves `'confirm' | 'secondary' | 'cancel'`; `secondaryLabel` adds a grey button
  between the main one and Cancel ("Log anyway" / "Update supply first").
- **useActionSheet()** → `show({ title?, message?, options: {key,label,icon?,destructive?,disabled?}[] }): Promise<key|null>`
  Sheet with a grouped list of 64-tall options and a quiet Cancel.
- **useToast()** → `show({ title, message?, action?: {label,onPress}, duration? })`, `hide()`
  `inverse` toast with a 2 px `bg` border, 32 above the tab bar; title + message on one line when they fit (2 max); action shown underlined (Undo). 3.2 s, 8 s with an action.
- **CalendarSheet** — `visible, onClose, value, onChange, title?, footer?, hasEntries?(d), markedDays?(d), minimumDate?, maximumDate?, onMonthChange?`
  Month grid in a sheet; closes after a pick. **Calendar** = the same grid without the sheet.
  Selected = accent fill; today = 2 px accent outline; `markedDays` = a 6 px accent dot under the number (default none). The "November 2026 ▾" title opens a year (‹ ›) + month picker.
- **OverlayHost / OverlayScope / useOverlayLayer** — internal plumbing so overlays render above open sheets and modal routes.

## Pill box & medicine pieces

- **Compartment** — `label, state: 'default'|'now'|'done'|'skipped'|'empty', taken?, total?, toTake?, sub?, emptyText?, onPress?, minHeight?=150` (an empty tile under 100 tall centres its two lines; Today's tray uses 84 for a row of two empty slots)
  Day slot tile, 150 min height: label, big count still to take + "dose(s) to take" ("1 dose to take"; `toTake`, default total − taken), "taken/total" once `done`, sub line. `now` = amber fill and outline (due or late); a pressable `default` tile with doses still to take (pending, not due yet) = 2 px `accent` outline at 50 % (`withAlpha`) and a 20 px `ink2` chevron top-right beside the label (sub line at most two lines, ellipsis); `done` = green fill (300 ms), `skipped` = finished with nothing taken: `field` fill, the word "Skipped" in title3 `ink2`, no check; `empty` = 2 px dashed `line`, quiet label.
- **MiniTray** — `slots: { label, times?: string[] }[], tone?: 'done'|'scheduled'`
  Four 72-tall tiles showing which compartments a medicine uses, with times inside. `scheduled` = field fill, accent border and text (planned, not taken).
- **SupplyBar** — `value: 0..1, low?, tone?: 'accent'|'neutral', on?: 'field'|'bg', accessibilityLabel?` (dark mode on `field`: `field2` track)
  8 px bar, accent fill (`late` when low); track contrasts with the surface it sits on.
- **MedIcon** — `name, uri?, size?: 'sm'|'md'|'lg'|'xl'|number, initial?`
  Medicine photo, or a monochrome pill on a `field` tile (40/52/64/92); `initial` = first letter in `accent` instead of the pill. Never tinted.
- **StatusPill** — `label, tone?: 'neutral'|'done'|'now'|'danger'|'accent', icon?`
  Small 13/700 pill: "Taken 08:12", "Skipped", "Recommended", "Paused".
- **Avatar** — `name, uri?, size?: 'sm'|'md'|'lg'|'xl'|number, ring?`
  Round, `done` fill with `doneInk` initial, or photo. 40/60/72/120; `ring` = accent ring.
- **EmptyState** — `title, message?, action?: {label,onPress}, compact?`
  Title 22/700, one sentence, one primary button. No illustration.

## Shell (`@/components/shell/TabBar`)

- **TabBar** — bottom-tabs `tabBar` renderer: Today, Medicines, Journal, You. Full width, `bg`, top hairline, 92 tall incl. safe area. No FAB.

## Medicine flows built on these (`components/medicines`, `components/editor`)

Not part of the ds, listed so their wording stays in one place (details in `docs/DESIGN.md` §5.3/§5.4):

- **SupplySheet** — first count ("How many do you have?"): pack-size quick chips 28 / 30 / 56 / 60 / 90 / 100 (+ the medicine's pack size) above an auto-focused Stepper, a "Remind me when running low" switch with "Days before you run out", primary "Start tracking". Update mode: Add / Remove / Set the total, "29 now → 89 after" once changed (`late` only at 0), "Why? (optional)" chips. `onSave(newCount, change)` must pass `change` on to `saveSupply(med, n, profileId, change)` so the reason and refill choice are stored.
- **SupplyNudge** — "Metformin saved" / "Want to count how many you have left? We'll show how many days remain." / "Count my supply" / "Not now".
- **Schedule step** — frequency first: "Every day · Once or more a day", "On certain days of the week", "Only when needed", "Other schedules".
- **Notes and dose limits** — "Dose limits from your prescription": "Maximum in one day", time between doses, expiry date. Edit list row "Amount each time" (wizard title stays "How much each time?").
- **StepScreen** — "Step n of 4" with four 8 px dots (`accent` done/current, `field2` rest).
