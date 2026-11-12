# MyMedSchedule, "Pill Box" design spec

This is the single source of truth for the UI on `feat/full-ui-redo`. It replaces the earlier
"Calm / Airy sky" spec entirely. The backend (`lib/`, `store/`, `types/`) is not redesigned and
every capability it exposes today must remain reachable. See §9 for the full feature inventory.

This document was written before implementation and has since been brought in line with the
code (2026-11-09). Where the first intent and the code differed, it now describes the code.
Component APIs are in `components/ds/README.md`.

Clickable reference prototype: `b-full.html` in the design mockups (ask the design lead) or the
published artifact. When this document and the prototype disagree, this document wins.

---

## 1. Idea in one paragraph

The app is the weekly pill organiser everyone already owns, with reminders. The day is four
compartments: Morning, Midday, Evening, Night. A compartment fills in green when its doses are
done and is outlined amber when it is the one to open now. Everything is large, plain and warm.
There is one accent colour (deep green) and it means "done" or "do this". Nothing is decorated:
no gradients, no glass, no shadows for mood, no tinted icon tiles, no progress rings.

Who it is for: a person who may be tired, anxious, 80 years old, or caring for someone who is.
Someone who has never opened the app should be able to take a dose within five seconds.

---

## 2. Principles

1. **One primary action per screen**, filled green, 60 tall, within thumb reach. Secondary actions
   are grey fills. Destructive actions are red text on a soft red fill and always confirmed.
2. **Say it in words.** Every icon has a label. Status is never colour alone: "Taken 08:12",
   "Skipped", "Due at 10:00", "41 minutes late" are written out.
3. **One tap to take.** From Today a dose is taken with a single tap on a big "I took it" button.
   Everything else (taken earlier, took less, skip, note) is one more tap away in the same sheet.
4. **Undo, not "are you sure".** Taking, skipping, logging an as-needed dose and switching profile
   show a toast with Undo. Only deleting a medicine, deleting an entry, removing a profile and
   turning off the lock use a confirmation sheet (plus the safety questions in §5.2).
5. **Progressive disclosure.** Add a medicine is four short pages. Supply and extras are optional
   and are reached from the Review page. The Review page lets you tap anything to change it.
6. **Calm feedback.** Soft springs (≤300 ms), light haptics on take, nothing flashes. Respect
   Reduce Motion and system font scaling (never disable `allowFontScaling`).
7. **Accessible by default.** Minimum touch target 48×48, primary buttons 60 tall, body text 18,
   names 20 to 22, every pressable has `accessibilityRole` and a label. Contrast ≥ 4.5:1 for text.

---

## 3. Visual language

### 3.1 Typeface

Atkinson Hyperlegible Next, bundled locally via `@expo-google-fonts/atkinson-hyperlegible-next`.
Loaded with `useFonts` at the root; the splash screen stays until loaded. No network requests,
ever. Weights used: 400 Regular, 500 Medium, 600 SemiBold, 700 Bold, 800 ExtraBold. Android can't
synthesise weights for custom fonts, so `Text` picks the family per weight (`fontForWeight`).
Fallback to the system font if loading fails.

Note: the typeface has a slashed zero. That is intentional (it is designed for low vision), and
it is why a compartment never shows a big "0" (§4 `Compartment`).

### 3.2 Type scale (RN `fontSize` / `lineHeight`, weight)

| Role | Size | Line | Weight | Use |
|---|---|---|---|---|
| `display` | 46 / 48 | 800 | compartment count, big stepper values |
| `title1` | 34 / 38 | 800 | page titles ("Medicines", "Good morning, Margaret") |
| `title2` | 28 / 32 | 800 | sheet titles |
| `title3` | 22 / 27 | 700 | medicine names in lists, option titles |
| `headline` | 19 / 25 | 700 | buttons, row titles |
| `body` | 18 / 25 | 400 | body text, descriptions |
| `callout` | 17 / 23 | 500 | secondary rows, status line |
| `subhead` | 16 / 22 | 600 | labels above fields, compartment sub text |
| `footnote` | 15 / 20 | 500 | hints, journal detail lines |
| `caption` | 13 / 18 | 700 | small pills ("Current", "Recommended") |

Letter-spacing: titles −0.015em to −0.02em, display −0.03em, everything else 0. Numbers that line
up use `fontVariant: ['tabular-nums']` (`Text tabular`). No all-caps labels anywhere.

### 3.3 Colour tokens

All colours live in `lib/theme.ts` (JS) and `global.css` (CSS variables for NativeWind). Never
hard-code a hex in a screen. Semantic colours (done, now, late, danger) are not the accent.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#0F1412` | screen background (flat, no gradient) |
| `field` | `#F1F3F2` | `#19201D` | cards, grouped rows, grey buttons, compartments |
| `field2` | `#E6EAE8` | `#222B27` | progress track, pressed state of field, supply track on `field` in dark mode |
| `ink` | `#141A17` | `#EEF3F0` | primary text |
| `ink2` | `#4F5955` | `#9AA8A1` | secondary text, neutral supply bar |
| `line` | `#E2E6E4` | `#2F3A35` | hairline separators, dashed empty compartment, segmented selected border (dark) |
| `line2` | `#B5BDB9` | `#52605A` | radio/checkbox borders (2.5 px unselected), list-group hairlines, switch off track, dotted stepper underline, disabled stepper key, dark-mode sheet top border |
| `accent` | `#1B5E4A` | `#7ED3B2` | primary buttons, selected chips, links, tab active |
| `onAccent` | `#FFFFFF` | `#0F1412` | text on accent |
| `done` | `#D7EBDD` | `#173327` | filled compartment, taken pills, avatars |
| `doneInk` | `#175239` | `#9EE0C2` | text on `done` |
| `now` | `#FFF1D6` | `#3A2A0E` | the compartment to open now, due banner, reminders banner, partial status |
| `nowInk` | `#7A4B00` | `#F5C06A` | text and border on `now` |
| `late` | `#B4530A` | `#F0A05C` | "late" text, supply at its refill threshold or at 0 |
| `danger` | `#A4342A` | `#F08A79` | destructive text |
| `dangerSoft` | `#FBE6E3` | `#3A1A16` | destructive button fill |
| `inverse` | `#141A17` | `#F1F3F2` | toast background |
| `onInverse` | `#FFFFFF` | `#141A17` | text on inverse |
| `backdrop` | `rgba(20,20,20,0.42)` | `rgba(0,0,0,0.6)` | sheet scrim |

Light or dark follows the Appearance setting (System / Light / Dark, §5.6; default System, which
follows the phone). Keep both palettes to the same shapes.

### 3.4 Shape, space, elevation

- Radii (`radii` in `lib/theme.ts`): compartments and cards 22, list groups 20, fields and toast
  18, buttons 16, small inner tiles and segmented track 14, sheets 28 (top), chips/pills 999.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32. Screen side padding 20. Gap between cards 10 to 12.
- Elevation: none. Sheets sit on the scrim; cards are `field` on `bg`. The only shadow in the
  app is on the toast (soft, 20% black, radius 30, offset 10).
- Borders: 2 px, transparent by default, `accent` when selected, `nowInk` on the "now"
  compartment and the due-dose banner, 2 px dashed `line` on an empty compartment.

### 3.5 Motion

- Screen push: platform default (expo-router stack).
- Sheet: slide up 320 ms, cubic-bezier(.2,.8,.2,1); scrim fades 240 ms.
- Take a dose: the button scales to 0.98 on press, the compartment background animates to `done`
  over 300 ms, light haptic. Nothing else moves.
- Toast: slide up 20 px and fade in 260 ms; auto hide after 3.2 s, 8 s when it has an action
  (Undo).
- Wrong PIN: the dots shake once.
- Reduce Motion: durations go to 1 ms, press scale becomes an opacity change, no shake.

### 3.6 Icons

`lucide-react-native`, stroke width 2, size 24 in rows and 28 in the tab bar, colour `ink` or
`ink2`. Icons are never placed in tinted square tiles. Compartment labels have no icons. A
medicine without a photo shows a monochrome pill or its first letter in `accent` on a `field`
tile (`MedIcon`), never a tint.

---

## 4. Components (`components/ds`)

Import everything from `@/components/ds`. Full props per component are in
`components/ds/README.md`; this table is the visual spec.

**Layout**

| Component | Spec |
|---|---|
| `Screen` | Flat `bg`. Scroll view with side padding 20; `bottomInset="tabBar"` on tab screens; optional sticky `footer` for the primary button; keyboard-aware variant. No gradient. |
| `NavHeader` | 56 tall: round 48 back button on `field` (chevron or ×), optional centre title (17/700 `ink2`), optional right text action in `accent` 17/700 ("Edit", "Save", "+ Add"). |
| `HeaderTextAction` | The accent 17/700 text button NavHeader uses; also on tab headers. |
| `TabHeader` | Top of a tab screen: optional (tappable) line above, `title1`, optional subtitle and right actions (e.g. the person chip and "+ Add"). |
| `SectionHeader` | 16/700 `ink2` label above a group; `day` size = 20/800 journal day header. |
| `Divider` / `Spacer` | Hairline (`line`, or `line2` when strong) and fixed space. |
| `Card` | Flat `field` card radius 22, no shadow; tones `done` / `now` / `danger` / `inverse` / `bg`; `selected` = `bg` + 2 px accent border. |
| `TabBar` (`components/shell`) | Full width, 92 tall incl. safe area, `bg` with top hairline `line`. Four items: Today, Medicines, Journal, Settings (route `you`). Icon 28 + label 14/600. Active = `accent`. Hidden while the keyboard is open. No FAB. |

**Text and actions**

| Component | Spec |
|---|---|
| `Text` | Variants from §3.2 with the Atkinson family per weight and a `tabular` helper. Tones: primary, secondary, accent, onAccent, done, now, late, danger, onInverse. |
| `Icon` | Monochrome lucide icon, decorative (the parent carries the label). |
| `Button` | `primary` (accent fill, onAccent text), `secondary` (`field` fill, ink), `quiet` (transparent, ink2), `danger` (dangerSoft fill, danger text), `dangerQuiet` (red text, no fill), `link`. Height 60 (52 for quiet / dangerQuiet / link, 48 for `sm`). Radius 16. Full width by default (`sm` and `link` hug content). Disabled = 45% opacity. |
| `IconButton` | Round: 44 (sheet close, calendar arrows), 48 (header), 64 (stepper keys). Hit area ≥ 48. |
| `PressableScale` | Base pressable with the 0.98 press scale; `haptic="light"` only for take/skip/undo. |

**Inputs and selection**

| Component | Spec |
|---|---|
| `TextField` | `field` fill, radius 18, 68 min height, 22/600 text; focused = `bg` fill with 2 px `accent` border. Multiline variant 110 min height, 18/400. Label above: 16/700 `ink2`. |
| `DateTimeField` | Looks like TextField with a clock/calendar icon and chevron; opens the native picker. Honours the 24-hour setting. |
| `Stepper` | `field` card radius 22, 64 px round −/+ buttons on `bg` with `accent` glyphs, value `display`, unit 17/600 below. Decimal steps (0.5) and a min. Long-press repeats. Tap the number to type it (dotted 2 px `line2` underline and a 16 px pencil show this). A disabled key is `line2` with the glyph at 60%. |
| `SegmentedControl` | `field` track, 4 px padding, radius 14, 48 tall segments, selected = `bg` (plus a 1 px `line` border in dark mode). |
| `Chip` / `ChipRow` / `ChipGroup` | 50 tall, radius 999, `field`; selected = accent fill + onAccent text. `ChipGroup` is single select (radio) or `multiple` (checkbox). |
| `OptionRow` / `Radio` | Full-width card 76 min height: title 20/700, description 16 `ink2`, 30 px radio on the right (2.5 px `line2` ring). Selected = `bg` fill with 2 px `accent` border, radio filled. Optional pill ("Recommended", "Current"). |
| `CheckboxCard` | "I understand and agree" card with a 30 px checkbox. |
| `Switch` | 56×34, `line2` off with a 1 px `ink2` 30% border, `accent` on, white knob. Drawn in JS (the RN `Switch` track can't take a border). |
| `PinPad` | 3×4 grid of 76-tall `field` keys, 30/700 digits, "Clear" (or a custom left key such as "Use fingerprint") and backspace as quiet keys; 18 px dots above (4 by default, grows to 6). With `autoSubmitAt` the dot count is fixed and the PIN submits itself once that many digits are typed. `error` shakes the dots and turns them `danger`; a status line sits directly under the dots. |

**Lists and overlays**

| Component | Spec |
|---|---|
| `ListGroup` / `ListRow` | `field` group radius 20, rows 64 min height separated by `line2` hairlines, title 19/600, optional description 15 `ink2`, value 17/500 `ink2` with chevron, or a `Switch`. |
| `Sheet` | Bottom sheet, `bg`, top radius 28 (dark mode: 1 px `line2` top border), grab handle 44×5 `line2`, side padding 20, header with title2 and optional subtitle plus a round 44 close button on `field`. Max height 86 %. Dismiss on scrim tap, swipe down, back button. Inline editors scroll themselves into view. |
| `Toast` (`useToast`) | `inverse` fill, `onInverse` text 16/600, radius 18, 2 px `bg` border, 16 px from the sides, 32 px above the tab bar; title and message on one line when they fit (2 lines max); optional Undo (underlined, 700). |
| `useConfirm` / `useConfirmChoice` | A sheet with title2, a plain sentence, one primary or danger button and a quiet Cancel. `useConfirmChoice` adds a grey middle button ("Update supply first"). |
| `useActionSheet` | Sheet with a grouped list of 64-tall options and a quiet Cancel (photo source, etc.). |
| `CalendarSheet` / `Calendar` | Month grid in a sheet: weekday headers 13/700, 46-tall day cells, selected = accent fill + onAccent text, today = 2 px accent outline + ink text, days with entries get a 6 px accent dot under the number, other-month days in `line2`. Month title 20/800 ("November 2026 ▾", opens a year/month picker) with 44 px round prev/next. Closes after a pick. |
| `OverlayHost` | Internal: overlays render above open sheets and modal routes. |

**Pill box and medicine pieces**

| Component | Spec |
|---|---|
| `Compartment` | The day slot tile: 150 min height, radius 22, label 17/700, sub line 15/500 (wraps). Not finished: the count still to take in `display` + "to take" 20/600 ("1 to take"). Finished with something taken: "taken/total" ("2/2"); finished with only partial doses: a 40 px check in `doneInk`. So a big slashed "0" never shows. States: `default` (`field`), `now` (now fill + 2 px nowInk border), `done` (done fill, animates in over 300 ms), `skipped` (finished with nothing taken: `field` fill, the word "Skipped" in title3 `ink2`, no check), `empty` (2 px dashed `line` border, quieter 16/600 `ink2` label, "Nothing tonight"). An empty tile under 100 tall centres its two lines (Today uses 84 for a row of two empty slots). |
| `MiniTray` | Four 72-tall tiles showing which compartments a medicine uses, with the times inside. `scheduled` tone = `field` fill with accent border and text (planned, not taken); `done` tone = green. |
| `SupplyBar` | 8 px bar; track `bg` on `field` (`field2` in dark mode) or `field` on `bg`; fill neutral (`ink2`) or `accent`, `late` when low. |
| `MedIcon` | Medicine photo, or a monochrome pill (or first letter in `accent`) on a `field` tile; 40/52/64/92. Never tinted. |
| `StatusPill` | Small 13/700 pill: "✓ Taken 08:12", "Skipped", "Recommended", "Paused". Tones neutral / done / now / danger / accent. |
| `Avatar` | Round, `done` fill with `doneInk` initial, or photo; sizes 40, 60, 72, 120; optional accent ring. |
| `EmptyState` | Title 22/700, one sentence `ink2`, one primary button. No illustration. |

Deleted from the old system: `GradientBackground`, `FloatingTabBar`, `QuickAddSheet` (replaced by
the "+ Add" header action and the Journal "Log a past dose" action), `ProgressRing`, `MiniRing`,
`MedTile` tints, `StatusChip` colour tiles, `Meter` (use `SupplyBar`), `SwipeableRow` (swipes
were shortcuts only; the app stays one-tap instead), the `app/dev` gallery screens, the separate
`app/log/as-needed` and `app/you` pages.

---

## 5. Screens

Copy below is final English copy. Every string has Dutch and Turkish equivalents in the locale
files (`lib/i18n/locales/ui/*`); never leave a key untranslated.

### 5.1 First launch

1. **Welcome.** Compact language chip top right (globe icon + "English", opens the language
   sheet "Language" / "The app switches right away."). Title "Like your pill box, but it reminds
   you." and body "Morning, midday, evening, night. Tap when you've taken it. Everything stays on
   this phone." come first; below them a small 2×2 pill box (96-tall tiles, 85% opacity, not
   pressable, one image label) under the caption "Example" (footnote, `ink2`) as the only picture. Primary at the bottom: "Get started".
2. **Before you start** (one page). Back button. Four bold claims, each with one plain sentence:
   "Your data stays on this phone", "A reminder, not a doctor", "Reminders depend on your
   phone", "Check your entries". A link "Read the full text" opens the full "Good to know" page
   (every legal point of the old disclaimer, one section per topic, subtitle "The full text of
   what you agree to."). Checkbox card "I understand and agree" enables primary "Continue". The
   acknowledgement record (version, device, time) is unchanged.
3. **Keep it private.** Title "Keep it private", "Lock the app so only you can open it.",
   primary "Use a PIN code" with the footnote "If you choose a PIN and forget it, there is no way
   back in…" directly under it, secondary "Use fingerprint or face" (only when the device
   supports it), quiet "Don't lock the app".
4. **Choose a PIN** ("4 to 6 digits."), then **Repeat your PIN** ("Type the same digits
   again."): centred title, hint, dots, PinPad, primary "Next". Repeat submits itself once as
   many digits as the first PIN are typed. A mismatch stays on Repeat (the first PIN is kept) and
   shows a strong error line under the dots, "They didn't match. Type the first PIN again.", with
   a quiet "Choose a different PIN" under "Next" that starts over at Choose a PIN.
5. **What should we call you?** Big avatar (120) with camera badge, label "Your name", text field,
   hint "Just a first name is fine. You can add family members later." Primary "Continue".
6. **Lock screen** (returning users): avatar 120 (72 on screens under 740 tall), "Welcome back,
   {name}", "Enter your PIN to open the app.", dots, PinPad. "Use fingerprint" as the quiet left
   key when biometrics are set up; in biometric mode one big "Open with {method}" button with
   "Use PIN instead". The PIN submits itself once the stored length is reached (no "Open" button;
   installs from before the length was stored keep "Open", and 6 digits still submit on their
   own). Wrong PIN shakes the dots once (skip under Reduce Motion), shows them in `danger` for
   600 ms, then clears, with "That's not it. Try again." directly under the dots. Too many tries:
   "Too many tries. Try again in {n} seconds." A quiet "Forgot your PIN?" under the pad opens a
   sheet that says plainly there is no reset (the PIN never leaves the phone; reinstalling is the
   only way back; an exported report is not affected), with "Try again".

### 5.2 Today

- Top row: "**Monday** 9 November" (weekday bold, never wraps) left; a 48-tall "Pick a day" chip
  (calendar icon + label) right that opens the day picker sheet (at font scale ≥ 1.3 it collapses
  to its calendar icon). When another day is shown, the bold part becomes "Yesterday" /
  "Tomorrow" / the weekday, and a "Back to today" quiet button appears under the tray.
- `title1` greeting, one line (shrinks to 75 % before it would wrap), time-aware: "Good morning,
  {name}" before 12, "Good afternoon" before 18, "Good evening" after; "Hello" when the shown day
  is not today.
- **Person chip**: with more than one person in the app, a small chip (Avatar 32 + "Tom ▾")
  under the greeting shows whose medicines are on screen. It opens the person picker sheet
  "Whose medicines?" (people with avatars, the one in use checked, plus "Manage people"); picking
  someone asks "Switch to Tom?" and shows a toast with Undo. The same chip sits on the Medicines
  and Journal headers. Hidden with one person.
- Status line (callout `ink2`, bold part in `ink` 800):
  - today: "**2 of 5** taken · 3 more to go today." / "**Nothing taken yet** · 2 to go today." /
    "**Nothing taken** · 1 skipped." / "All done for today." / "Nothing planned today."
  - past day: "**2 of 5** taken · 3 not logged." / "Everything logged for this day."
  - future day: "**3 doses** planned." / "Nothing planned this day."
- **Tray**: 2×2 compartments Morning, Midday, Evening, Night. Boundaries default to Morning
  before 11:00, Midday 11:00 to 16:00, Evening 16:00 to 21:00, Night from 21:00 (editable under
  Settings → Parts of the day, §5.6). Tile content:
  - count: doses still to take ("1 dose to take", "2 doses to take"); once finished "taken/total" ("2/2"), or a check
    when only partial doses were taken.
  - sub line: the medicine names (up to two, then "+1"), then the status: "Metformin · due at
    10:00", "Metformin, Lisinopril +1 · 1 late", "Aspirin · from 20:00", "Metformin · all taken",
    "Metformin · done, 1 skipped", "1 not logged" (past days).
  - finished with only skipped doses: neutral `field` tile with the word "Skipped" (skipping is
    not success, so no green and no check).
  - empty compartment: dashed, "Nothing this morning" / "Nothing at midday" / "Nothing this
    evening" / "Nothing tonight"; not pressable. A row whose two compartments are both empty
    collapses to 84 tall; any row with a dose keeps 150.
  - the compartment containing the current time (or the earliest unfinished one if the current
    one is done) gets the `now` style. Any other compartment with doses still to take that are
    not due yet gets a 2 px `accent` outline at 50 % opacity and a 20 px `ink2` chevron at its
    top-right beside the label, so it reads as something to open (its sub line stops at two
    lines with an ellipsis).
- **Next dose**, under the tray, kept small so the amber compartment stays the obvious thing to
  press (there is no "Up next" card):
  - Due or late: a compact banner in `now` fill with a 2 px `nowInk` border, "Metformin · 4 hours
    late" (or "· now") in headline over "1 pill · planned for 08:00" (footnote; tapping the text
    opens the compartment sheet), and one 56-tall primary "I took it" on the right (under the
    text, full width, at font scale > 1.2).
  - Not due yet: one tappable `field` row with a chevron, "Next: Metformin" (headline) over "1
    pill at 20:00, in 7 hours" (footnote), that opens that compartment's sheet.
  - Nothing left: nothing (the status line already says "All done for today.").
- **Reminders banner**: when there is at least one scheduled medicine and reminders are off on
  today's view, a `now` banner "Reminders are off" with "Your phone is blocking them." (blocked;
  "Turn on" opens the phone settings) or "Allow them so you get a nudge at each dose." (not asked
  yet; "Turn on" shows "Allow reminders?" / "To remind you at 08:00 and 20:00, your phone will now
  ask for permission." with "Continue" / "Not now" before the OS dialog).
- **When you need it**: one bordered row per active as-needed medicine ("None today" / "1 taken
  today, last at 14:00") with a "Log a dose" chip; the whole row is one button. Hidden when there
  are none.
- Empty (no medicines at all): `EmptyState` "Nothing to take yet" / "Add your first medicine
  and we'll remind you when it's time." / "Add a medicine".
- Pull to refresh stays.

**Compartment sheet** (tap a compartment): title "Morning", subtitle "Taken at 08:12" / "Both
taken at 08:12" / "All 3 taken" / "Done, 1 skipped" / "One to take" / "2 to take, from 20:00"
(with several people it starts "For Tom ·"). One row per dose, separated by a `line` hairline and
20 px spacing: name title3, detail callout `ink2` (amount, "planned for 20:00", note), then state
lines ("41 minutes late", "Due in 2 h", "Not logged", "Moved to this time", "Your note: …").
- A dose to take: three equal `field` buttons, at least 48 tall, labels 17/600 that wrap to two
  lines rather than shrink: "Earlier time" (read out as "Record an earlier time for …"), "Took
  less", "Skip" (Skip in `ink2`), then a full-width 60-tall primary "I took it" last, nearest the
  thumb (always green). An upcoming dose today gets a line "In 6 hours" above the buttons and its
  primary reads "Record as taken now". At large font
  sizes the buttons stack.
- "Earlier time" opens in place: "When did you take it?" time field (default the planned time),
  "Save" / "Cancel".
- "Took less" opens in place: stepper "How much did you take?" with "Log this amount" / "Cancel".
- "Skip" opens in place: "Why? (optional)" chips Forgot / Felt unwell / Ran out / Doctor's advice
  / Other (saved as the log's note), "Skip this dose" / "Cancel".
- A logged dose: a status pill ("✓ Taken 08:12", "Partial 08:12", "Skipped") right of the name,
  then quiet "Change" and "Undo". "Change" opens in place: segmented Taken / Skipped / Partial, a
  stepper (taken/partial), "Time you took it", a note field and "Save changes" / "Cancel".
- While an editor is open that row's other buttons hide, and the sheet scrolls the editor into
  view. The sheet never closes itself: once everything is handled the status and a quiet "Done"
  show at the bottom.
- Taking a dose more than two hours early asks first: "Record this dose as already taken?" /
  "It's planned for 20:00. We'll record it as taken now, at 14:36." / "Record as taken" / "Go
  back".
- Taking a late dose close to the next one asks "Your next dose is soon" with "Keep my schedule"
  / "Move next dose" (then "Move the next dose" with a date and time, "Move and take now").
- Max-per-day and minimum-interval checks keep their behaviour: "This goes over your daily
  limit" / "Your last dose was recently", "Take anyway".
- Zero or short supply never blocks an honest record: "Your supply count is 0. Log it anyway?" /
  "The count won't go below 0. You can correct it any time under Update supply." with "Log
  anyway", "Update supply first" and Cancel. An untracked supply never asks.

**As-needed sheet**: title name, subtitle "Usually 1 pill", a `field` note "Today: none taken
yet. Your limit is 3 a day. Last one was Saturday 15:30.", stepper "How much?", primary "Log it,
taken now", secondary "A different time" (opens Log a past dose with this medicine), quiet "Add
a note". Toast "Ibuprofen logged · 1 pill at 14:00" with Undo.

**Day picker sheet**: title "Pick a day", `Calendar` (days with entries dotted), quiet "Back to
today".

### 5.3 Medicines

- Header: `title1` "Medicines" with "+ Add" on the same row (and the person chip), subtitle "4
  medicines, taken regularly · 1 when needed · 1 paused" ("1 medicine, taken regularly"). A search field appears once there are more than 8
  medicines.
- Cards (`field`, radius 22): photo or first-letter tile, name with strength via
  `medicineDisplayName` ("Metformin 500 mg", 22/700), line "1 pill · morning and evening" (uses
  compartment names when the times fall in the default slots, else times), supply line "29 pills
  left, about 2 weeks" with `SupplyBar`. Chevron right.
- Supply colour rule: the supply line and bar are neutral (`ink2`). Only a reached refill
  reminder ("6 pills left, refill soon") or a tracked count of 0 on an active medicine ("None
  left, refill now") is drawn in `late`. An untracked supply reads "Supply not tracked" with no
  bar and no warning colour. As-needed medicines get the same line and bar when tracked.
- Sections: regular, "When needed", "Paused" (paused cards at 70 % opacity and say "Paused").
- Empty: `EmptyState` "No medicines yet" / … / "Add your first medicine".

**Medicine detail** (full page, no tab bar): NavHeader with back and "Edit". Compact header: 64
px photo or first-letter tile, `medicineDisplayName`, "1 pill each time". A status pill shows only
when paused ("Paused"); an active medicine shows none. `MiniTray` of its compartments with times
(neutral "scheduled" tone: green means taken on Today). Group: "Last taken / Today at 08:12"
(with "Recorded for today's 20:00 dose" when it was logged for another time), "Next dose / Today
at 20:00" (the next scheduled dose that has no log yet, same rule as Today, so a dose recorded
early is not shown as next). As-needed: primary "Log a dose". Supply card (when tracked):
`display` count + "pills left" with a small "Update supply" beside it, "About 2 weeks at your
current pace", bar, rows "Pack size" and "Refill reminder"; at the refill threshold or 0 a
warning box says so and the number and bar turn `late`. "Update supply" is a filled 48-tall
secondary button (`field2` on the `field` card, `ink` text). With no refill reminder set the card
ends in a "Remind me when running low ›" row (chevron). The card sits under a "Supply and expiry"
label with an "Expiry date" row right below it (date + "Expires in 40 days", or "Not set ›").
Then "Note" (the note, or "Add a note ›"), "Dose limits" (Maximum in one day, Time between doses,
or "Add dose limits ›") and "Reminder sound" (only when "Ring even on silent" is on): one heading
per subject, no second "Notes and dose limits" group. A quiet "Finish setting
up" group while the supply is untracked or no note/limits are set: "Track your supply" (opens the
supply sheet in Set the total) and "Add a note or limits"; each row goes once done. "More" group:
"See in Journal", "Pause this medicine / Reminders stop. Resume any time." (or "Resume this
medicine"), danger "Delete medicine".

**Update supply sheet**: segmented Add / Remove / Set the total; stepper; quick chips "A full
pack (60)", "Half a pack (30)" when the pack size is known (not when removing); summary card "29
now → 89 after · about 6 weeks" once a change is entered; "Why? (optional)" chips that fit the
mode (Add: Refill / Other; Remove: Lost or damaged / Other; Set the total: Correction / Other);
primary "Save". The summary is `ink`; only a result of 0 turns it `late`.

**First count** (the supply isn't tracked yet; from "Track your supply", "Start tracking" or the
nudge): title "How many do you have?", no mode switch. Quick chips for common pack sizes (28, 30,
56, 60, 90, 100, plus the medicine's own pack size when it is another number) sit above the
stepper and set the count; the stepper's number opens for typing as the sheet appears. Then a
"Remind me when running low" switch (on by default) with a "Days before you run out" stepper
(default 7; as-needed medicines: "Doses left when we remind you"), which sets the refill reminder.
No summary and no reason chips. Primary "Start tracking"; saving turns tracking on and stores the
reminder choice. Toast "Supply updated · You now have 89 pills."

**Pause / Delete** confirm sheets: "Pause Metformin?" / "Reminders stop. Its history stays in
your Journal, and you can resume any time." and "Delete Metformin?" / "This removes the
medicine, its reminders and its history. You can't undo this."

### 5.4 Add a medicine (4 steps, full page, no tab bar)

Each step: NavHeader (× on step 1, ‹ after), "Step n of 4" 15/700 `ink2` with four 8 px dots
under it (`accent` for done and current, `field2` for the rest; decorative),
`title1` question, one-sentence subtitle, controls, sticky footer with primary "Next" (disabled
until valid, with the reason written above it). Leaving with changes asks "Discard this
medicine?".

1. **What's it called?** "The name on the box is perfect." TextField "Medicine name"
   (autofocus), "Strength (optional)" field (placeholder 'As on the box, like "500 mg"', up to 40
   characters), photo row (dashed square, "Add a photo", "Optional. Helps you recognise the
   box.") opening the take-photo / choose-from-library action sheet.
2. **How much each time?** "The amount you take at one go." Stepper (0.5 steps, min 0.5), label
   "Measured in", chips for the four common units (Pills, Millilitres, Puffs, Drops) and "More…"
   for the other four, summary "1 pill each time".
3. **When do you take it?** The schedule type and its settings on one page, frequency first.
   Radio cards "Every day · Once or more a day" (times are added below, so one card covers once
   and several times a day), "On certain days of the week", "Only when needed", then "Other
   schedules" that reveals Every few days, Once a month on a weekday, On and off in cycles, Every
   few hours, Gradually lowering the dose. The chosen type's settings appear directly under its card, each
   ending with a live summary:
   - Every day / several times a day: time cards (label "Time 1", large time that opens the
     native time picker, optional different amount at this time, round × remove), secondary "+
     Add another time" (sensible next default), summary "Every day at 08:00 and 20:00. We'll
     remind you at both."
   - Every few days: stepper "Every … days", start date, time.
   - Certain days: 7 day chips (multi) with quick chips, time.
   - Once a month on a weekday: first/second/third/fourth/last and weekday, time, summary "The
     first Monday of each month at 08:00".
   - Cycles: days taking it and days off, start date, time, "Next break: … to …, then it starts
     again."
   - Every few hours: stepper "Every … hours", first dose time, summary "Each day: 08:00, 16:00."
   - Gradually lowering: start amount, step, every … days, summary "Your doses: 4 → 3 → 2 → 1",
     start date, time.
   - Only when needed: nothing more to set.
4. **Does this look right?** "Tap anything to change it." Header card (photo or first letter,
   name + strength, "1 pill at 08:00 and 20:00, every day"), then "First reminder: today at
   20:00" (worked out from the schedule; a new schedule starts when it is saved), `MiniTray` with
   the caption "Shown on Today as", and groups Schedule / Medicine / Supply / Extras whose rows
   jump back to their step. Supply and "Notes and dose limits" are not steps: untouched they read
   "Supply · Not tracked" and "None" and open as their own pages with a Save:
   - **Supply page** ("How many do you have?" / "Count what's in the box now. We'll count down and
     warn you before you run out."): count stepper, "Pack size" row (stepper sheet, "How many come
     in a new box"), "Remind me to refill" segmented Off / By days left / By pills left (By doses
     left when one dose isn't one pill; as-needed: Off / By pills left), a sentence for the chosen
     mode and a threshold stepper. Saving a new medicine at 0 first shows "Saved at 0, we won't
     count this medicine's supply. Tap Save again to keep it that way, or enter how many you
     have."
   - **Notes and dose limits page** ("A few extras" / "All optional. Skip anything you're not
     sure about."): "Note (shown with every dose)", an "Expiry date" row (a calendar sheet; it is
     printed on the box, not a limit), "Dose limits from your prescription" (Maximum in one day,
     Time between doses; each opens a stepper sheet with "Remove limit" / "No limit"), and a
     "Reminder sound" group with the "Ring even on silent" switch.

   Primary "Save medicine". Notification permission is asked as before. After saving: back to
   where the flow started with the toast "Metformin added. We'll remind you at 08:00 and 20:00."
   (as-needed: "… Log it from Today when you take it."; reminders off: "… Reminders are off, turn
   them on in Settings."). A new scheduled medicine without a counted supply instead gets the
   **supply nudge** sheet: "Metformin saved" / "Want to count how many you have left? We'll show
   how many days remain." / primary "Count my supply" (the supply sheet's first count) / quiet
   "Not now". It never stacks with "Allow reminders?": it waits until that (and the phone's own
   dialog) is answered.

**Day-one start rule**: a new medicine's schedule starts at the moment it is saved, so times that
already passed that day are not generated (adding at 13:00 doesn't make 08:00 "5 hours late").
A schedule changed later starts at the beginning of that day, so an edit never hides a dose
already logged earlier that day.

**Edit medicine** is a summary list, not a long form: NavHeader, `title1` "Edit Metformin", then
groups Medicine (Name and photo, Strength, Amount each time), Schedule (type + times), Supply and
expiry (Supply, Refill reminder, Expiry date; the review step has the same group), Notes and dose limits (Note, Dose limits, and the "Reminder sound" switch, which saves straight
away). Each row opens its section page (`/medication/edit/[id]/[section]`, the same controls as
the add steps) with its own Save; back with changes asks "Discard your changes?". Changing the
type asks "Change how often?" / "The times and days you set now will be replaced." Saves only
write the schedule and supply count when they changed, so the start date, moved doses and doses
logged meanwhile are kept.

### 5.5 Journal

- `title1` "Journal" (person chip right), a 52-tall secondary "Log a past dose", then one
  "Filter · Last 7 days" chip (names the period in use; count badge when any filter differs from
  the default) that unfolds the segmented
  7 days / 30 days / 90 days / All and two picker chips: "All medicines ▾" (radio sheet "Show
  entries for") and "Any status ▾" (radio sheet "Show entries that are": All / Taken / Partial /
  Skipped). Open or folded is kept for the app session. The first day's entries show without
  scrolling on a 360×800 screen.
- Timeline per day: day header ("Today, Monday 9" 20/800 and "2 taken" right), a vertical 3 px
  rail with a 22 px dot per entry (done fill + doneInk ring = taken, now = partial, field + line2
  ring = skipped). Entry row: time 18/700 with a small outlined "early" / "late" tag in `ink2`
  when a scheduled dose was taken more than 2 hours off its planned time, status pill right; name
  19/700 (wraps); detail 15 (amount, "planned 20:00" or "when needed", note in quotes). Newest
  first within a day, days newest first.
- Empty: "Nothing logged yet" / "Doses you take, skip or log by hand show up here." No match:
  "Nothing here" / "No entries match these filters." with "Clear filters" (or "Show all time").

**Entry sheet**: title name, subtitle date; rows What happened / Taken at (or Skipped at, with a
small "Recorded …" line when it was written more than 5 minutes later) / Planned for / Amount /
Note; secondary "Edit this entry" (opens Log a past dose in edit mode), danger "Remove this entry"
(confirm "Remove this entry?"; the supply is given back). Entries of a deleted medicine can only
be removed.

**Log a past dose** (full page, no tab bar): "Forgot to log one?" / "Tell us what, when and how
much." Chips for the medicine (or a "Change medicine" row when more than 6), segmented Today /
Yesterday / Pick a day (calendar sheet). For a scheduled medicine, "Which dose?" chips list that
day's planned times ("08:00 · taken", "20:00") plus "Another time"; a planned time fills in the
time and saves the entry for that dose so Today counts it. "When did you take it?" opens the
native time picker (default now; "When was it due?" for Skipped). Segmented Taken / Partial /
Skipped, stepper "How much" (hidden for Skipped), "Note (optional)", a summary line, primary
"Save to Journal" (disabled with "Choose a medicine to continue" until one is chosen). Toast
"Saved to your Journal." Edit mode ("Change this entry") is the same page, medicine fixed, "Save
changes".

### 5.6 Settings

The fourth tab is named **Settings** (route `you`).

- Avatar 72 + `title1` name, with an "Edit name or photo" list row under them.
- "People in this app": a `field` card with a row of 60 avatars and names, the person in use with
  an accent ring (one person: avatar and name on one line), then "+ Add another person". Tap =
  switch (confirm "Switch to Tom?" / "You'll see Tom's medicines and reminders. You can switch
  back any time.", toast with Undo). With more than one person, a "Manage people / Edit or remove
  people" row.
- Groups, in this order under the name row: **Reminders and privacy** (Reminders › On / Not
  allowed yet / Blocked by your phone; App lock › PIN / Fingerprint / Off), **Preferences**
  (Language › English; Appearance › System; 24-hour time switch "Times look like 20:00"; Parts of
  the day with the value "Midday 11:00 · Evening 16:00 · Night 21:00"), **People in this app**
  (the card above), **Your data** (Export a report / A PDF to share with your doctor), **About**
  (Good to know / What you agreed to when you started; Version 1.0.0).

**Appearance** sheet: "Changes right away." `OptionRow`s System (Follow phone setting), Light,
Dark. Stored per profile; applied at once.

**Reminders**: "Your phone shows a reminder at each planned dose." A status card ("On" / "Not
allowed yet" / "Blocked by your phone" with one sentence), the next planned one ("Next:
Metformin at 20:00"), one primary that fits the status ("Allow reminders", or "Open phone
settings" when blocked) and secondary "Send a test reminder" (a local notification 5 seconds
later, toast "A test reminder arrives in 5 seconds.").

**Parts of the day** (formerly "Compartment times"): "Only changes how doses are grouped. Your
reminder times stay the same." Morning is everything before Midday; time fields for when Midday,
Evening and Night start, each with a sentence ("Doses from 11:00 until 16:00 count as midday.").
Times must go in order ("Times must go in order: midday, then evening, then night."). Primary
"Save times". Stored per profile; defaults 11:00, 16:00, 21:00.

**Manage people**: every person with Edit and Remove buttons (the only place to remove someone).
The person in use can be removed when exactly one other person exists ("Switch to Ann and remove
Tom" does both); otherwise a sentence says to switch first.

**Edit profile / New profile**: avatar 120 with camera badge, "Name" field, hint "Shown on your
Today screen.", danger "Remove this person" (for the profile in use only the sentence explaining
why it can't be removed), primary "Save changes" / "Create profile".

**App lock**: asks the current PIN first (PinPad page "First, confirm it's you", auto-submits at
the stored length) or biometrics, then three `OptionRow` cards: PIN code (pill "Current" when
active, tap to choose a new PIN), Fingerprint or face (when available), No lock (confirm "Turn off
the lock?").

**Export a report**: title, "A PDF of {name}'s medicines and journal, ready to hand to a doctor.",
a plain "What's inside" list, one warning card "Before you share" with three bullets and a "More
about sharing safely" link that shows the rest, and the footnote "This is a report to read or
print. It is not a backup the app can restore." Sticky footer: checkbox "I understand the file
isn't encrypted" directly above secondary "Save PDF" and primary "Share PDF", both disabled until
checked. Existing PDF generation unchanged.

**Language**: `OptionRow`s English, Nederlands (Dutch), Türkçe (Turkish). Switches immediately.

**Good to know**: the four disclaimer topics as a single scrolling page with the same card style.

### 5.7 Notifications

No visual change to notification content. The notification actions (Take, Skip, Snooze) remain.
When the app opens from a dose reminder it lands on Today with that dose's compartment sheet
open. The test reminder (§5.6) has no actions and opens nothing special.

---

## 6. Copy rules

Plain, warm, short. Sentence case. No exclamation marks. Say what the button does: "Save
medicine", "Log it, taken now", "Remove this entry". Status words are consistent everywhere:
Taken, Skipped, Partial, Due, Late. Numbers and times in tabular figures. Never "Submit",
"OK", "Error". Errors say what happened and what to do: "Couldn't save. Check the amount and
try again."

---

## 7. Accessibility checklist (every screen)

- Dynamic type: layouts survive 130 % font scale without clipping (wrap, never truncate names).
- Every pressable: role, label, and for state buttons `accessibilityState`.
- Compartments announce "Morning, 2 of 2 taken, all taken, button" / "Morning, 1 to take,
  Metformin, due at 20:00, button" / "Morning, none taken, 1 skipped".
- Focus order top to bottom; sheets trap focus; the close button is first.
- Colour contrast: `ink2` on `field` ≥ 4.5:1 (checked), `doneInk` on `done` ≥ 4.5:1, `nowInk` on
  `now` ≥ 4.5:1, `onAccent` on `accent` ≥ 4.5:1 in both themes.
- Reduce Motion respected; haptics only on take/skip/undo.

---

## 8. Engineering notes

- `expo-router` structure kept. Screens that hide the tab bar (medicine page, add flow, edit list
  and section pages, log past dose, profile pages, manage people, settings pages, app lock,
  export) live outside the `(tabs)` group. Settings pages are under `app/settings/`
  (`compartments`, `language`, `reminders`); edit pages are `app/medication/edit/[id]/index` and
  `[section]`.
- `lib/theme.ts` exports `palette`, `useTheme()`, `radii`, `spacing`, `type` (the scale above),
  `fontFamily` and `fontForWeight`. `tailwind.config.js` maps the same tokens. The old tokens
  (`bgTop`, `surface`, `stroke`, `accentSoft`, `success*`, `warning*`, `medTints`, `statusColors`)
  are gone.
- Fonts: `AtkinsonHyperlegibleNext_400Regular` … `_800ExtraBold` loaded with `useFonts` in
  `app/_layout.tsx`; `SplashScreen.preventAutoHideAsync()` until loaded.
- `expo-linear-gradient` and `expo-blur` are removed (usage and dependencies).
- Database: two new `medications` columns, added by migration when missing: `strength` (TEXT,
  optional free text, shown via `medicineDisplayName`) and `track_supply` (INTEGER, default 1;
  0 = supply not tracked, nothing is counted down and no supply checks run).
- Profile settings JSON gains `appearance` (`'system' | 'light' | 'dark'`, default system;
  `lib/settings/appearance.ts`) and `compartmentBoundaries` (`{ midday, evening, night }` as
  "HH:mm", default 11:00 / 16:00 / 21:00; `lib/settings/compartments.ts`).
- The PIN length is stored next to the PIN (`user_pin_length` in secure storage) so the lock
  screen and the App lock check can submit on their own; PINs set before this keep the "Open"
  button.
- Test reminder: `lib/notifications/test-reminder.ts`; permission state for banners and the
  Reminders page: `lib/notifications/use-permission.ts`.
- Unit tests in `__tests__` must stay green (compartment bucketing and the settings defaults are
  covered).
- No new network calls. No analytics. No remote fonts or images.

---

## 9. Feature inventory (must all remain reachable)

Onboarding: language (EN/NL/TR), welcome, consent with agreement and full text, lock choice (PIN
4 to 6 digits, biometric where available, none), profile name and photo. Lock screen with PIN
(auto-submit), biometrics, cooldown and "Forgot your PIN?". Today: day navigation (day picker),
progress summary, time-of-day grouping, person chip, dose states (due, late, taken, skipped,
partial, moved), take now, taken earlier, skip with reason, partial amount, change a logged dose
(status, amount, time, note), undo, early-dose, overlap, max-per-day, minimum-interval and
short-supply checks, reminders-off banner, as-needed logging with amount and note, pull to
refresh. Medicines: list with supply and search, add flow (name, strength, photo, amount and unit
(pills, mg, g, ml, puffs, drops, patches, units), 9 schedule types with all their parameters,
multiple times with per-time amounts), review with first reminder, supply count or not tracked,
pack size, refill reminder off/days/doses, notes, expiry date, max per day, minimum interval, Do
Not Disturb bypass, supply nudge, edit (summary list and section pages), detail (schedule,
last/next, supply, notes, safety, finish setting up), update supply (add/remove/set with reason,
start tracking), pause/resume, delete, see in journal. Journal: range filter, medicine filter,
status filter, day grouping, early/late tags, entry detail, edit, delete, log a past dose
(medicine, date, which dose, time, status, amount, note). Settings: edit name and photo, multiple
profiles (add, switch, manage, edit, remove), language, appearance, 24-hour time, parts of the
day, reminders (status, allow, test reminder), app lock (change PIN, biometric, off, with
current-PIN confirmation), export PDF (save or share, acknowledgement), Good to know, version.
Notifications with actions, background upkeep. Dark mode. i18n for all of it.
