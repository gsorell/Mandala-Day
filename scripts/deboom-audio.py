#!/usr/bin/env python3
"""Tame the vocal-fundamental boom in the narrated tracks.

Every narrated track is the same ElevenLabs voice (see docs/AUDIO_PROVENANCE.md),
whose fundamental sits at ~72-80 Hz -- unusually low, and unusually strong relative
to the rest of the voice. Measured across the library, roughly 75% of each track's
total signal power lives in 60-120 Hz. Headphones and phone speakers barely
reproduce that band, so it goes unnoticed there; a Bluetooth speaker with a bass
boost and a passive radiator tuned into exactly that region turns it into a boom.

This applies, per track, a single peaking cut at 78 Hz, its gain solved PER TRACK
so that the 60-120 Hz band lands at TARGET_DB relative to the 250-4000 Hz speech
band. One filter, deliberately: a high-pass below the fundamental was tried and
removed. There is almost nothing under 60 Hz to clear out (20-60 Hz measures ~9 dB
BELOW the speech band), so it bought no audible cleanup, and its ringing pushed the
true peak of some tracks UP -- Body Safari went from -5.1 to -3.5 dBFS -- which then
ate into the makeup-gain headroom below. Removing it costs nothing and gives every
track room to reach its original loudness.

The per-track solve matters: the library spans ~4 dB of boom (The Chakra Centers
is much lighter than Starry Night), so one fixed cut would over-thin the tracks
that were already fine.

Reads the MP3 masters and never modifies them. Writes a corrected master to a
separate folder for the archive, and encodes each app asset straight from the
original master at the house setting (64 kbps mono LAME) -- one lossy generation
between source and app, exactly as the pipeline was before. Working from the
masters rather than from assets/audio is what keeps it at one.

    scripts/deboom-audio.py            # measure + report only
    scripts/deboom-audio.py --apply    # write corrected masters and app assets
"""
import os, sys, glob, re, subprocess, tempfile
import numpy as np

MASTERS = os.environ.get("MASTERS", r"C:\Users\gsore\Desktop\Mandala Day Assets\Audio\MP3")
OUT     = os.environ.get("DEBOOMED", r"C:\Users\gsore\Desktop\Mandala Day Assets\Audio\MP3-deboomed")
APP     = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "audio")

TARGET_DB = 4.0      # desired 60-120 Hz level, dB relative to the 250-4000 Hz band
BELL_HZ   = 78.0     # peaking-cut centre = the measured fundamental
BELL_Q    = 1.0
MAX_CUT   = 10.0     # never cut more than this, whatever the solve asks for
TP_CEIL   = -1.0     # dBTP ceiling; makeup gain is limited rather than clip
NORM_LUFS = -26.0    # normalise every track to this integrated loudness.
                     # Set to None to instead preserve each track's original level.
                     # -26.0 is the library's own mean, so the app's overall level is
                     # unchanged -- this only removes the jumps BETWEEN tracks. The
                     # library sits well below spoken-word norms (-16..-19); raising it
                     # is a deliberate product decision, so change this number on
                     # purpose, not by accident.
SR        = 44100

UTILITY = {"gong", "pranayama-muted", "pranayama-sustain", "keisu-bell"}
BOOM = (60., 120.); SPEECH = (250., 4000.)


def norm(s):
    s = os.path.splitext(os.path.basename(s))[0].lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    s = re.sub(r"(^|-)(the|a|an|of|in|on|to|and|for)(-|$)", r"\1", s)
    return re.sub(r"-+", "-", s).strip("-")


def decode(path):
    out = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True).stdout
    return np.frombuffer(out, dtype=np.float32)


def psd(x, n=8192):
    """Average spectrum over voice-active frames only, so long pauses don't skew it."""
    w = np.hanning(n)
    rms_all = np.sqrt(np.mean(x.astype(np.float64) ** 2)) + 1e-12
    acc = None; cnt = 0
    for i in range(0, len(x) - n, n):
        seg = x[i:i + n].astype(np.float64)
        if np.sqrt(np.mean(seg ** 2)) <= rms_all * 0.5:
            continue
        p = np.abs(np.fft.rfft(seg * w)) ** 2
        acc = p if acc is None else acc + p
        cnt += 1
    if not cnt:
        return None, None
    return np.fft.rfftfreq(n, 1 / SR), acc / cnt


def band_db(freqs, p, lo, hi):
    m = (freqs >= lo) & (freqs < hi)
    return 10 * np.log10(p[m].sum() + 1e-30)


def loudness(path):
    """Integrated loudness (LUFS) and true peak (dBFS) in one pass."""
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path,
                          "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    i = re.findall(r"I:\s*(-?[\d.]+)\s*LUFS", out)
    pk = re.findall(r"Peak:\s*(-?[\d.]+)\s*dBFS", out)
    return (float(i[-1]) if i else None), (float(pk[-1]) if pk else None)


def biquad_mag2(freqs, b, a):
    z = np.exp(-2j * np.pi * freqs / SR)
    num = b[0] + b[1] * z + b[2] * z ** 2
    den = a[0] + a[1] * z + a[2] * z ** 2
    return np.abs(num / den) ** 2


def peaking(f0, q, gain_db):
    A = 10 ** (gain_db / 40); w0 = 2 * np.pi * f0 / SR
    al = np.sin(w0) / (2 * q); c = np.cos(w0)
    return ([1 + al * A, -2 * c, 1 - al * A], [1 + al / A, -2 * c, 1 - al / A])


def excess(freqs, p):
    return band_db(freqs, p, *BOOM) - band_db(freqs, p, *SPEECH)


def solve_gain(freqs, p):
    """Find the peaking-cut gain that puts the boom band at TARGET_DB."""
    lo, hi = -MAX_CUT, 0.0
    for _ in range(40):
        g = (lo + hi) / 2
        pg = p * biquad_mag2(freqs, *peaking(BELL_HZ, BELL_Q, g))
        if excess(freqs, pg) > TARGET_DB:
            hi = g
        else:
            lo = g
    return (lo + hi) / 2


def main():
    apply = "--apply" in sys.argv
    masters = {norm(f): f for f in glob.glob(os.path.join(MASTERS, "*.mp3"))}
    app = sorted(f for f in glob.glob(os.path.join(APP, "*.mp3"))
                 if os.path.splitext(os.path.basename(f))[0] not in UTILITY)
    if apply:
        os.makedirs(OUT, exist_ok=True)

    print(f"target: 60-120 Hz at {TARGET_DB:+.1f} dB rel. 250-4000 Hz   "
          f"(bell {BELL_HZ:.0f} Hz Q{BELL_Q}, "
          + (f"normalised to {NORM_LUFS:+.1f} LUFS)" if NORM_LUFS is not None
             else "loudness preserved per track)"))
    print(f"{'track':<30}{'before':>8}{'cut':>7}{'after':>8}{'LUFS':>8}{'was':>8}")
    print("-" * 70)
    missing, done = [], 0
    for f in app:
        base = os.path.basename(f); key = norm(f)
        m = masters.get(key)
        if not m:
            missing.append(base); print(f"{base:<30}{'':>8}{'':>7}{'':>8}   NO MASTER"); continue
        freqs, p = psd(decode(m))
        if p is None:
            missing.append(base); print(f"{base:<30}{'':>8}{'':>7}{'':>8}   DECODE FAILED"); continue
        before = excess(freqs, p)
        g = solve_gain(freqs, p)
        pred = excess(freqs, p * biquad_mag2(freqs, *peaking(BELL_HZ, BELL_Q, g)))
        note = ""
        if not apply:
            print(f"{base:<30}{before:8.1f}{g:7.1f}{pred:8.1f}{'':>8}{'':>8}  (predicted)"); continue

        eqf = f"equalizer=f={BELL_HZ:g}:width_type=q:w={BELL_Q:g}:g={g:.2f}"

        # Taking out the boom removes a LOT of energy -- it was ~75% of the track's
        # total power -- which drags integrated loudness down 3-5 LU even though
        # K-weighting discounts the low end, and it does so UNEVENLY (a track needing
        # a small cut loses less). So the level is set explicitly rather than left
        # wherever the filter puts it: to NORM_LUFS if set, otherwise back to the
        # track's original loudness.
        tmp = os.path.join(tempfile.gettempdir(), "deboom_tmp.wav")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", m, "-af", eqf,
                        "-c:a", "pcm_f32le", tmp], check=True)
        want, _ = loudness(m)
        target = want if NORM_LUFS is None else NORM_LUFS
        got, peak = loudness(tmp)
        os.remove(tmp)

        def encode(makeup):
            """Write corrected master + app asset at this gain; return the app's LUFS."""
            af = eqf + f",volume={makeup:.2f}dB"
            cm = os.path.join(OUT, os.path.basename(m))
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", m, "-af", af,
                            "-map_metadata", "0", "-codec:a", "libmp3lame", "-q:a", "2",
                            cm], check=True)
            # NB: encode the app asset from the ORIGINAL master with the same filter,
            # NOT from the corrected master just written. Going master -> corrected
            # mp3 -> app mp3 would put two lossy generations between source and app;
            # this keeps it at one, as the pipeline was before this script existed.
            # The corrected master is for the archive, never used as an input.
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", m, "-af", af, "-ac", "1",
                            "-b:a", "64k", "-map_metadata", "0", "-codec:a", "libmp3lame",
                            f], check=True)
            return loudness(f)[0]

        makeup = target - got
        limited = peak is not None and peak + makeup > TP_CEIL
        if limited:
            makeup -= (peak + makeup - TP_CEIL)
            note = "  gain-limited"
        final = encode(makeup)

        # The 64k mono encode shifts integrated loudness by a few tenths, so the first
        # pass lands slightly off target. Measure the real shipped file and correct
        # once. Skipped when the peak ceiling is binding -- there is no headroom to give.
        if not limited and abs(target - final) > 0.2:
            makeup += target - final
            if peak is not None and peak + makeup > TP_CEIL:
                makeup -= (peak + makeup - TP_CEIL); note = "  gain-limited"
            final = encode(makeup)

        fq2, p2 = psd(decode(f))
        after = excess(fq2, p2)
        if abs(after - TARGET_DB) > 1.5 or (not limited and abs(final - target) > 0.5):
            note += "  CHECK"
        print(f"{base:<30}{before:8.1f}{g:7.1f}{after:8.1f}{final:8.1f}{want:8.1f}{note}")
        done += 1

    print("-" * 70)
    if apply:
        print(f"corrected {done} track(s); corrected masters -> {OUT}")
        print("next: scripts/check-audio.sh --update && git add assets/audio/CHECKSUMS.sha256")
    else:
        print(f"{len(app) - len(missing)} track(s) would be corrected. Re-run with --apply.")
    if missing:
        print("unmatched:", ", ".join(missing)); return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
