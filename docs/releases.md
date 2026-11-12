# CI and releases

## CI (automatic)

`.github/workflows/ci.yml` runs on every pull request and every push to
`master`. It runs the TypeScript check and the unit tests. If either fails,
the check turns red on the PR.

## Android release (manual only)

`.github/workflows/release-android.yml` never runs by itself, because a native
build uses a lot of Actions minutes. To release:

1. GitHub → **Actions** → **Release Android** → **Run workflow**
   (branch: `master`).
2. Pick the bump:
   - `patch` (default): v1.2.3 → v1.2.4
   - `minor`: v1.2.3 → v1.3.0
   - `major`: v1.2.3 → v2.0.0
   - `auto`: reads the commit messages since the last release.
     `feat!:` or `BREAKING CHANGE` → major, `feat:` → minor, anything else → patch.

The workflow runs the type check and the tests, then builds, in one Gradle run,
a signed Android App Bundle (`.aab`, for Google Play) and a signed APK (for
direct install). It verifies both signatures, tags the commit `vX.Y.Z`, and
publishes a GitHub Release with the AAB, the APK and a `.sha256` file for each.
The AAB is also uploaded as a workflow artifact (Actions run → **Artifacts**) so
you can grab it without opening the release. The release notes
have a download link and every commit since the previous release, grouped as
Features, Fixes and so on.

The first release uses the version in `package.json` (currently 1.0.0). After
that, the latest `vX.Y.Z` tag is the source of truth. The version is not
committed back to the repo. CI passes it to Gradle as `versionName`, and
`versionCode` is `major * 1000000 + minor * 1000 + patch`.

Release builds are minified with R8 and drop unused resources. The AAB carries
the R8 mapping file and the native debug symbols (`debugSymbolLevel SYMBOL_TABLE`), so
Play Console can de-obfuscate and symbolicate crashes without extra uploads.

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

## Google Play

### Application ID

The app ID is `be.emirkaan.mymedschedule`. It can never change once the app is
on Google Play. Earlier test builds used `com.anonymous.mymedschedule`; those
are a different app to Android and must be uninstalled by hand.

### First upload (manual)

Google Play only accepts the very first bundle through Play Console:

1. Run the **Release Android** workflow and download
   `MyMedSchedule-vX.Y.Z.aab` from the release (or the run's artifacts).
2. Play Console → **Create app**, then fill in the store listing, content
   rating, data safety form (no data collected or shared; the app has no
   network access in release builds) and privacy policy.
3. **Testing → Internal testing → Create new release**, upload the `.aab`.
4. When asked about app signing, keep **Play App Signing** (the default).

Later releases can be uploaded the same way, or automated with the Play
Developer API.

### Play App Signing: the release keystore becomes the upload key

With Play App Signing, Google holds the key that signs what users download
(the *app signing key*). The keystore in the GitHub secrets is your *upload
key*: Play only checks that each uploaded AAB is signed with it.

- Keep backing up `mymedschedule-release.jks` and its passwords. If you lose
  the upload key you can ask Google to reset it (Play Console → **Test and
  release → App integrity → Request upload key reset**), which takes a few
  days. You don't lose the app.
- APKs attached to GitHub Releases are signed with the upload key, while Play
  installs are signed with Google's app signing key. Android treats them as
  different signers, so a phone with the GitHub APK must uninstall it before
  installing from Play (and the reverse).

### Upload certificate fingerprints

Play Console (and any API that pins the app, such as Google sign-in) asks for
the SHA-1/SHA-256 of the upload certificate:

```sh
keytool -list -v -keystore mymedschedule-release.jks -alias mymedschedule
```

Or from a built artifact:

```sh
keytool -printcert -jarfile MyMedSchedule-vX.Y.Z.aab
apksigner verify --print-certs MyMedSchedule-vX.Y.Z.apk
```

The fingerprints of Google's app signing key are in Play Console →
**Test and release → App integrity → App signing**.

## Local release builds

Gradle refuses to build a release (`assembleRelease`, `bundleRelease`) unless
the four signing variables are set, so nothing can be signed with the debug
key by accident:

```sh
export ANDROID_KEYSTORE_PATH=/path/to/mymedschedule-release.jks
export ANDROID_KEYSTORE_PASSWORD=... ANDROID_KEY_ALIAS=mymedschedule ANDROID_KEY_PASSWORD=...
cd android && ./gradlew :app:bundleRelease :app:assembleRelease
```

`bun run build:apk` uses those variables when they are set. Without them it
builds a test APK signed with `android/app/debug.keystore`, by passing
`-PallowDebugSigningForRelease=true` to Gradle. Such APKs can't be updated in
place by a release APK, and the reverse is also true. Uninstall one before you
install the other. Never upload a debug-signed build to Google Play.
