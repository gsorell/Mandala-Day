# Mandala Day — Release Procedure

The full sequence to ship a change. Run top-to-bottom; each step is self-contained.

## 1. Test in browser

```bash
npm run web
```

Opens dev server at the printed localhost URL. Smoke-test the change before committing.

## 2. Commit and push

```bash
git add <files>
git commit -m "<message>"
git push
```

Pushing `main` triggers the Netlify web deploy automatically (no manual step).

## 3. Bump versions

Before building native binaries, bump version fields. Match `versionCode` between `app.json` and `android/app/build.gradle` — they must stay in sync or the Play Store rejects the upload.

- **[app.json](app.json)**:
  - `expo.version` — semver (e.g. `1.0.12` → `1.0.13`)
  - `expo.android.versionCode` — integer, +1 each release
  - `expo.ios.buildNumber` — integer string, +1 each release
- **[android/app/build.gradle](android/app/build.gradle)** (under `defaultConfig`):
  - `versionCode` — must equal `expo.android.versionCode`
  - `versionName` — must equal `expo.version`

Commit the bump separately (e.g. `build: bump to 1.0.13 / vc18 / ios b3`).

> **Note:** `/android` is in `.gitignore`, but `android/app/build.gradle` is force-tracked (it carries the release signing config and version fields). Plain `git add android/app/build.gradle` will be refused with an "ignored" warning — use `git add -f android/app/build.gradle` to stage version bumps.

## 4. Android — local signed AAB

Local gradle build (~1 min) instead of EAS cloud. Signing config is wired into `android/app/build.gradle` (release signingConfig points at `android-keystore.jks` at the repo root).

```bash
cd android && ./gradlew bundleRelease
```

Output lands at `android/app/build/outputs/bundle/release/app-release.aab`.

Copy + rename to the Builds folder using the convention `MandalaDay-v{version}-b{versionCode}-uploadkey-{YYYYMMDD}-{HHMM}.aab`:

```bash
cp android/app/build/outputs/bundle/release/app-release.aab \
  "/c/Users/gsore/Desktop/Mandala Day Assets/Builds/MandalaDay-v<VERSION>-b<VERSIONCODE>-uploadkey-<YYYYMMDD>-<HHMM>.aab"
```

Upload that file manually to Play Console → internal testing track.

## 5. iOS — EAS cloud build

iOS stays on EAS (no local Xcode build). Takes ~6–8 min.

```bash
eas build --platform ios --profile production
```

Watch progress at https://expo.dev/accounts/gsorell/projects/mandala-day/builds. The `production` profile is defined in [eas.json](eas.json).

## 6. iOS — submit to TestFlight

Once the EAS build finishes:

```bash
eas submit --platform ios --latest
```

Apple credentials (Apple ID, ASC App ID, team ID) are already in [eas.json](eas.json) under `submit.production.ios`. The build appears in TestFlight after Apple processing (~10–30 min).

---

## Quick reference

| Asset | Location |
|---|---|
| Android builds folder | `C:\Users\gsore\Desktop\Mandala Day Assets\Builds` |
| Android keystore | `android-keystore.jks` (repo root, gitignored) |
| EAS dashboard | https://expo.dev/accounts/gsorell/projects/mandala-day/builds |
| Play Console | internal testing track |
| iOS bundle id | `com.mandaladay.app` |
| Android package | `com.mandaladay.app` |
