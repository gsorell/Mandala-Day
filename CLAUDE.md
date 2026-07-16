# Mandala Day — Release Procedure

The full sequence to ship a change. Run top-to-bottom; each step is self-contained.

## 0. Adding a new meditation (Extras)

Only when the change is a *new guided meditation*. Source audio arrives in
`C:\Users\gsore\Desktop\Mandala Day Assets\Audio\MP3\`. Mirror the most recent
"add meditation" commit (e.g. Geometry of Attention, `623fd06`) — it touches **6 files**:

1. **Audio asset** — re-encode the source to compact mono to match the others
   (they run ~40–65 kbps). Name it hyphen-case:
   ```bash
   ffmpeg -y -i "<source>.mp3" -ac 1 -b:a 64k -codec:a libmp3lame assets/audio/<hyphen-name>.mp3
   ```
2. **Screen** — clone `src/screens/GeometryOfAttentionScreen.tsx` to
   `src/screens/<Name>Screen.tsx`, swapping: title, in-session prompt, description,
   duration (min), the audio `require`, the `templateId` (`extra_<snake_name>`), and the
   `SessionComplete` navigation params (`sessionTitle`, `dedication`, `shareMessage`).
   > **Header clip guard:** the begin-screen header title is a custom in-screen row,
   > cloned per screen — always clone from a header-fixed screen (Geometry qualifies as
   > of `758bca7`). The title `Text` must keep `numberOfLines={1} adjustsFontSizeToFit
   > minimumFontScale={0.7}` and its style must keep `flex: 1` + `textAlign: 'center'`,
   > or long titles clip off the right edge on narrower devices / larger text sizes.
   > (The real fix is a shared `<ScreenHeader>` component; until that exists, don't drop
   > these props when swapping the title.)
3. **Route** — `App.tsx`: add the import and a `<Stack.Screen name="<Name>" …>`.
4. **Type** — `src/types/index.ts`: add `<Name>: undefined;` to `RootStackParamList`.
5. **Extras menu** — `src/screens/SettingsScreen.tsx`: add a `TouchableOpacity` row
   (`navigation.navigate('<Name>')`, "`N min guided`").
6. **History meta** — `src/screens/HistoryScreen.tsx`: add an `EXTRA_SESSION_META`
   entry keyed by the **same** `extra_<snake_name>` templateId, with a 2-letter `abbr`.

**Verify before shipping** (both must pass):

- **Completion card** — finishing the meditation calls `handleComplete`, which
  navigates to `SessionComplete` with `sessionTitle` / `dedication` / `shareMessage`.
  Confirm those three params match the strings you want on the card, and that the
  `templateId` passed to `appendExtraInstance` is `extra_<snake_name>`.
- **History** — the completed session must appear in the History tab with its badge.
  Confirm `EXTRA_SESSION_META['extra_<snake_name>']` exists (History filters completed
  `extra_*` instances, renders the `abbr` badge, and its reshare re-opens the card from
  this meta). The templateId in the screen and the meta key **must be identical**.
- Run `npx tsc --noEmit` (a pre-existing `drawImage` error in `MandalaCompleteScreen.tsx`
  is unrelated and can be ignored).

**YouTube visual** — add a `visual-engine/presets/<snake_name>.json` preset (pointing
`audio` at the app's `assets/audio/<hyphen-name>.mp3`) and render the 4K MP4:
`cd visual-engine && ./.venv/Scripts/python.exe render.py <snake_name>`. Output lands in
`C:\Users\gsore\Desktop\Mandala Day Assets\MP4 Outputs`. See `visual-engine/README.md`.

Then continue with the release steps below.

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
