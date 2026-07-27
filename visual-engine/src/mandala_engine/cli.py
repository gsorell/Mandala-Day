"""Command-line entry point.

    render geometry_of_attention

resolves ``presets/geometry_of_attention.json``, renders it, and writes an MP4
to ``output/``. Run ``render --help`` for the full set of flags.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .pipeline import UHD_4K, render
from .preset import Preset

# The project root is two levels up from this file (src/mandala_engine/cli.py).
PROJECT_ROOT = Path(__file__).resolve().parents[2]
PRESETS_DIR = PROJECT_ROOT / "presets"

# All outputs — finished renders and previews alike — land in the Desktop
# assets folder alongside Builds/Images. Override per-run with -o/--output.
OUTPUT_DIR = Path(r"C:\Users\gsore\Desktop\Mandala Day Assets\MP4 Outputs")


def _resolve_preset_path(name: str) -> Path:
    """Accept a bare preset name, a filename, or a path."""
    candidate = Path(name)
    if candidate.suffix == ".json" and candidate.exists():
        return candidate
    for guess in (PRESETS_DIR / f"{name}.json", PRESETS_DIR / name):
        if guess.exists():
            return guess
    raise SystemExit(
        f"Preset '{name}' not found. Looked in {PRESETS_DIR}. "
        f"Available: {', '.join(p.stem for p in PRESETS_DIR.glob('*.json')) or '(none)'}"
    )


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="render",
        description="Render a Mandala Day contemplative visual to MP4.",
    )
    p.add_argument("preset", help="Preset name (e.g. geometry_of_attention) or path.")
    p.add_argument("-o", "--output", help="Output MP4 path. Default: output/<preset>.mp4")

    p.add_argument("--width", type=int, default=UHD_4K[0])
    p.add_argument("--height", type=int, default=UHD_4K[1])
    p.add_argument("--fps", type=int, default=60)
    p.add_argument(
        "--duration",
        type=float,
        default=None,
        help="Duration in seconds. Default: audio length, else preset, else 600.",
    )

    p.add_argument(
        "--no-audio",
        action="store_true",
        help="Render silent video (ignore the preset's audio).",
    )
    p.add_argument("--crf", type=int, default=17, help="x264 quality (lower=better).")
    p.add_argument(
        "--x264-preset",
        default="slow",
        help="x264 speed/size tradeoff (ultrafast..veryslow).",
    )

    p.add_argument(
        "--preview",
        action="store_true",
        help="Fast low-res sanity check: 1280x720, 30fps, 20s, fast encode.",
    )
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    preset_path = _resolve_preset_path(args.preset)
    preset = Preset.from_file(preset_path)

    width, height, fps = args.width, args.height, args.fps
    duration = args.duration
    x264_preset = args.x264_preset

    if args.preview:
        width, height, fps = 1280, 720, 30
        duration = duration if duration is not None else 20.0
        x264_preset = "veryfast"

    output = Path(args.output) if args.output else OUTPUT_DIR / f"{preset.name}.mp4"

    render(
        preset,
        output,
        width=width,
        height=height,
        fps=fps,
        duration=duration,
        with_audio=not args.no_audio,
        crf=args.crf,
        x264_preset=x264_preset,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
