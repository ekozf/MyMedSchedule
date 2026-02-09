# MyMedSchedule

<div align="center">
  <h3>A Privacy-First Medication Reminder App</h3>
  <p>Your personal medication tracker that respects your privacy</p>
</div>

---

## Overview

**MyMedSchedule** is a privacy-focused, fully local medication reminder application built with [React Native](https://reactnative.dev/) and [Expo](https://expo.dev/). It serves as a digital replacement for paper-based medication tracking, helping users remember when to take their medications without storing any data in the cloud or making medical decisions on behalf of the user.

### Core Philosophy

- **Strictly a Reminder App**: The app does NOT advise, diagnose, or make decisions for the user
- **Privacy First**: All data stored locally and encrypted; no cloud storage, no data collection, no analytics
- **User Responsibility**: Users are fully responsible for all inputs and medication decisions
- **Accessibility**: Support for multiple languages (English, Turkish, Dutch) and larger font sizes

> **Important**: This app is strictly a reminder tool - a digital version of a paper calendar. It does not provide medical advice, check for drug interactions, or make healthcare decisions. Always consult with your healthcare provider for medical guidance.

---

## Key Features

### Medication Management

- **Complete Medication Profiles**: Add medications with custom names, photos, dosages, and notes
- **Flexible Dosage Units**: Support for pills, grams, milligrams, milliliters, puffs, drops, patches, and units
- **Medication Photos**: Capture or upload images to easily identify medications in notifications
- **Expiration Tracking**: Set expiration dates with configurable reminder alerts
- **Active/Inactive Status**: Mark medications as "no longer taking" without losing historical data

### Advanced Scheduling Options

MyMedSchedule supports nine different medication scheduling patterns to fit any prescription:

1. **Once Daily** - Single dose at a specific time
2. **Multiple Times Daily** - Up to 12 doses per day at specified times
3. **Every X Days** - Repeating every specified number of days (e.g., every 20 days)
4. **Specific Days of Week** - On selected weekdays (e.g., every Monday and Wednesday)
5. **Xth Day of Week** - Every Nth occurrence of a weekday (e.g., every 3rd Tuesday)
6. **Cycle Schedule** - X days on, Y days off (e.g., 21 days on, 7 days off for birth control)
7. **Every X Hours** - Repeating at hourly intervals (e.g., every 8 hours)
8. **Tapering Schedule** - Gradually decreasing dosage over time (e.g., 4→3→2→1→0)
9. **As Needed (PRN)** - No scheduled time; log medications taken on an as-needed basis

### Inventory Management

- **Automatic Tracking**: Inventory automatically decrements when doses are marked as taken
- **Refill Reminders**: Get notified when running low (configurable by days or dose count)
- **Manual Adjustments**: Add refills, remove lost/damaged medication, or correct counts
- **Partial Doses**: Track half pills and other fractional doses
- **Depletion Estimates**: See when you'll run out based on your schedule

### Smart Notifications

- **Local Push Notifications**: Timely reminders at scheduled medication times
- **Rich Notifications**: Display medication name, dosage, photo, and custom notes
- **Quick Actions**: Mark as taken, snooze for 15 minutes, or skip directly from notifications
- **Batch Notifications**: Single notification for medications scheduled at the same time
- **Do Not Disturb Override**: Optional per-medication setting to bypass DnD mode for critical medications
- **Overlap Warnings**: Alerts when snoozing would conflict with the next dose
- **Late Dose Handling**: Prompts to reschedule if dose taken more than 2 hours late
- **Max Dose Warnings**: Prevents logging doses that would exceed daily maximum limits

### Intake Logging & History

- **Complete Audit Trail**: Full history of all medication events with timestamps
- **Retroactive Logging**: Log doses you took earlier but forgot to mark
- **Flexible Editing**: Undo accidental entries or edit historical logs
- **Per-Medication Views**: View intake history and statistics for specific medications
- **Action Tracking**: See what was taken, skipped, or missed with optional notes

### Multi-Profile Support

- **Multiple Profiles**: Create separate profiles for yourself, children, elderly parents, or anyone you care for
- **Easy Switching**: Quick profile switcher for seamless management
- **Independent Data**: Each profile has its own medications, schedules, settings, and notifications
- **Custom Avatars**: Personalize profiles with names and optional profile pictures

### Security & Privacy

- **Biometric Authentication**: Secure app access with FaceID, TouchID, or fingerprint
- **PIN Protection**: Alternative 4-6 digit PIN for devices without biometric support
- **Encrypted Database**: All data encrypted using SQLCipher with secure key storage
- **Fully Local**: Absolutely no cloud storage, no data collection, no analytics, no network calls
- **Your Data, Your Device**: Only you can access your medication information

### Data Export

- **JSON Backup**: Export complete data backups for device migration or safekeeping
- **PDF Reports**: Generate formatted reports for healthcare providers
- **Transparent Warnings**: Clear disclaimers about unencrypted export data
- **Share Flexibility**: Export to files or share directly via system share sheet

### Multilingual Support

- **Three Languages**: Full support for English, Turkish, and Dutch
- **Localized Dates**: Date and time formatting respects regional preferences
- **Easy Switching**: Change language anytime in settings

---

## Technical Stack

This project is built with modern React Native technologies and best-in-class libraries:

### Core Framework

- **[React Native](https://reactnative.dev/)** - Cross-platform mobile development framework
- **[Expo](https://expo.dev/)** - Development platform with managed workflow and extensive native API access
- **[Expo Router](https://expo.dev/router)** - File-based routing with type-safe navigation

### UI & Styling

- **[NativeWind](https://www.nativewind.dev/)** - Tailwind CSS for React Native, providing utility-first styling
- **[React Native Reusables](https://reactnativereusables.com)** - Beautiful, accessible UI components bringing shadcn/ui to React Native
- **[Lucide React Native](https://lucide.dev/)** - Beautiful and consistent icon library
- **[React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)** - Smooth, performant animations

### Data & State Management

- **[Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)** - Local database with SQLCipher encryption
- **[Drizzle ORM](https://orm.drizzle.team/)** - Type-safe and lightweight TypeScript ORM
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight and flexible state management
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation

### Native Features

- **[Expo Local Authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)** - Biometric authentication (FaceID/TouchID/Fingerprint)
- **[Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/)** - Hardware-backed encrypted key-value storage
- **[Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)** - Local push notifications with action support
- **[Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)** - Camera and photo library access
- **[Expo Print](https://docs.expo.dev/versions/latest/sdk/print/)** - PDF generation and printing
- **[Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/)** - Native share sheet integration

### Internationalization

- **[i18n-js](https://github.com/fnando/i18n)** - Internationalization framework
- **[Expo Localization](https://docs.expo.dev/versions/latest/sdk/localization/)** - Access device locale and regional settings
- **[date-fns](https://date-fns.org/)** - Modern JavaScript date utility library

### Development & Testing

- **[TypeScript](https://www.typescriptlang.org/)** - Type safety throughout the codebase
- **[Vitest](https://vitest.dev/)** - Fast unit testing with React Native support
- **[Testing Library](https://testing-library.com/docs/react-native-testing-library/intro/)** - Robust component testing

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), [pnpm](https://pnpm.io/), or [bun](https://bun.sh/) (was built and tested with bun)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (installed automatically)
- For iOS development: macOS with Xcode
- For Android development: Android Studio with emulator

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd my-med-schedule
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

### Running the App

After starting the development server, you can open the app on:

- **iOS Simulator** (macOS only): Press `i`
- **Android Emulator**: Press `a`
- **Physical Device**: Scan QR code with [Expo Go](https://expo.dev/go) app
- **Web Browser** (limited functionality): Press `w`

> **Note**: Some features like notifications and biometric authentication require a physical device and cannot be fully tested in simulators or Expo Go.

### Building for Production

To create production builds:

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both
eas build --platform all
```

See [EAS Build documentation](https://docs.expo.dev/build/introduction/) for more details.

---

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

---

## Project Structure

```
my-med-schedule/
├── app/                          # Expo Router pages
│   ├── (auth)/                   # Authentication screens
│   ├── (onboarding)/             # First-launch onboarding
│   ├── (tabs)/                   # Main tab navigation
│   ├── medication/               # Medication detail/add/edit
│   ├── profile/                  # Profile management
│   └── export/                   # Data export flows
├── components/                   # Reusable components
│   ├── ui/                       # Base UI components
│   ├── dashboard/                # Dashboard-specific components
│   ├── medication/               # Medication-related components
│   └── profile/                  # Profile components
├── lib/                          # Core functionality
│   ├── db/                       # Database, schema, operations
│   ├── auth/                     # Authentication logic
│   ├── notifications/            # Notification scheduling & handling
│   ├── i18n/                     # Internationalization
│   ├── schedule/                 # Schedule calculation algorithms
│   ├── validation/               # Input validation & safety checks
│   └── export/                   # PDF and JSON export
├── store/                        # Zustand state management
├── types/                        # TypeScript type definitions
├── __tests__/                    # Test suites
└── assets/                       # Images, fonts, static files
```

---

## 🔐 Security & Privacy Commitment

MyMedSchedule takes your privacy seriously:

- **Zero Data Collection**: No analytics, no tracking, no telemetry
- **Fully Local**: All data stored on-device with SQLCipher encryption
- **No Cloud Services**: No servers, no APIs, no network requests for data
- **Transparent Code**: Open for review and audit
- **User Control**: You own your data; export/delete anytime
- **Export Responsibility**: Exported files are unencrypted - store safely

---

## ⚖️ Legal Disclaimer

**IMPORTANT**: MyMedSchedule is a reminder tool only. It:

- Does NOT provide medical advice or diagnosis
- Does NOT check for drug interactions or contraindications
- Does NOT replace professional healthcare guidance
- Is NOT responsible for medication decisions or timing accuracy

Users are fully responsible for:

- Verifying all medication information entered
- Consulting healthcare providers for medical decisions
- Ensuring correct dosages and timing
- Managing their device settings for notification delivery

See the in-app disclaimer for complete terms.

---

## Acknowledgments

This project was made possible by these amazing projects:

- [React Native Reusables](https://github.com/founded-labs/react-native-reusables) - Beautiful UI components
- [NativeWind](https://www.nativewind.dev/) - Tailwind CSS for React Native
- [Expo](https://expo.dev/) - Incredible development platform
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database interactions
- And all the other [dependencies](./package.json) that make this app possible

If you find this project helpful, please consider giving it a ⭐ on GitHub!
