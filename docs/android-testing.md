# Android APK testing

## Verified on this Mac

The APK was built with JDK 21 and installed on an Android 16 ARM64 emulator.
Fresh onboarding, profile creation, the Today/Medicines/Journal tabs, and a
force-stop followed by relaunch all passed. TypeScript checks and all 212 unit
tests passed. The APK signature and SHA-256 checksum were verified.

The "Pill Box" UI (see [docs/DESIGN.md](DESIGN.md)) was QA'd on the same
Android 16 emulator on 2026-11-09. The app label on the launcher is now
"MyMedSchedule".

Setup also fixed a SQLite migration API mismatch and an Android native view
reparenting crash when leaving the profile creation screen. Detailed medication,
notification, camera, and biometric flows remain for physical-device testing.

## Build on this Mac

Dependencies are installed with Bun. Java 21 and the Android SDK are installed
locally, and their environment variables are configured in `~/.zprofile`.
Open a new terminal (or run `source ~/.zprofile`) before using Android tools.

```sh
bun install --frozen-lockfile
bun run build:apk
```

The standalone, signed APK is written to:

```text
artifacts/MyMedSchedule-1.0.0.apk
```

It includes the JavaScript bundle and native modules, including SQLCipher.
It does not require Metro, Expo Go, an Expo account, or a connection to this Mac.
It supports Android 7.0 (API 24) or newer, with ARM and x86 architectures.

## Install on a phone

Transfer the APK by SCP, cloud storage, USB, or any other file transfer method.
Open the downloaded APK on the phone and allow installation from that file
manager or browser when Android asks, then tap Install.

Alternatively, from any computer with Android platform-tools, USB debugging
enabled, and the phone connected and authorized:

```sh
adb install -r MyMedSchedule-1.0.0.apk
```

This is a testing build signed using `android/app/debug.keystore`, with the
release JavaScript bundle. Keep that local key to install later builds as
updates without deleting app data. It is not a Play Store signing setup.

## Recreate the build tools on another Apple Silicon Mac

Install Bun and Node.js first, then:

```sh
brew install openjdk@21
brew install --cask android-commandlinetools
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
mkdir -p "$ANDROID_HOME"
sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" \
  'platform-tools' 'platforms;android-36' 'build-tools;35.0.0' 'build-tools;36.0.0' \
  'ndk;27.1.12297006' 'cmake;3.22.1'
bun install --frozen-lockfile
bun run build:apk
```

Optional emulator packages:

```sh
sdkmanager --sdk_root="$ANDROID_HOME" \
  'emulator' 'system-images;android-36;google_apis;arm64-v8a'
mkdir -p "$ANDROID_HOME/cmdline-tools"
cp -R /opt/homebrew/share/android-commandlinetools/cmdline-tools/latest "$ANDROID_HOME/cmdline-tools/latest"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
echo no | avdmanager create avd --name MyMedSchedule_API_36 \
  --package 'system-images;android-36;google_apis;arm64-v8a' --device pixel_7
emulator -avd MyMedSchedule_API_36
adb install -r artifacts/MyMedSchedule-1.0.0.apk
```
