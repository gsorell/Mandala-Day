"""High-level render orchestration.

Ties together preset -> renderer -> encoder and resolves the render duration
(from the preset, the audio, or an explicit override). This is the function the
CLI calls; it is also perfectly usable from a notebook or another script.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

from .audio import ensure_ffmpeg, probe_duration
from .encoder import FFmpegEncoder
from .preset import Preset
from .renderer import FieldRenderer

# 4K UHD, the delivery format.
UHD_4K = (3840, 2160)
DEFAULT_DURATION = 600.0  # 10 minutes


def resolve_duration(
    preset: Preset,
    *,
    duration_override: float | None,
    use_audio: bool,
) -> float:
    """Decide how long to render, in seconds.

    Priority: explicit ``--duration`` > preset ``duration`` > audio length >
    the 10-minute default.
    """
    if duration_override is not None:
        return duration_override
    if preset.duration is not None:
        return preset.duration
    if use_audio and preset.audio:
        return probe_duration(preset.audio)
    return DEFAULT_DURATION


def render(
    preset: Preset,
    output_path: str | Path,
    *,
    width: int = UHD_4K[0],
    height: int = UHD_4K[1],
    fps: int = 60,
    duration: float | None = None,
    with_audio: bool = True,
    crf: int = 17,
    x264_preset: str = "slow",
    progress: bool = True,
) -> Path:
    """Render ``preset`` to an MP4 at ``output_path``. Returns the final path."""
    ensure_ffmpeg()

    audio_path = preset.audio if (with_audio and preset.audio) else None
    if audio_path and not Path(audio_path).exists():
        raise FileNotFoundError(f"Preset audio not found: {audio_path}")

    total_seconds = resolve_duration(
        preset, duration_override=duration, use_audio=with_audio
    )
    total_frames = max(1, round(total_seconds * fps))

    output_path = Path(output_path)

    if progress:
        print(
            f"Rendering '{preset.name}'  "
            f"{width}x{height} @ {fps}fps  "
            f"{total_seconds:.1f}s ({total_frames} frames)\n"
            f"  audio : {audio_path or '(none)'}\n"
            f"  output: {output_path}",
            flush=True,
        )

    start = time.monotonic()
    with FieldRenderer(preset, width, height, duration=total_seconds) as renderer, FFmpegEncoder(
        output_path,
        width,
        height,
        fps,
        audio_path=audio_path,
        crf=crf,
        x264_preset=x264_preset,
    ) as encoder:
        for frame_index in range(total_frames):
            t = frame_index / fps
            encoder.write(renderer.render_frame(t))
            if progress and (frame_index % fps == 0 or frame_index == total_frames - 1):
                _print_progress(frame_index + 1, total_frames, start)

    if progress:
        elapsed = time.monotonic() - start
        print(f"\nDone in {elapsed:.1f}s -> {output_path}", flush=True)
    return output_path


def _print_progress(done: int, total: int, start: float) -> None:
    elapsed = time.monotonic() - start
    frac = done / total
    eta = (elapsed / frac - elapsed) if frac > 0 else 0.0
    bar_len = 30
    filled = int(bar_len * frac)
    bar = "#" * filled + "-" * (bar_len - filled)
    sys.stdout.write(
        f"\r  [{bar}] {frac * 100:5.1f}%  "
        f"{done}/{total}  elapsed {elapsed:5.0f}s  eta {eta:5.0f}s"
    )
    sys.stdout.flush()
