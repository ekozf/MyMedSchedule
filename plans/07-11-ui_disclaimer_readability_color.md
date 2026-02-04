## Todo 7–11: Disclaimer Redesign + Readability + Color Improvements

## TODO 7 — Redesign disclaimer UI completely (no emojis) + i18n everything

### Primary file
- `app/(onboarding)/disclaimer.tsx`

### Requirements
- **Complete UI redesign**: make it scannable and obvious what each disclaimer section is.
- **No emojis** (icons are fine).
- All strings must be i18n (including button labels, checkbox label, section headings, bullet items).

### Suggested structure (Reusables + NativeWind)
- Use section `Card`s (`components/ui/card.tsx`) for clear grouping:
  - Medical disclaimer
  - Data & privacy
  - Device / notification limitations
  - User responsibility
- Within each card, use consistent “statement rows”:
  - left icon (`lucide-react-native`) + text
  - subtle background tints using semantic colors (e.g., warning/info), maintaining dark mode compatibility
- Keep the acknowledgment checkbox in a distinct callout card at the bottom.

### i18n work
- Add a namespace like `disclaimer.*` in:
  - `lib/i18n/locales/en.ts` (authoritative)
  - `lib/i18n/locales/nl.ts` and `tr.ts` (copy English)

### Done when
- Disclaimer is visually segmented, easy to scan, and contains **zero** raw strings.

---

## TODO 8 — Increase default text sizing globally (keep accessibility)

### Primary file
- `components/ui/text.tsx`

### Requirements
- Increase readability across dashboard/log/med pages.
- Don’t break accessibility: keep system scaling enabled (don’t set `allowFontScaling={false}`).

### Implementation approach
- Adjust the default and small/muted variants in `textVariants` so the smallest text isn’t too tiny.
- After changing, revisit screens that hardcode tiny sizes (`text-xs`) and upgrade where needed:
  - `app/(tabs)/history.tsx`
  - `app/medication/[id].tsx`
  - `components/dashboard/DoseActionDialog.tsx`
  - `components/medication/SchedulePicker.tsx`

### Done when
- Text is noticeably larger/clearer and no major UI clipping/overflow appears on key screens.

---

## TODO 9 — Make buttons bigger + easier to tap everywhere

### Primary file
- `components/ui/button.tsx`

### Requirements
- Larger button heights/padding, especially for `size="sm"` used heavily in History.
- Add default `hitSlop` on the underlying `Pressable`.

### Implementation approach
- Update `buttonVariants` size classes:
  - increase `default` from `h-10` to `h-12` (or similar)
  - increase `sm` from `h-9` to `h-11`
  - ensure `icon` size scales appropriately
- Add `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` (or similar) unless overridden by caller.

### Done when
- Buttons are easier to press throughout the app and still look consistent.

---

## TODO 10 — Add tasteful, meaningful color on History screen

### Primary file
- `app/(tabs)/history.tsx`

### Requirements
- Use more color only where it helps comprehension (not decoration).
- Must remain readable in dark mode.

### Suggested improvements
- Add subtle action-based accents to each log card:
  - taken: primary/success tint
  - skipped: muted/destructive tint
  - partial: warning tint
- Ensure badges and secondary text remain legible after global font changes.
- i18n sweep items on this screen are tracked in Todo 13, but if you touch text here, ensure it’s i18n’d.

### Done when
- History screen communicates status at a glance and remains clean/readable.

---

## TODO 11 — Add tasteful, meaningful color on Medication Details screen

### Primary file
- `app/medication/[id].tsx`

### Requirements
- Improve hierarchy/clarity with restrained color usage.
- Keep existing meaningful colors (expired/low inventory/next dose) consistent.

### Suggested improvements
- Ensure “Next dose” callout is visually prominent but not harsh.
- Ensure warnings (expired, low inventory) use consistent semantic colors and adequate contrast.
- Review small text areas (notes, expiration subtext) after global font increase.

### Done when
- Medication details page is easier to read, key status information stands out appropriately, and nothing looks overly colorful/noisy.

