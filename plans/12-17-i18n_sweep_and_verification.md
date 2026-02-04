## Todo 12–17: i18n Sweep + Verification

## TODO 12 — i18n sweep: `SchedulePicker` (no raw strings)

### Primary file
- `components/medication/SchedulePicker.tsx`

### Scope
- Replace every label/placeholder/example string with `i18n.t(...)`.
- This includes:
  - section titles (“Schedule Time”, “Schedule Times”, “Select Days”, etc.)
  - placeholders (“Select time”, “e.g., 1”, “Select weekday”, etc.)
  - example helper text blocks (“Example: …”)
  - PRN explanatory text

### i18n keys
- Add a namespace like `schedulePicker.*` in:
  - `lib/i18n/locales/en.ts`
  - copy English into `nl.ts` and `tr.ts`

### Done when
- `SchedulePicker.tsx` contains **zero** raw user-facing strings.

---

## TODO 13 — i18n sweep: History screen

### Primary file
- `app/(tabs)/history.tsx`

### Known raw strings to remove
- Medication fallback: `'Unknown'`
- Date range option: `'All Time'`
- Placeholder: `"Select date range"`
- Empty filter result: `"No logs match the filters"`

### Done when
- History screen has no raw UI strings and all placeholders/options come from i18n keys.

---

## TODO 14 — i18n sweep: Notifications (titles, bodies, action button titles)

### Primary files
- `lib/notifications/scheduler.ts`
- `lib/notifications/handlers.ts`

### Scope
- All user-visible notification strings must be i18n:
  - Dose reminder title/body
  - Snooze reminder title/body
  - Refill reminder title/body
  - Category action `buttonTitle` strings (“Mark as Taken”, “Snooze 15min”, “Skip”)

### Notes
- Notification bodies will likely need interpolation:
  - medication name
  - dosage amount + unit
  - counts for batched notifications (if you keep batching)

### Done when
- Notifications contain no raw text, and locale files have the new keys.

---

## TODO 15 — i18n sweep: Schedule description strings

### Primary file
- `lib/schedule/calculator.ts`

### Problem
- `getScheduleDescription(medication)` currently returns raw English strings (e.g. `As needed (PRN)` and other schedule descriptions).

### Implementation approach
- Replace returned strings with i18n keys + interpolation:
  - Example keys:
    - `schedule.description.prn`
    - `schedule.description.onceDaily` with `{ time }`
    - `schedule.description.multipleDaily` with `{ count }`
    - etc.
- Also replace any short day labels used in descriptions (`Sun`, `Mon`, …) with i18n (either via `i18n.t('days.sunShort')` etc., or use locale-aware formatting from `date-fns` if you already have it wired).

### Done when
- `getScheduleDescription` produces fully i18n-driven output for all schedule types.

---

## TODO 16 — Locale file updates for every new key (EN authoritatively, NL/TR copy)

### Primary files
- `lib/i18n/locales/en.ts`
- `lib/i18n/locales/nl.ts`
- `lib/i18n/locales/tr.ts`

### Requirements
- For every new key:
  - Add English to `en.ts`
  - Copy the same English to `nl.ts` and `tr.ts`
- Keep key structure consistent with existing namespaces.

### Done when
- No missing keys at runtime for the touched features.

---

## TODO 17 — Verification / acceptance run

### Navigation
- Open `/(tabs)/medications` → tap a medication → confirm `Back` is visible in header and works.

### Notifications (core)
- Create or activate a scheduled (non-PRN) medication:
  - Verify only **3 upcoming dose reminders** are scheduled for that medication.
- Take a dose (from dashboard dialog and from notification action):
  - Only the relevant dose notification is canceled/consumed.
  - Buffer returns to **≥ 3** upcoming dose reminders.
- Skip a dose:
  - Only that dose notification is canceled/consumed.
  - Buffer returns to **≥ 3**.
- Snooze 15 minutes:
  - A +15 min snooze notification exists (kind: snooze).
  - Dose buffer remains **≥ 3**.

### UI / Accessibility
- Disclaimer is redesigned, scannable, has no emojis, and all text is i18n.
- Text and buttons are larger and easier to read/tap on:
  - dashboard
  - history
  - medication details

### i18n completeness
- Spot-check the edited screens/components for any leftover raw strings.
- Ensure notification titles/bodies and action titles are i18n.

