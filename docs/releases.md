# CI and releases

## CI (automatic)

`.github/workflows/ci.yml` runs on every pull request and every push to
`master`. It runs the TypeScript check and the unit tests. If either fails,
the check turns red on the PR.

## Android release (manual only)

`.github/workflows/release-android.yml` never runs by itself, because a native
build uses a lot of Actions minutes. To release:

1. GitHub → **Actions** → **Release Android APK** → **Run workflow**
   (branch: `master`).
2. Pick the bump:
   - `patch` (default): v1.2.3 → v1.2.4
   - `minor`: v1.2.3 → v1.3.0
   - `major`: v1.2.3 → v2.0.0
   - `auto`: reads the commit messages since the last release.
     `feat!:` or `BREAKING CHANGE` → major, `feat:` → minor, anything else → patch.

The workflow runs the type check and the tests, builds a signed release APK,
tags the commit `vX.Y.Z`, and publishes a GitHub Release. The release notes
have a download link and every commit since the previous release, grouped as
Features, Fixes and so on.

The first release uses the version in `package.json` (currently 1.0.0). After
that, the latest `vX.Y.Z` tag is the source of truth. The version is not
committed back to the repo. CI passes it to Gradle as `versionName`, and
`versionCode` is `major * 1000000 + minor * 1000 + patch`.

**Install on a phone:** open the release on the phone and tap the `.apk`. The
newest release is always at
https://github.com/ekozf/MyMedSchedule/releases/latest

## Signing key (one-time setup)

Android only installs an update over an existing app when both are signed with
the same key. The workflow therefore needs a permanent key in repository
secrets, and it stops with an error if the key is missing.

```sh
keytool -genkeypair -v -keystore mymedschedule-release.jks \
  -alias mymedschedule -keyalg RSA -keysize 4096 -validity 36500
```

Back up the `.jks` file and its passwords somewhere safe, such as a password
manager. If you lose them, users have to uninstall the app (and lose their
data) to get later updates. Never commit the keystore.

Add these secrets under Settings → Secrets and variables → Actions:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -i mymedschedule-release.jks \| pbcopy` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `mymedschedule` |
| `ANDROID_KEY_PASSWORD` | the key password (same as the keystore password if you pressed Enter) |

Or with the GitHub CLI:

```sh
base64 -i mymedschedule-release.jks | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS --body mymedschedule
gh secret set ANDROID_KEY_PASSWORD
```

APKs from `bun run build:apk` on a Mac are signed with the local testing key.
They can't be updated in place by a release APK, and the reverse is also true.
Uninstall one before you install the other.
