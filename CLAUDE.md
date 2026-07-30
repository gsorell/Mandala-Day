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
   > **Always keep `-codec:a libmp3lame` and `-b:a 64k`.** A bare `ffmpeg -i in.mp3
   > out.mp3` re-encode defaults to a low bitrate that auto-applies a ~10.5 kHz lowpass,
   > audibly muffling the track (this is what happened to Cutting Through — a good
   > 15.5 kHz master got re-encoded to a dull 40 kbps copy). After adding or changing
   > **any** file in `assets/audio/`, refresh the integrity manifest and stage it:
   > ```bash
   > scripts/check-audio.sh --update && git add assets/audio/CHECKSUMS.sha256
   > ```
   > A pre-commit hook (`.githooks/pre-commit`) blocks commits whose audio no longer
   > matches the manifest — see **Audio integrity guard** below. Then run
   > `scripts/check-audio-quality.sh` to confirm the new/changed file didn't lose
   > high-end vs its master (catches a muffled re-encode, which the checksum can't) —
   > see **Audio quality guard (vs. masters)** below.
2. **Screen** — clone `src/screens/GeometryOfAttentionScreen.tsx` to
   `src/screens/<Name>Screen.tsx`, swapping: title, in-session prompt, description,
   duration (min), the audio `require`, the `templateId` (`extra_<snake_name>`), and the
   `SessionComplete` navigation params (`sessionTitle`, `dedication`, `shareMessage`).
   > **Notification guard:** the cloned screen carries a
   > `usePracticeNotificationGuard(isPlaying, <NAME>_DURATION_MIN)` call — swap the
   > duration constant along with everything else. It stops a session reminder from
   > firing on top of the meditation. `isPracticeRoute` in `src/services/notifications.ts`
   > treats any route it does not know as a practice, so a new screen is protected by
   > default and needs no entry there.
   >
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

## Audio integrity guard

`assets/audio/CHECKSUMS.sha256` records the SHA-256 of every known-good audio asset.
`scripts/check-audio.sh` verifies the files still match it (and that no `.mp3` is
missing from the manifest); it fails if a file was silently altered, truncated,
swapped, or re-encoded to lower quality.

- **One-time setup per clone** (points git at the tracked hooks dir):
  ```bash
  git config core.hooksPath .githooks
  ```
  The `.githooks/pre-commit` hook then runs the check automatically whenever a commit
  touches `assets/audio/`, aborting the commit on any mismatch.
- **Run it manually** anytime: `scripts/check-audio.sh`
- **After a deliberate audio change** (new track, re-encode, replacement): regenerate
  and stage the manifest so the hook accepts the new files:
  ```bash
  scripts/check-audio.sh --update && git add assets/audio/CHECKSUMS.sha256
  ```

> Background: this exists because a manual ffmpeg step once overwrote
> `cutting-through.mp3` with a muffled 40 kbps / 10.5 kHz-lowpass re-encode (the master
> is clean to ~15.5 kHz). The guard makes that class of regression fail loudly at commit
> time instead of shipping.

## Audio quality guard (vs. masters)

The checksum guard above answers *"did this file change since I blessed it?"* — byte
identity against a snapshot it generated from the app files themselves. It **cannot**
tell you whether a shipped file was a *good* re-encode in the first place: run
`--update` on a muffled file and it will defend that muffled file forever. That
judgment used to depend entirely on the ear.

`scripts/check-audio-quality.sh` closes that gap. It compares every
`assets/audio/*.mp3` against its high-quality **master** — an external reference the
checksum guard never consults — and fails if a shipped file has lost high-frequency
content its master had (the muffling cliff behind the Cutting Through incident).
Overall loudness differences are cancelled (it compares spectral *shape* relative to
each file's own 2–4 kHz midband), so a quieter/louder copy is never mistaken for a
degraded one. Normal 64k-mono LAME loses ~1 dB here; a real lowpass cliff loses 15–40.

```bash
scripts/check-audio-quality.sh            # prints a per-file pass/fail table
MASTERS=/path/to/masters scripts/check-audio-quality.sh   # override masters folder
```

- **Masters live at** `C:\Users\gsore\Desktop\Mandala Day Assets\Audio\MP3\` (default).
  This is a **local** check — masters are not in the repo, so it can't run on a fresh
  clone or in CI. Run it as a **release-step gate** (step 0, after any audio change),
  not a hard pre-commit blocker.
- **Utility sounds** (`gong.mp3`, `pranayama-muted.mp3`, `pranayama-sustain.mp3`) are
  short non-spoken cues at source bitrate — intentionally *not* gated (spectral
  comparison on a 0.5s chime is meaningless). The pranayama bells' sources live in
  `…/Audio/Bells/` (`Hold.mp3`, `Sustained chime.mp3`).
- `integration-motion.mp3` is under the guard: its master is
  `…/Audio/MP3/Integration in Motion.mp3` (matched despite the app name dropping the
  "in", via the stopword-stripping in `find_master`). Its higher-quality source of
  record is the Audacity project `…/Audio/AUP3/Integration in Motion.aup3`.

## Quick reference

| Asset | Location |
|---|---|
| Audio masters (quality guard) | `C:\Users\gsore\Desktop\Mandala Day Assets\Audio\MP3` |
| Android builds folder | `C:\Users\gsore\Desktop\Mandala Day Assets\Builds` |
| Android keystore | `android-keystore.jks` (repo root, gitignored) |
| EAS dashboard | https://expo.dev/accounts/gsorell/projects/mandala-day/builds |
| Play Console | internal testing track |
| iOS bundle id | `com.mandaladay.app` |
| Android package | `com.mandaladay.app` |
