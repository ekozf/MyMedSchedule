# MyMedSchedule — "Calm" design system & UX spec

> Clean. Minimal. Powerful. Beautiful.
> Every screen should answer one question, offer one obvious next step, and never make
> someone who is tired, anxious, or 80 years old feel lost.

This document is the single source of truth for the UI redesign on `feat/full-ui-redo`.
The backend (`lib/`, `store/`, `types/`) is **not** being redesigned: every capability it
exposes today must remain reachable. Only the UI/UX is rebuilt, from scratch.

---

## 1. Principles

1. **One primary action per surface.** It is big, filled, and at the bottom within thumb reach.
   Secondary actions are quieter (tinted or plain). Destructive actions are never primary
   and always confirmed.
2. **Say it in words.** Icons always come with a label (tab bar included). Use plain language
   ("Every day", "Only when needed") instead of jargon ("once_daily", "PRN").
3. **Progressive disclosure.** Show the 20% people need every day; tuck the rest one tap away
   (e.g. "Add a note", "Advanced"). Long forms become guided steps.
4. **Direct manipulation, with a visible fallback.** Swipes are shortcuts, never the only way.
   Everything a swipe does is also a visible button in the sheet that opens on tap.
5. **Forgiving.** Prefer an *Undo* toast over an "Are you sure?" dialog for reversible actions.
   Confirm only for destructive or irreversible ones.
6. **Calm feedback.** Soft springs, light haptics, gentle colour. Nothing flashes, nothing shouts.
   Status is never communicated by colour alone (always icon + text too).
7. **Accessible by default.** Minimum touch target 48×48 (primary buttons 56 tall). Body text 17.
   Respect system font scaling (never disable `allowFontScaling`). Respect Reduce Motion.
   Every pressable has `accessibilityRole` + `accessibilityLabel`.

---

## 2. Visual language — "Airy sky"

### 2.1 Colour tokens

All colours live in `lib/theme.ts` (JS, for gradients/icons/SVG) and `global.css` (CSS variables
for NativeWind classes). **Never hard-code a hex in a screen.** Use a token class
(`bg-surface`, `text-ink-secondary`, …) or `useTheme().colors.*`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg-top` | `#D9E9FB` | `#0A1322` | gradient start (top) |
| `bg-mid` | `#EAF3FB` | `#0D1A2C` | gradient middle |
| `bg-bottom` | `#E1F3EA` | `#0B2023` | gradient end (bottom, mint) |
| `surface` | `rgba(255,255,255,0.78)` | `rgba(255,255,255,0.07)` | glass cards |
| `surface-solid` | `#FFFFFF` | `#152235` | sheets, inputs |
| `surface-sunken` | `rgba(15,27,45,0.05)` | `rgba(255,255,255,0.05)` | fields, segmented track |
| `stroke` | `rgba(255,255,255,0.9)` | `rgba(255,255,255,0.08)` | glass hairline |
| `separator` | `rgba(15,27,45,0.08)` | `rgba(255,255,255,0.08)` | list dividers |
| `ink` | `#0F1B2D` | `#F2F6FB` | primary text |
| `ink-secondary` | `#5B6B7F` | `#A5B3C5` | secondary text |
| `ink-tertiary` | `#94A3B5` | `#6B7A8F` | placeholders, captions |
| `accent` | `#2F7FEA` | `#5AA2FF` | primary actions, selection |
| `accent-soft` | `#E2EDFD` | `rgba(90,162,255,0.16)` | tinted buttons, selected chips |
| `success` | `#12A594` | `#2DD4BF` | taken |
| `success-soft` | `#DAF3EF` | `rgba(45,212,191,0.16)` | |
| `warning` | `#E08A00` | `#FBBF24` | due now, running low, early |
| `warning-soft` | `#FDF0D9` | `rgba(251,191,36,0.16)` | |
| `danger` | `#E5484D` | `#FF7A73` | late, skipped, destructive |
| `danger-soft` | `#FDE6E6` | `rgba(255,122,115,0.16)` | |
| `on-accent` | `#FFFFFF` | `#06121F` | text on filled accent/success/danger |

**Medicine tint palette** (deterministic per medicine name hash, for the icon tile):
blue `#2F7FEA`, teal `#12A594`, violet `#7C66DC`, coral `#E5484D`, amber `#E08A00`,
pink `#D6409F`, indigo `#3E63DD`, green `#30A46C`. Tile background = tint at 14% opacity.

### 2.2 Typography (system font — SF Pro on iOS, Roboto on Android)

| Variant | Size / line | Weight | Use |
|---|---|---|---|
| `largeTitle` | 34 / 41 | 700 | screen titles |
| `title1` | 28 / 34 | 700 | sheet hero, big numbers |
| `title2` | 22 / 28 | 700 | section heroes |
| `title3` | 20 / 25 | 600 | card titles |
| `headline` | 17 / 22 | 600 | row titles |
| `body` | 17 / 22 | 400 | default |
| `callout` | 16 / 21 | 400 | |
| `subhead` | 15 / 20 | 400 | row subtitles |
| `footnote` | 13 / 18 | 400 | meta |
| `caption` | 12 / 16 | 500 | overlines (uppercase, +0.6 letter spacing) |
| `time` | 24 / 28 | 600 | dose times, `fontVariant: ['tabular-nums']` |

### 2.3 Shape, depth, spacing

- 4-pt grid. Screen gutter **20**. Card padding **16**. Gap between cards **10**.
- Radii: card **24**, row **20**, input **16**, sheet **32** (top corners), buttons/chips **full pill**.
- Glass card: `surface` fill + 1px `stroke` border + shadow `0 8 24 rgba(30,60,90,0.08)` (light only).
  On iOS glass may use `BlurView` (intensity 30); on Android use the translucent fill only (perf).
- Screen background: vertical `LinearGradient` `bg-top → bg-mid → bg-bottom`.

### 2.4 Iconography

`lucide-react-native`, stroke width 2, size 22 in rows, 24 in tab bar. Always tinted with a token
colour (use the `Icon` wrapper from the design system — raw lucide icons don't pick up classNames).

### 2.5 Motion & haptics

- Default spring: `{ damping: 18, stiffness: 180, mass: 1 }`. Press feedback: scale to 0.97.
- Sheets: spring up from bottom, backdrop fades to `rgba(8,15,30,0.35)`; drag down to dismiss.
- Lists: items enter with `FadeInDown` (20 ms stagger, max 8 items staggered).
- Progress rings animate from previous to new value (600 ms, ease-out).
- Respect `useReducedMotion()` — replace movement with a simple fade.
- Haptics (`lib/ui/haptics.ts`): `tap` (selection) on chip/segment/tab change; `light` on button
  press; `success` after logging a dose; `warning` when showing a safety warning; `error` on wrong PIN.

---

## 3. Information architecture

```
Launch
 ├─ Onboarding (first run): Welcome → Good to know (disclaimer pages) → Protect → You (profile)
 ├─ Lock (if app lock on): PIN pad / Face ID
 └─ Main
     ├─ Floating tab bar:  [ Today | Medicines | Journal ]   ( + )
     │     + → Quick add sheet: Add a medicine · Log an as-needed dose · Log a past dose
     ├─ Avatar (top-left on every tab) → "You" (modal): profiles, preferences, security, export, about
     ├─ /medication/add         guided flow (modal)
     ├─ /medication/[id]        medicine detail
     ├─ /medication/edit/[id]   edit (grouped form)
     ├─ /log/as-needed          as-needed dose sheet (transparent modal route)
     ├─ /log/past               past-dose sheet (transparent modal route)
     ├─ /profile/create, /profile/[id]
     └─ /export                 export (modal)
```

Route files keep their existing names where possible (`(tabs)/dashboard.tsx` is "Today",
`(tabs)/medications.tsx` is "Medicines", `(tabs)/history.tsx` is "Journal"). Settings leaves the tab
bar and becomes `/you`.

---

## 4. Screens

### 4.1 Shell
- **Floating tab bar**: glass pill (height 64, radius full) holding three items, each icon + label.
  Active item sits on an `accent-soft` capsule that slides between items with a spring.
  To its right, a separate 64×64 circular **+** button (filled `accent`). Bar floats 12pt above the
  bottom safe area; content scrolls under it (screens add bottom padding).
- **Header** (tab screens): row with avatar (44, tap → `/you`) on the left and an optional contextual
  icon button on the right; below it an optional overline (caption) and the large title.

### 4.2 Today (`(tabs)/dashboard`)
- Overline: full date ("FRIDAY, 3 JULY"), tappable → month calendar sheet to jump anywhere.
  Title: "Today" / "Tomorrow" / "Yesterday" / weekday name.
- **Week strip**: 7 capsules for the selected week (localized weekday initial + day number); past
  days and today show a tiny progress ring (taken ÷ scheduled). Selected = filled accent.
  Swipe horizontally to change week. A "Today" pill appears when away from today.
- **Progress card**: ring (taken/total) + "2 of 5 taken" + one line of context:
  "Next: Metformin at 20:00" · "1 dose is late" · "All done for today".
- **Dose list grouped by time of day**: Morning (05–12), Afternoon (12–17), Evening (17–21),
  Night (21–05), each with a small icon + caption header.
- **Dose row** (glass, min height 76): medicine tile · name + "1 pill · note" · time (right, `time` style).
  - taken → teal check circle, row slightly dimmed, subtitle "Taken 08:04".
  - skipped → "Skipped" chip (danger-soft) · partial → half-filled circle + "Partial · 0.5 pill".
  - due (−15 min … +0) → accent outline + "Now" chip · late (unlogged past) → "Late · 2 h" chip (warning; danger if ≥ 2 h).
  - moved by reschedule → "Moved" chip.
  - **Swipe right** → full-swipe "Take" (teal). **Swipe left** → "Skip" (danger) and "More" (opens sheet).
  - **Tap** → Dose sheet (works for logged doses too).
- **Dose sheet — unlogged**: tile + name (title2) + "1 pill · scheduled 08:00"; status line (early/late,
  soft coloured); running-low note; medicine notes. Actions:
  1. **Take now** (success, lg, full width)
  2. **I took it at 08:00** (secondary)
  3. Row: **Skip** (secondary danger) · **Partial dose** (secondary) → reveals stepper
  4. "Add a note" plain button → reveals text field.
- **Dose sheet — logged**: "Taken at 08:04" (+ amount/notes) with **Change** (action/amount/notes)
  and **Undo** (removes the log, restores supply).
- After logging: success haptic, ring animates, sheet closes, toast "Metformin taken · Undo".
- **Safety flows** keep the exact backend rules (max daily dose, min hours between, late-dose overlap
  with next dose within 120 min, reschedule next dose, insufficient supply) but use our Confirm sheet
  instead of native alerts, with plain language and a clear "Take anyway" / "Cancel".
- **As needed** section at the end: horizontal chips of active as-needed medicines → `/log/as-needed`.
- Empty states: no medicines → friendly illustration + "Add your first medicine";
  nothing that day → "Nothing scheduled" calm line.

### 4.3 Medicines (`(tabs)/medications`)
- Title "Medicines". Active medicines as glass cards: tile, name, dose, plain schedule summary,
  and a **supply meter** (thin capsule bar + "24 left"). Warning chips: "Running low", "Expired".
- "No longer taking (n)" collapsible section at the bottom.
- **Detail** (`/medication/[id]`): circular back button + "Edit" top-right. Hero: large tile/photo,
  name (title1), dose. Info chips (schedule, next dose, last taken). As-needed + active → big
  "Log a dose" button. Cards: **Supply** (big number, meter, refill reminder, "Update supply"),
  **Safety** (max per day, min hours, expiry, bypass Do Not Disturb), **Notes**,
  "See in Journal" row, then "Stop taking"/"Resume taking" and "Delete medicine" rows (confirmed).
- **Supply sheet**: segmented Add / Remove / Set, big stepper, "Add a full pack (30)" chip,
  reason chips, live preview "30 → 60 pills", Save → toast.

### 4.4 Add / edit medicine
- **Add = guided flow**, one question per screen, progress bar on top, big Next at the bottom:
  1. *What's it called?* name + optional photo
  2. *How much each time?* stepper + unit chips
  3. *How often?* large choice cards with icon + example (all 9 schedule types in plain language)
  4. *When?* type-specific editor (time chips, weekday circles, steppers, date rows)
  5. *Supply* (optional, "Skip for now")
  6. *Extras* (optional): notes, expiry, max per day, min hours between, bypass Do Not Disturb
  7. *Review*: summary rows, each tappable to jump back · **Save medicine**
- **Edit** = one grouped page using the same section editors; Save in the header/bottom.
- Schedule editors always emit a complete, valid config (defaults included).

### 4.5 Journal (`(tabs)/history`)
- Title "Journal". Controls: sliding segmented range (7 d · 30 d · 90 d · All), a medicine filter chip
  (opens list sheet), action chips (All · Taken · Skipped · Partial).
- Timeline grouped by day with sticky day headers ("Today", "Yesterday", "Mon 28 Sep").
  Entry: time column · status dot · name · "1 pill · scheduled 08:00" · note.
  Tap → entry sheet (Change / Delete). Swipe left → Delete (confirmed; supply restored).
- "Log a past dose" button is **always** visible (including empty state) → `/log/past`.

### 4.6 You (`/you`, modal)
- Hero: large avatar, name, "Edit profile". Row of other profiles (avatars) + "Add" to switch
  instantly (toast confirms). Grouped lists:
  - **Preferences**: Language (sheet with checkmarks, each language in its own name), 24-hour time (switch).
  - **Privacy & security**: App lock (value: Face ID / PIN / Off).
  - **Your data**: Export a PDF report.
  - **About**: Disclaimer, Version.
  - Profiles: each profile → edit; delete lives on the profile page (not for the active profile).

### 4.7 Onboarding, lock, export
- **Welcome**: calm hero, one sentence, "Get started".
- **Good to know**: the disclaimer's four sections as paged cards (big icon, short lines), with
  "Next" always visible; last page: "I understand" toggle + Continue. View-only mode = one scroll.
- **Protect**: three large choice cards (Face ID/Fingerprint · PIN · Not now) → PIN set via PinPad (enter, confirm).
- **You**: big avatar circle with camera badge (action sheet: take photo / choose / remove) + name.
- **Lock**: app mark, "Welcome back", PinPad (dots, keypad, shake + haptic on error) or biometric
  auto-prompt with "Use PIN instead" fallback when a PIN exists.
- **Export**: one modal: what the report contains, risks as icon bullets, "I understand" toggle, then
  "Save to device" / "Share" (+ progress). Replaces the two-step warning/destination routes.

---

## 5. Copy tone

Short, warm, second person, sentence case. "Take now", not "Mark as taken". "Stop taking", not
"Mark as inactive". "Supply", not "Inventory". "As needed", not "PRN". "Journal", not "History".
New strings live in `lib/i18n/locales/ui/*.ts` with `en`, `nl` and `tr` translations.
