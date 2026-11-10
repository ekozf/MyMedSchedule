#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
if [[ -z "${JAVA_HOME:-}" && -d /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ]]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if [[ ! -d "$ANDROID_HOME/platforms/android-36" ]]; then
  echo "Android SDK 36 is missing from $ANDROID_HOME. See docs/android-testing.md." >&2
  exit 1
fi
if [[ ! -d node_modules ]]; then
  bun install --frozen-lockfile
fi

# The native project signs release builds with this local testing key.
# Keep it between builds so APK updates can be installed over earlier test builds.
if [[ ! -f android/app/debug.keystore ]]; then
  keytool -genkeypair -keystore android/app/debug.keystore \
    -storepass android -alias androiddebugkey -keypass android \
    -dname 'CN=Android Debug,O=Android,C=US' \
    -keyalg RSA -keysize 2048 -validity 10000
fi

cd android
./gradlew :app:assembleRelease --max-workers=4 --console=plain "$@"
cd "$PROJECT_ROOT"
mkdir -p artifacts
cp android/app/build/outputs/apk/release/app-release.apk artifacts/MyMedSchedule-1.0.0.apk
shasum -a 256 artifacts/MyMedSchedule-1.0.0.apk > artifacts/MyMedSchedule-1.0.0.apk.sha256
echo "Installable APK: $PROJECT_ROOT/artifacts/MyMedSchedule-1.0.0.apk"
