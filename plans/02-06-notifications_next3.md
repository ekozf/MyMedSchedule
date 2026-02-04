## Todo 2–6: Notifications “Next 3 Doses” System

## Context (current problem)
- `lib/notifications/scheduler.ts` currently schedules **all doses for the next 7 days**, which can explode into dozens/hundreds of notifications for frequent schedules (e.g., every X hours).
- Notification content/action titles currently include raw strings and must be moved to i18n.

## Guiding rules (your desired behavior)
- When a schedule is created/activated: **schedule the next 3 dosages** as notifications.
- When a dose is **taken**, schedule the next dose(s) so the buffer returns to **at least 3 upcoming scheduled dose notifications**.
- When it’s time for a dose (notification delivered): we should **also plan the next** to keep 3 (note: delivery-time code execution is not guaranteed; we’ll use best-effort background + foreground + actions).
- “Remind me in 15 minutes”: schedule an **extra** notification in +15 min **and still** plan the next dosage; always keep 3 dose notifications.
- If user takes early or skips: only that one dose’s notification is canceled; the existing planned future dose notifications remain; we append additional future doses to restore buffer.

---

## TODO 2 — Replace 7-day scheduling with “next 3 doses” priming

### Primary file
- `lib/notifications/scheduler.ts`

### Related files
- `lib/schedule/calculator.ts` (use `getNextDose`)

### Implementation details
- Refactor `scheduleNotificationsForMedication(medication: Medication)` so it schedules **only the next 3 upcoming dose reminders**.
- Dose computation:
  - Use `getNextDose(medication, afterTime)` repeatedly:
    - first afterTime = now
    - then afterTime = previously-found-dose.time (or +1ms) to find the next one
  - This respects `nextDoseOverrideTime` (see `getNextDose` implementation).
- Cancel behavior:
  - Replace “cancel everything for this med” with “cancel only dose reminders for this med”.
  - Add/standardize `content.data.kind = 'dose'` for dose reminders, so we can target them precisely.
- i18n:
  - Notification titles and bodies must use `i18n.t(...)` (no raw text).
  - Add keys in `en.ts`, copy English to `nl.ts` and `tr.ts`.

### Done when
- Creating/activating a non-PRN active med schedule results in **3** future dose reminders for that medication (not 50+).

---

## TODO 3 — Add `ensureNext3DoseNotificationsForMedication` (rolling buffer)

### Primary file
- `lib/notifications/scheduler.ts`

### Function requirements
- Implement `ensureNext3DoseNotificationsForMedication(medicationId: string)` (or `(medication: Medication)` if you prefer avoiding DB fetch).
- Logic:
  - Fetch scheduled notifications via `Notifications.getAllScheduledNotificationsAsync()`.
  - Filter:
    - `data.medicationId === medicationId`
    - `data.kind === 'dose'`
    - `scheduledTime` / trigger date is in the future
  - Count them; if count < 3:
    - Determine the “seed time” as:
      - max scheduled dose time (if any), else now
    - Compute additional doses via `getNextDose(medication, seedTime)` until you have 3.
    - Schedule the missing ones with the same `kind: 'dose'` payload.
- Must not:
  - Cancel other future dose reminders (unless explicitly needed for override logic)
  - Count snoozes or refills toward the 3-dose buffer

### Data contract
- Dose reminder: `data.kind = 'dose'`, plus existing fields:
  - `medicationId`, `medicationName`, `dosageAmount`, `dosageUnit`, `scheduledTime`, optional `imageUri`, `notes`
- Snooze reminder: `data.kind = 'snooze'` (see TODO 4)
- Refill: keep existing `data.type='refill'` and add `data.kind='refill'` if you want consistency

### Done when
- If a medication has < 3 future dose reminders scheduled (e.g., user deleted/canceled one), calling ensure restores it to 3.

---

## TODO 4 — Fix snooze behavior (+15 min) and keep buffer at 3

### Primary file
- `lib/notifications/handlers.ts`

### Changes required
- In `setupNotificationCategories()`:
  - Move `buttonTitle` strings to i18n keys.
- In `handleSnoozeAction(data)`:
  - Create a snooze notification at +15 min:
    - `data.kind = 'snooze'`
    - i18n title/body (no raw text)
  - Also call `ensureNext3DoseNotificationsForMedication(data.medicationId)` so normal dose reminders remain at 3.
- Consider whether to cancel the original dose notification:
  - Typically the original is already “delivered”, so it won’t remain scheduled; but if any scheduled duplicate exists, ensure logic should handle it.

### Done when
- Snoozing creates a +15 min reminder AND the medication still has 3 future dose reminders scheduled.

---

## TODO 5 — Wire “ensure next 3” into in-app dose actions (dashboard dialog)

### Primary file
- `components/dashboard/DoseActionDialog.tsx`

### Current problematic section
- `handleConfirmRescheduleNext` currently cancels all notifications and reschedules (which will spam again if we don’t fix it), and it should become next-3 based.

### Required changes
- After actions that affect a scheduled dose:
  - early taken: after `cancelNotificationForDose(...)`, call `ensureNext3...`
  - taken/partial/skip: call `ensureNext3...`
  - reschedule next dose:
    - after setting `nextDoseOverrideTime`, call a “reset and schedule next-3” function for that med (dose-kind only), then ensure.
- i18n note:
  - Any placeholder strings in this dialog must be i18n (there is at least one interpolated placeholder `e.g., ...`—ensure it’s translated too).

### Done when
- No action in this dialog results in mass-cancel + mass-reschedule.
- After any action, the medication returns to ≥3 upcoming dose reminders.

---

## TODO 6 — Background upkeep (best effort) + app-foreground ensure

### Dependencies
- Add:
  - `expo-background-fetch`
  - `expo-task-manager`

### Where to implement
- Registration should occur in a top-level place that runs once at app start:
  - likely `app/_layout.tsx` or a notifications init module imported there.

### What to implement
- A background fetch task that periodically:
  - loads active medications
  - calls `ensureNext3DoseNotificationsForAllActiveMedications()`
- Also ensure on foreground:
  - when app becomes active, call `ensureNext3DoseNotificationsForAllActiveMedications()`

### Constraints
- Background fetch timing is OS-controlled and not guaranteed; treat it as “best effort”.

### Done when
- Even without user interaction, the system generally keeps next-3 topped up over time (as allowed by the OS), and always corrects itself when the app is opened/foregrounded.

