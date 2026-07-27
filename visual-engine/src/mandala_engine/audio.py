"""Audio helpers (ffprobe wrappers)."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path


def ensure_ffmpeg() -> None:
    """Raise a clear error if ffmpeg/ffprobe are not on PATH."""
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            raise RuntimeError(
                f"{tool} was not found on PATH. Install FFmpeg and try again."
            )


def probe_duration(audio_path: str | Path) -> float:
    """Return the duration of an audio file in seconds via ffprobe."""
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    result = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "json",
            str(audio_path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    duration = json.loads(result.stdout)["format"]["duration"]
    return float(duration)
