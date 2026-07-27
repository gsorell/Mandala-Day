"""FFmpeg H.264 encoder.

Frames are streamed as raw ``rgb24`` into ffmpeg's stdin and encoded to
H.264/yuv420p. If an audio track is supplied it is muxed in the same pass and
the output is trimmed to the shorter of the two streams, so audio stays exactly
synchronized to frame 0.

The renderer produces bottom-up rows (OpenGL convention); we apply ``vflip`` in
ffmpeg so the encoded video is right-way-up.
"""

from __future__ import annotations

import subprocess
from pathlib import Path


class FFmpegEncoder:
    """Streaming H.264 encoder fed one raw RGB frame at a time."""

    def __init__(
        self,
        output_path: str | Path,
        width: int,
        height: int,
        fps: int,
        *,
        audio_path: str | Path | None = None,
        crf: int = 17,
        x264_preset: str = "slow",
        audio_bitrate: str = "192k",
    ) -> None:
        self.output_path = Path(output_path)
        self.width = width
        self.height = height
        self.fps = fps
        self._proc: subprocess.Popen[bytes] | None = None

        self.output_path.parent.mkdir(parents=True, exist_ok=True)

        cmd: list[str] = [
            "ffmpeg", "-y",
            # Raw video from stdin.
            "-f", "rawvideo",
            "-pix_fmt", "rgb24",
            "-s", f"{width}x{height}",
            "-r", str(fps),
            "-i", "-",
        ]
        if audio_path is not None:
            cmd += ["-i", str(audio_path)]

        # Flip only the video stream back to top-down.
        cmd += ["-vf", "vflip"]

        # Video encode.
        cmd += [
            "-c:v", "libx264",
            "-preset", x264_preset,
            "-crf", str(crf),
            "-pix_fmt", "yuv420p",
            # Explicit BT.709 tagging — correct for HD/4K delivery.
            "-colorspace", "bt709",
            "-color_primaries", "bt709",
            "-color_trc", "bt709",
        ]

        if audio_path is not None:
            cmd += [
                "-c:a", "aac",
                "-b:a", audio_bitrate,
                # End when the shorter stream ends (keeps A/V aligned to t=0).
                "-shortest",
            ]

        cmd += ["-movflags", "+faststart", str(self.output_path)]

        self._cmd = cmd

    # ------------------------------------------------------------------ #
    def __enter__(self) -> "FFmpegEncoder":
        self._proc = subprocess.Popen(self._cmd, stdin=subprocess.PIPE)
        return self

    def write(self, frame: bytes) -> None:
        assert self._proc is not None and self._proc.stdin is not None
        self._proc.stdin.write(frame)

    def __exit__(self, exc_type: object, *rest: object) -> None:
        assert self._proc is not None
        if self._proc.stdin is not None:
            self._proc.stdin.close()
        code = self._proc.wait()
        # Don't mask an in-progress exception; only raise on a clean path.
        if code != 0 and exc_type is None:
            raise RuntimeError(f"ffmpeg exited with code {code}")
