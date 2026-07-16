#!/usr/bin/env sh
# Audio integrity guard for Mandala Day.
#
# Verifies every assets/audio/*.mp3 against a checksum manifest of known-good
# files, so a degraded / truncated / swapped audio asset can't be committed by
# accident (see the "Cutting Through" re-encode incident: a manual ffmpeg step
# overwrote the app asset with a muffled 40 kbps, 10.5 kHz-lowpass copy).
#
#   scripts/check-audio.sh            verify current files match the manifest
#   scripts/check-audio.sh --update   regenerate the manifest (do this ONLY when
#                                      you have deliberately changed audio and
#                                      confirmed the new files are correct)
#
# Exit 0 = all good; exit 1 = mismatch / missing / untracked file.

set -eu

# Resolve repo root so the script works from anywhere (incl. git hooks).
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

AUDIO_DIR="assets/audio"
MANIFEST="$AUDIO_DIR/CHECKSUMS.sha256"

# List of current audio files, repo-relative, sorted, one per line.
list_audio() {
  find "$AUDIO_DIR" -maxdepth 1 -type f -name '*.mp3' | LC_ALL=C sort
}

if [ "${1:-}" = "--update" ]; then
  : > "$MANIFEST"
  list_audio | while IFS= read -r f; do
    sha256sum "$f" >> "$MANIFEST"
  done
  echo "Updated $MANIFEST ($(wc -l < "$MANIFEST" | tr -d ' ') files)."
  exit 0
fi

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: $MANIFEST is missing. Run: scripts/check-audio.sh --update" >&2
  exit 1
fi

fail=0

# 1. Every manifest entry must still match (catches degraded/altered files).
if ! sha256sum -c "$MANIFEST" --quiet 2>/dev/null; then
  echo "" >&2
  echo "ERROR: an audio file no longer matches $MANIFEST." >&2
  echo "       A file was modified/replaced (possible re-encode degradation)." >&2
  sha256sum -c "$MANIFEST" 2>/dev/null | grep -v ': OK$' >&2 || true
  fail=1
fi

# 2. No untracked audio files missing from the manifest (catches new adds).
listed=$(mktemp)
present=$(mktemp)
sed 's/^[0-9a-fA-F]\{64\} [ *]//' "$MANIFEST" | LC_ALL=C sort > "$listed"
list_audio > "$present"
missing=$(comm -13 "$listed" "$present" || true)
rm -f "$listed" "$present"
if [ -n "$missing" ]; then
  echo "" >&2
  echo "ERROR: audio file(s) not in $MANIFEST:" >&2
  echo "$missing" | sed 's/^/       /' >&2
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "" >&2
  echo "If this change to the audio is intentional and the files are correct," >&2
  echo "regenerate the manifest and stage it:" >&2
  echo "    scripts/check-audio.sh --update && git add $MANIFEST" >&2
  exit 1
fi

echo "Audio integrity OK ($(wc -l < "$MANIFEST" | tr -d ' ') files match manifest)."
