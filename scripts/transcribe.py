#!/usr/bin/env python
"""Transcribe finalized meditation audio into text transcripts, with pauses.

These transcripts capture what actually *shipped* (post-ElevenLabs, post
last-minute edits), so we can diff them against the written scripts and see
where phrasing was cut, reworded, or re-rendered -- and how the pacing landed.

Silences between words are annotated inline as `[pause 2.4s]`, since pause
length is part of the finalized delivery (break tags, ellipses, manual edits)
and worth carrying back into the next scripting pass.

Usage:
    python scripts/transcribe.py                  # all assets/audio/*.mp3
    python scripts/transcribe.py prairie-wind     # one file (name w/ or w/o .mp3)
    python scripts/transcribe.py a.mp3 b.mp3       # several
    python scripts/transcribe.py --force ...       # re-transcribe even if up to date
    python scripts/transcribe.py --pause 2.0 ...   # min gap (s) to mark a pause

Output: transcripts/<name>.txt  (one per meditation)
Model:  faster-whisper "medium" (CPU, int8). Downloads once to the HF cache.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "assets" / "audio"
OUT_DIR = ROOT / "transcripts"
MODEL_SIZE = "medium"
DEFAULT_PAUSE_MIN = 1.5  # seconds; gaps >= this get a [pause] marker

# Audio that carries no narration to transcribe (bells / breath-only cues).
SKIP = {"gong", "pranayama-muted", "pranayama-sustain"}

_SENTENCE_END = (".", "?", "!", "…")


def parse_args(argv):
    pause_min = DEFAULT_PAUSE_MIN
    force = False
    names = []
    it = iter(argv)
    for a in it:
        if a == "--force":
            force = True
        elif a == "--pause":
            pause_min = float(next(it))
        elif a.startswith("--pause="):
            pause_min = float(a.split("=", 1)[1])
        elif a.startswith("-"):
            continue
        else:
            names.append(a)
    return names, force, pause_min


def iter_targets(names):
    if names:
        for n in names:
            yield AUDIO_DIR / (n if n.endswith(".mp3") else f"{n}.mp3")
    else:
        for p in sorted(AUDIO_DIR.glob("*.mp3")):
            if p.stem not in SKIP:
                yield p


def build_transcript(segments, pause_min):
    """Turn word-timestamped segments into text with [pause] markers.

    A new line starts after sentence-ending punctuation and around each pause,
    so the transcript diffs cleanly against a written script.
    """
    lines = []
    buf = []
    prev_end = 0.0

    def flush():
        if buf:
            lines.append(" ".join(buf))
            buf.clear()

    for seg in segments:
        for w in (seg.words or []):
            gap = w.start - prev_end
            if gap >= pause_min:
                flush()
                lines.append(f"[pause {gap:.1f}s]")
            prev_end = w.end
            token = w.word.strip()
            if not token:
                continue
            buf.append(token)
            if token.endswith(_SENTENCE_END):
                flush()
    flush()
    return "\n".join(lines).strip()


def main():
    names, force, pause_min = parse_args(sys.argv[1:])
    targets = list(iter_targets(names))
    OUT_DIR.mkdir(exist_ok=True)

    from faster_whisper import WhisperModel

    print(f"Loading faster-whisper '{MODEL_SIZE}' (first run downloads it)...")
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

    for audio in targets:
        if not audio.exists():
            print(f"  ! missing: {audio.name}")
            continue
        out = OUT_DIR / f"{audio.stem}.txt"
        if out.exists() and not force and out.stat().st_mtime >= audio.stat().st_mtime:
            print(f"  = up to date: {out.name}")
            continue

        print(f"  > transcribing {audio.name} ...", flush=True)
        segments, info = model.transcribe(
            str(audio),
            language="en",
            beam_size=5,
            word_timestamps=True,
            # Skip silent stretches so the model can't hallucinate into them
            # (the long meditation pauses otherwise produce "Thank you for
            # watching" / repeated-word artifacts). VAD-clipped timestamps are
            # mapped back to the real timeline, so pause lengths are preserved.
            vad_filter=True,
            # The delivery is soft and breathy with very long gaps, so the
            # default VAD clips the first word after each silence. Lower the
            # detection threshold and pad speech boundaries generously to keep
            # word onsets intact while still removing the silent stretches.
            vad_parameters=dict(
                threshold=0.35,
                min_silence_duration_ms=1500,
                speech_pad_ms=800,
            ),
            # Don't feed prior text back in -- stops repetition loops where a
            # single line echoes across many long pauses.
            condition_on_previous_text=False,
        )
        text = build_transcript(segments, pause_min)
        out.write_text(text + "\n", encoding="utf-8")
        print(f"    -> {out.relative_to(ROOT)}  ({info.duration:.0f}s audio)")


if __name__ == "__main__":
    main()
