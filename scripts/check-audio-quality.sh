#!/usr/bin/env sh
# Audio QUALITY guard for Mandala Day.
#
# Complements scripts/check-audio.sh. That script asks "did this file change
# since I blessed it?" (byte identity vs a self-generated checksum snapshot).
# This script asks the question the checksum guard can't: "was the shipped file
# a GOOD re-encode of its master in the first place?" — the actual failure mode
# behind the Cutting Through incident (a re-encode that lowpassed the track to
# ~10.5 kHz, muffling it, while still being a perfectly valid, checksum-able mp3).
#
# It compares each assets/audio/*.mp3 against its high-quality MASTER (an
# external reference the checksum guard never consults) and flags any shipped
# file that has lost high-frequency content its master had — i.e. a muffling
# cliff. Overall loudness differences are cancelled out (we compare spectral
# SHAPE relative to each file's own midband), so a quieter/louder copy is not
# mistaken for a degraded one.
#
#   scripts/check-audio-quality.sh
#
# Master folder (override with MASTERS=/path):
MASTERS="${MASTERS:-/c/Users/gsore/Desktop/Mandala Day Assets/Audio/MP3}"
#
# Exit 0 = every matched file preserves its master's high end; exit 1 = a
# shipped file looks muffled relative to its master (or a probe failed).

set -eu

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
AUDIO_DIR="assets/audio"

# Fail threshold: how many dB of high-band shape a shipped file may lose,
# relative to its master, before we call it muffled. Normal 64k-mono LAME
# encoding of a clean master loses ~1 dB here; a real lowpass cliff loses 15-40.
FAIL_DB=8

if [ ! -d "$MASTERS" ]; then
  echo "ERROR: masters folder not found: $MASTERS" >&2
  echo "       Set MASTERS=/path/to/masters and re-run." >&2
  exit 1
fi

# mean dB of a bandpass'd copy (whole-file RMS; alignment-free).
band() { # file center width
  ffmpeg -hide_banner -nostats -i "$1" \
    -af "bandpass=f=$2:width_type=h:w=$3,volumedetect" -f null - 2>&1 \
    | sed -n 's/.*mean_volume: \([-0-9.]*\) dB.*/\1/p' | head -1
}

# Normalize a name to hyphen-lower tokens for matching app<->master.
norm() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' \
    | sed -e 's/\.mp3$//' -e 's/[^a-z0-9]\+/-/g' -e 's/^-//' -e 's/-$//'
}

# Drop connective stopword tokens so app names that omit them still match
# their masters (e.g. app "integration-motion" vs master "Integration in
# Motion" -> "integration-in-motion"; also strips the/a/of/and/to).
nostop() {
  printf '%s' "$1" | sed -E 's/(^|-)(the|a|an|of|in|on|to|and|for)(-|$)/\1/g' \
    | sed -e 's/--\+/-/g' -e 's/^-//' -e 's/-$//'
}

# Find the master file for an app basename. Compares both raw and
# stopword-stripped forms, since app names are inconsistent about leading
# "the-" and dropped connectives (the-chakra-centers vs quiet-cove for
# "The Quiet Cove"; integration-motion for "Integration in Motion").
find_master() {
  want="$1"; want_ns=$(nostop "$want")
  for m in "$MASTERS"/*.mp3; do
    [ -e "$m" ] || continue
    n=$(norm "$(basename "$m")"); n_ns=$(nostop "$n")
    if [ "$n" = "$want" ] || [ "$n_ns" = "$want" ] \
       || [ "$n" = "$want_ns" ] || [ "$n_ns" = "$want_ns" ]; then
      printf '%s' "$m"; return 0
    fi
  done
  return 1
}

printf "%-28s %-9s %8s %8s %8s   %s\n" "file" "master" "Δ11-13k" "Δ13-15k" "Δ15-17k" "verdict"
printf -- "------------------------------------------------------------------------------------\n"

# Utility sounds (bell markers / gong): short non-spoken cues, at source
# bitrate, with no muffling risk. Spectral comparison on a 0.5s chime is
# meaningless, so we intentionally don't quality-gate these.
UTILITY=" gong.mp3 pranayama-muted.mp3 pranayama-sustain.mp3 "

fail=0; checked=0; skipped=0; utility=0
for f in "$AUDIO_DIR"/*.mp3; do
  base=$(basename "$f")
  case "$UTILITY" in *" $base "*)
    printf "%-28s %-9s %8s %8s %8s   %s\n" "$base" "-" "" "" "" "UTILITY (not gated)"
    utility=$((utility+1)); continue ;;
  esac
  key=$(norm "$base")
  if ! master=$(find_master "$key"); then
    printf "%-28s %-9s %8s %8s %8s   %s\n" "$base" "-" "" "" "" "SKIP (no master)"
    skipped=$((skipped+1)); continue
  fi

  # Reference midband (2-4 kHz): full-energy region in both files. We compare
  # each high band RELATIVE to this, so overall loudness differences cancel.
  s_mid=$(band "$f" 3000 2000);      m_mid=$(band "$master" 3000 2000)

  worst=0
  vals=""
  for probe in "12000 2000" "14000 2000" "16000 2000"; do
    set -- $probe
    s=$(band "$f" "$1" "$2"); m=$(band "$master" "$1" "$2")
    # relative rolloff = band - midband, per file; delta = master lost less?
    # positive drel = shipped lost MORE high end than master (muffled).
    drel=$(awk -v s="$s" -v sm="$s_mid" -v m="$m" -v mm="$m_mid" \
      'BEGIN{ printf "%.1f", (m-mm)-(s-sm) }')
    vals="$vals $drel"
    aw=$(awk -v d="$drel" 'BEGIN{ printf "%.1f", (d<0?-d:d) }')
    worst=$(awk -v a="$aw" -v w="$worst" 'BEGIN{ print (a>w?a:w) }')
  done

  # only the lower probes (11-13k, 13-15k) gate pass/fail: a proper 64k encode
  # may legitimately soften 15-17k via the encoder's own lowpass.
  gate=$(printf '%s' "$vals" | awk '{ a=($1<0?-$1:$1); b=($2<0?-$2:$2); print (a>b?a:b) }')
  verdict=$(awk -v g="$gate" -v t="$FAIL_DB" 'BEGIN{ print (g>t?"FAIL":"ok") }')
  [ "$verdict" = "FAIL" ] && fail=1
  checked=$((checked+1))

  set -- $vals
  printf "%-28s %-9s %8s %8s %8s   %s\n" "$base" "yes" "$1" "$2" "$3" "$verdict"
done

printf -- "------------------------------------------------------------------------------------\n"
echo "checked: $checked   utility (not gated): $utility   skipped (no master): $skipped   threshold: ${FAIL_DB} dB"
echo "Δ = how much high-end SHAPE the shipped file lost vs its master (positive = more muffled)."
if [ "$fail" -ne 0 ]; then
  echo "" >&2
  echo "FAIL: a shipped file is muffled relative to its master (re-encode regression)." >&2
  echo "      Re-encode from the master with: -codec:a libmp3lame -b:a 64k" >&2
  exit 1
fi
echo "All matched files preserve their master's high end."
