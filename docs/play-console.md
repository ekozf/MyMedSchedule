# Google Play Console checklist

Step-by-step answers for publishing MyMedSchedule (`be.emirkaan.mymedschedule`) for the first
time. Work through the sections in order. The answers are written so you can copy them straight
into the Console.

Google changes the Console wording and its policies often. Anything marked **(verify in Console)**
is my best understanding at the time of writing (November 2026). Check it against the live form and
the linked policy page before you submit.

Store texts live in `fastlane/metadata/android/<lang>/` (en-US, nl-NL, tr-TR). Paste from those
files. Do not retype the texts here, so there is only one copy to keep up to date.

---

## 0. Before you start

- [ ] Developer account created as a **personal** account in the name of Emir Kaan Özver, with
      identity verification finished.
- [ ] Contact email `support@emirkaan.be` verified in the account.
- [ ] Privacy policy published at a public URL that works without login.
      **TODO: privacy policy URL.** Play rejects an app without one, and the Health apps
      declaration needs it as well.
- [ ] A signed release `.aab` exists (see §6). The Console only accepts App Bundles for new apps.
- [ ] Check the AAB's merged manifest. The release build must **not** contain `INTERNET`, and
      should contain only the permissions listed in §4.9:

      ```sh
      bundletool dump manifest --bundle app-release.aab | grep -E 'uses-permission|foregroundServiceType'
      ```

      (`android/app/src/release/AndroidManifest.xml` removes `INTERNET`. `ACCESS_NETWORK_STATE`
      stays on purpose for WorkManager. It is a normal permission and needs no declaration.)

---

## 1. Create the app

Console → **Create app**

| Field | Answer |
|---|---|
| App name | `MyMedSchedule: Pill Reminder` |
| Default language | English (United States) – en-US |
| App or game | App |
| Free or paid | Free (this can't be changed to paid later) |
| Declarations | Tick Developer Program Policies and US export laws |

---

## 2. Store settings (Grow → Store presence → Store settings)

| Field | Answer |
|---|---|
| App category | **Health & Fitness** |
| Tags | Pick up to 5 that the Console offers. Suggested: Medication reminder, Health tracker, Reminders (verify in Console, the tag list changes) |
| Email address | `support@emirkaan.be` |
| Phone number | leave empty |
| Website | **TODO: website URL** (optional, leave empty until it is live) |
| External marketing | Your choice. Off is fine. |

Why Health & Fitness and not Medical: the app is a reminder and diary. It does not diagnose,
treat or give clinical advice, and it is not a medical device.

---

## 3. Main store listing (Grow → Store presence → Main store listing)

Add translations for **Dutch (Netherlands) – nl-NL** and **Turkish – tr-TR** with
"Manage translations → Add your own translations". Do not use machine translation.

| Field | Limit | Source file |
|---|---|---|
| App name | 30 | `fastlane/metadata/android/<lang>/title.txt` |
| Short description | 80 | `fastlane/metadata/android/<lang>/short_description.txt` |
| Full description | 4000 | `fastlane/metadata/android/<lang>/full_description.txt` |
| Video | – | `video.txt` is empty: no promo video |

Character counts (checked with `wc -m`, UTF-8):

| | title | short | full |
|---|---|---|---|
| en-US | 28 | 79 | ~2090 |
| nl-NL | 29 | 77 | ~2320 |
| tr-TR | 25 | 80 | ~2230 |

### Graphics

Images go in `fastlane/metadata/android/<lang>/images/` (made separately). Upload the en-US set
first. Copy it to the other languages unless you make localised screenshots.

| Asset | Required size | File | Status |
|---|---|---|---|
| App icon | 512 × 512 PNG, 32-bit, max 1 MB | `images/icon.png` | being made |
| Feature graphic | 1024 × 500 PNG or JPEG, no transparency | `images/featureGraphic.png` | being made |
| Phone screenshots | 2–8, JPEG or 24-bit PNG, 16:9 or 9:16, each side 320–3840 px (at least 1080 px wide recommended) | `images/phoneScreenshots/1.png` … | **TODO** |
| 7" / 10" tablet screenshots | optional | `images/sevenInchScreenshots/`, `images/tenInchScreenshots/` | skip for now |

Screenshot ideas, in the order of the selling points: Today pill box, a reminder notification with
its buttons, the People switcher, a schedule choice page, the journal, App lock. Do not show real
names or real medicines of real people.

### Listing rules to keep in mind

- No medical claims ("improves adherence", "better health"). The texts say "helps you remember".
- No price or ranking words in the title ("free", "best", "#1").
- Don't mention anything the app doesn't do: cloud sync, backup, import, interaction checks,
  pharmacy, iOS, widgets, Wear OS.

---

## 4. App content (Policy → App content)

Every item here must be finished before you can send a release for review.

### 4.1 Privacy policy

`TODO: privacy policy URL`

The policy must at least say: no personal data is collected or shared by the developer;
everything is stored encrypted on the device; what each permission is used for (camera, reminders,
exact alarms, biometrics); the PDF export is created by the user and is not encrypted; how to
delete data (in-app or uninstall); contact `support@emirkaan.be`; developer name Emir Kaan Özver.

### 4.2 App access

Select: **All functionality in my app is available without any access restrictions.**

Note to add if there is a free-text field:

> There is no account and no login. During setup the user can choose to protect the app with a
> PIN or fingerprint/face unlock, or choose no lock. Reviewers can pick "No lock" (or set any
> PIN they like) during onboarding. No credentials are needed.

### 4.3 Ads

**No, my app does not contain ads.**

### 4.4 Content rating (IARC questionnaire)

- Email: `support@emirkaan.be`
- Category: **All other app types** / "Utility, Productivity, Communication, or Other"
  (the wording depends on the questionnaire version, verify in Console). Not a game, not social,
  not news, not entertainment.

| Question topic | Answer | Why |
|---|---|---|
| Violence | No | |
| Fear / horror | No | |
| Sexuality / nudity | No | |
| Language / profanity | No | |
| Controlled substances (drugs, alcohol, tobacco) | **No** | See note below |
| Crude humour | No | |
| Gambling / simulated gambling | No | |
| Users can interact or exchange content with each other | No | No network, no chat, no sharing between users. The PDF export goes through the Android share sheet to apps the user picks. That is the user sharing a file, not in-app user interaction. |
| Shares the user's current physical location with others | No | No location permission |
| Digital purchases | No | |
| Unrestricted internet access (web browser, search) | No | No internet at all |
| Promotes or contains the sale of age-restricted products | No | |

Note on "controlled substances": the IARC questions are about illegal drugs and the
use or glorification of alcohol, tobacco or recreational drug use. MyMedSchedule only lets people
type in the names of their own prescribed or over-the-counter medicines to get reminders, in a
health context. It shows no drug use, does not promote any substance and has no content about
illegal drugs. That is "No" under IARC guidance. If the questionnaire asks a separate
question about "references to medication in a medical context" (some versions do, verify in
Console), answer that one honestly with **Yes**; it does not raise the rating.

Expected result: Everyone / PEGI 3 / USK 0 / IARC 3+. If the result is higher than that, re-check
the answers before you accept it.

### 4.5 Target audience and content

| Question | Answer |
|---|---|
| Target age groups | **18 and over** only |
| Could your store listing unintentionally appeal to children? | **No.** Plain medication reminder, calm design, no cartoons or games. |
| Is the app primarily for children / in the Families program? | No |

People can add a child as a profile, but an adult manages it on their own phone. The child is not
the user. That does not make the app child-directed.

### 4.6 News app

**No.**

### 4.7 COVID-19 contact tracing and status apps

**My app is not a publicly available COVID-19 contact tracing or status app.**

### 4.8 Data safety

Play's definition: data that is processed only on the device and never sent off it is **not**
"collected". MyMedSchedule has no `INTERNET` permission in release builds, no account, no
analytics, no crash reporting and no ads SDK, so nothing can leave the phone unless the user
exports a PDF and sends it somewhere themselves. Sending a file through the Android share sheet
because the user chose to is not collection or sharing by the developer.

**Section: Data collection and security**

| Question | Answer | Justification |
|---|---|---|
| Does your app collect or share any of the required user data types? | **No** | All data (medicines, schedules, journal, profile names and photos, health info the user types in) is stored and processed only on the device in an encrypted SQLCipher database. The developer has no server and receives nothing. |

When you answer **No**, the Console skips the follow-up questions (data types, encryption in
transit, deletion requests). If your version of the form still shows them, use these answers:

| Question | Answer | Justification |
|---|---|---|
| Is all of the user data collected by your app encrypted in transit? | **Yes** (or N/A if offered) | No user data is sent at all. The app has no internet access in release builds. Choose the option that says nothing is transmitted if the form has one (verify in Console). |
| Do you provide a way for users to request that their data be deleted? | **Yes** | In the app: Settings › Your data › Delete everything. Uninstalling the app also deletes all data. Android backup is off (`allowBackup=false`), so no copy stays in Google backup. |
| Data deletion URL / web resource | Not required (no account). If the form insists, use the privacy policy URL (**TODO**) with a section "How to delete your data". | Play requires a web deletion link only for apps where users can create an account (verify in Console). |

**Optional badges and security practices**

| Item | Answer |
|---|---|
| Committed to Play Families policy | No (not a Families app) |
| Independent security review (MASA) | No |
| Data is encrypted at rest | Not a Data safety question, but true: SQLCipher, key in Android Keystore-backed secure storage. You may mention it in the privacy policy. |

**Data types overview, for your own check** (all "not collected"):

| Data | Where it lives | Leaves the phone? |
|---|---|---|
| Health info (medicines, doses, journal, limits) | encrypted DB on device | Only in a PDF the user exports and shares |
| Name of each person (profile) | encrypted DB | Only in a PDF the user exports |
| Photos (medicine box, profile) | app-private storage | No |
| PIN | Android Keystore-backed secure storage | No |
| Biometrics | handled by Android, the app only gets yes/no | No |
| Device or other IDs, location, contacts, analytics, crash logs | not used | – |

Third-party libraries: `expo-notifications` brings in Firebase Cloud Messaging code, but the app
only schedules local notifications. The release manifest removes `INTERNET` and the FCM receive
permission, so no SDK can send anything. Re-check with the `bundletool` command in §0 after every
dependency update.

### 4.9 Permissions and restricted permissions

Release permissions (from `app.json` → `android.permissions`):

| Permission | Why (use this in the privacy policy too) | Play declaration needed? |
|---|---|---|
| `CAMERA` | Optional: take a photo of a medicine box or a profile photo | No |
| `POST_NOTIFICATIONS` | Medication reminders | No |
| `SCHEDULE_EXACT_ALARM` | Reminders fire at the exact minute the user set | Possibly, see below |
| `RECEIVE_BOOT_COMPLETED` | Restore scheduled reminders after the phone restarts | No |
| `VIBRATE` | Vibrate with a reminder | No |
| `WAKE_LOCK` | Deliver a reminder and handle its buttons while the phone sleeps | No |
| `USE_BIOMETRIC` | App lock with fingerprint or face | No |
| `ACCESS_NETWORK_STATE` | Merged in by WorkManager (background upkeep job constraint); no network access is possible without `INTERNET` | No |

The app does **not** use `USE_EXACT_ALARM`, `READ_MEDIA_IMAGES`, storage, location, contacts,
SMS, call log, accessibility services, `QUERY_ALL_PACKAGES` or full-screen intents. Photo picking
uses the system photo picker.

**Exact alarm.** Play's restricted declaration is for `USE_EXACT_ALARM`. `SCHEDULE_EXACT_ALARM`
is normally allowed without a form, because the user grants it in Android's "Alarms & reminders"
setting (verify in Console: if **App content** shows an "Exact alarm" or "Alarms & reminders"
declaration, fill it in). Use this text:

> MyMedSchedule is a medication reminder. Its core function is to remind the user to take a
> medicine at the exact time they set (for example 08:00, or every 8 hours). An inexact alarm can
> be delayed by many minutes by battery optimisation, which defeats the purpose of a medication
> reminder. Exact alarms are only used for these user-scheduled dose reminders and the 15-minute
> snooze the user chooses from the notification. The app schedules no other alarms and does no
> background work with them.

Core functionality category, if asked: **Calendar / reminders / alarm clock** style user-set
reminders (verify the option names in Console).

Engineering note: on Android 14+ `SCHEDULE_EXACT_ALARM` is no longer granted by default to newly
installed apps. The app currently has no screen that sends the user to "Alarms & reminders", so
on those phones reminders may fall back to inexact timing. Worth testing in the internal track.

### 4.10 Foreground service

**None.** The app declares no `FOREGROUND_SERVICE` permission. If the Console asks for a
foreground service declaration anyway, check the merged manifest (§0). WorkManager can merge in
`SystemForegroundService`. The app never starts it, so remove it in the release manifest or
explain that it is not used (verify in Console).

### 4.11 Government apps

**No**, not developed by or on behalf of a government.

### 4.12 Financial features

**My app doesn't provide any financial features.**

### 4.13 Health apps declaration

Policy → App content → **Health apps**. Tick only what applies (option names change, verify in
Console):

| Category | Tick? | Note |
|---|---|---|
| **Medication and treatment management** (medication reminders, dose tracking) | **Yes** | The core of the app |
| Health management / health record keeping | Only if offered and not covered above | The journal is a dose diary, part of medication management |
| Activity, fitness, nutrition, sleep, mental health, period tracking | No | |
| Disease or condition management | No | |
| Clinical decision support / diagnosis | No | The app gives no medical advice |
| Medical device (regulated SaMD) | **No** | Not a medical device: it does not diagnose, treat, or check whether a dose is medically right. The optional limit warning only compares what the user entered with limits the user entered. |
| Healthcare services / telehealth | No | |
| Human subjects research | No | |
| Health Connect | No | Not used |
| Emergency / first aid | No | |

If asked for a disclaimer, use:

> MyMedSchedule is a reminder and diary for medicines the user enters themselves. It does not
> provide medical advice, diagnosis or treatment, and it does not check doses or interactions.
> Users should always follow their doctor, pharmacist and the package leaflet.

Health apps need a privacy policy (TODO) that covers health data. It has to say plainly that
health data stays on the device and is not collected.

### 4.14 Other declarations that may appear

| Item | Answer |
|---|---|
| Advertising ID | **No**, the app does not use the advertising ID. (If the merged manifest contains `com.google.android.gms.permission.AD_ID`, remove it in the release manifest.) |
| Photo and video permissions | Not applicable (no `READ_MEDIA_*`) |
| Account deletion | Not applicable (no accounts) |
| Content labels / AI | Not applicable |

---

## 5. Pricing and countries

- Price: **Free**. No in-app purchases, no subscriptions.
- Countries: pick where you want it. The Netherlands, Belgium and Türkiye match the languages.
  "All countries" is fine too.

---

## 6. Releases

### 6.1 Play App Signing

1. Release → Setup → **App signing**. Choose **Use Google-generated key** (recommended).
2. Your **upload key** is the existing release keystore from `docs/releases.md`
   (`mymedschedule-release.jks`, alias `mymedschedule`, the same one the GitHub release workflow
   uses from repository secrets). Every AAB you upload must be signed with it.
3. Keep the `.jks` and passwords backed up. If you lose the upload key, Google can reset it
   (unlike the old app signing key), but that takes support time.

Note: APKs already installed from GitHub Releases are signed with your key, but Play installs are
signed with Google's app signing key. A phone with the GitHub APK can't update to the Play version
in place. The user has to uninstall it first, and that deletes all data. Say this in the GitHub
release notes, and suggest exporting a PDF first.

### 6.2 Build the bundle

The CI workflow builds an APK today. For Play you need an **AAB** (`./gradlew bundleRelease`,
signed with the upload key). Upload the `.aab` attached to the GitHub Release. The version comes
from the git tag (`versionCode = major*1000000 + minor*1000 + patch`). The first Play upload will
be **≥ 1.0.1** because v1.0.0 already exists on GitHub. Every upload needs a higher
`versionCode` than the last one.

Target API level: Play requires new apps to target a recent Android API level (API 35 since
August 2025; the next raise is usually each August). Verify in Console that the build's
`targetSdkVersion` meets it.

### 6.3 Internal testing first

1. Testing → **Internal testing** → Create new release.
2. Upload the AAB. Release name: the version (for example `1.0.1`).
3. Release notes: paste `fastlane/metadata/android/<lang>/changelogs/default.txt` for each
   language.
4. Add testers (an email list), save, roll out. Install from the opt-in link and check:
   reminders at the exact time, notification buttons, reboot, app lock, PDF export, all three
   languages.

### 6.4 Closed testing (new personal accounts)

Personal developer accounts created after November 2023 must run a **closed test with at least
12 testers who stay opted in for 14 days in a row** before they can apply for production access
(verify in Console: the numbers have changed before, and the Dashboard shows the current
requirement).

1. Testing → **Closed testing** → create a track, upload the same or a newer AAB.
2. Add at least 12 testers (Google Group or email list). Make sure they actually opt in and
   install it.
3. After 14 days: Dashboard → **Apply for production**, and answer the questions about the test.

### 6.5 Pre-launch report

Runs automatically on every testing upload (Release → Testing → Pre-launch report). Check:

- Crashes and ANRs on the test devices.
- Accessibility warnings (touch target size, contrast, missing labels).
- The robot may stop at onboarding. If it gets stuck, you can add a script under **Settings →
  Pre-launch report** (the "No lock" path needs no credentials).
- It may flag "no network access". That is expected.

### 6.6 Production

After closed testing is approved: Production → Create release → promote the tested release.
Start with a staged rollout (for example 20%) and watch Android vitals.

---

## 7. Before you submit (remaining TODOs)

- [ ] **Privacy policy URL** live and filled in (App content → Privacy policy, Store settings).
- [ ] **Website** live (optional) and filled in.
- [ ] **Screenshots** for phone (at least 2, best 4–8) in `fastlane/metadata/android/<lang>/images/phoneScreenshots/`.
- [ ] Icon 512² and feature graphic 1024×500 checked and uploaded.
- [ ] **NL and TR store texts reviewed** by a native speaker.
- [ ] **Terms / disclaimer** (the in-app "Good to know" text) reviewed by a lawyer.
- [ ] Release AAB checked with `bundletool dump manifest`: no `INTERNET`, no `AD_ID`, no
      `FOREGROUND_SERVICE*`, no `USE_EXACT_ALARM`.
- [ ] "Delete everything" (Settings › Your data) present in the build you upload. The Data
      safety answer depends on it.
- [ ] Auto-lock after 1 minute in the background present in the build you upload. The store
      text mentions it.
- [ ] Notification action buttons translated. In the current code, `notifications.actions` in
      `lib/i18n/locales/nl.ts` and `tr.ts` are still English ("Mark as taken", "Snooze 15 min",
      "Skip").
- [ ] Exact-alarm behaviour tested on Android 14+ (§4.9 engineering note).
- [ ] Content rating certificate received, Data safety, Health apps, Target audience and App
      access all show as completed.
- [ ] Closed test with 12+ testers for 14 days done (if your account needs it).
