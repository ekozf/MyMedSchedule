## Todo 0–1: Baseline + Medication Details Back Button

## TODO 0 — Baseline discovery + guardrails

### Purpose
- Ensure we know **where to initialize notifications**, **where to register background tasks**, and **how i18n keys are structured**, so later changes don’t conflict.

### What to read/confirm
- **App bootstrap / initialization**
  - Read `app/_layout.tsx`
  - Read `lib/notifications/index.ts` (if it centralizes setup)
  - Find where `setupNotificationHandler()`, `setupNotificationCategories()`, and `handleNotificationResponse()` are registered.
  - Identify where it’s best to register background fetch/task (must happen once at app start).
- **i18n structure**
  - Read `lib/i18n/index.ts`
  - Read `lib/i18n/locales/en.ts`, `nl.ts`, `tr.ts`
  - Confirm key naming conventions (existing namespaces like `common.*`, `screens.*`, `medications.*`, `history.*`, etc.)
- **Notification channels/categories**
  - Confirm Android channel configuration exists (likely in notifications init). Ensure we keep using `channelId: 'medication_reminders'`.

### Decisions already locked in (from clarifications)
- **i18n policy**: all new keys go into `en.ts`, and we **copy English** into `nl.ts` and `tr.ts` so there is **no raw UI text** anywhere.
- **Notification upkeep**: implement **best-effort background fetch/task**, and also re-ensure “next 3” on app foreground.

### Done when
- We can point to the exact file(s) where:
  - notification categories + response listener are set up
  - background task registration will live
  - i18n keys should be added

---

## TODO 1 — Add a reliable back button on Medication Details

### Problem
The Medication Details page (`/medication/[id]`) can be entered from tabs, but it may have **no stack history inside the medication stack**, so the default header back button may not appear.

### Primary file
- `app/medication/_layout.tsx`

### Related screen
- `app/medication/[id].tsx` (screen content; already uses `router`)

### Implementation requirements
- Add a **custom `headerLeft`** for the `[id]` screen in `app/medication/_layout.tsx`.
- Use:
  - `router.back()` (expo-router)
  - React Native Reusables components where appropriate (`Button`, `Icon`) and **NativeWind classes**.
- Accessibility:
  - `accessibilityRole="button"`
  - `accessibilityLabel={i18n.t('common.back')}`
  - Tap target should be generous (padding and/or `hitSlop`).
- i18n:
  - If any label text is shown (e.g., “Back”), it must come from `i18n.t('common.back')`.

### Suggested approach
- In `app/medication/_layout.tsx`:
  - import `router` or `useRouter` from `expo-router`
  - add `headerLeft: () => (...)` to the `[id]` screen options
  - use a left chevron icon (e.g., `ChevronLeft` from `lucide-react-native`) via `components/ui/icon.tsx` if desired

### Done when (acceptance checks)
- Opening a medication from `app/(tabs)/medications.tsx` shows a **visible back button** in the header.
- Tapping it returns to the previous screen reliably.
- Works in both light/dark mode and doesn’t overlap the title.

