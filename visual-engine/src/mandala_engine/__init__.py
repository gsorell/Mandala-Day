"""Mandala Day Visual Engine.

A reusable, preset-driven renderer for subtle contemplative visuals: a center
without an edge, evolving forever, never looping. The shader and pipeline are
fixed; each meditation is described entirely by a small JSON preset plus an
audio file.

Public API::

    from mandala_engine import Preset, render

    preset = Preset.from_file("presets/geometry_of_attention.json")
    render(preset, "output/geometry_of_attention.mp4")
"""

from __future__ import annotations

from .pipeline import render
from .preset import Preset
from .renderer import FieldRenderer

__all__ = ["Preset", "FieldRenderer", "render"]
__version__ = "1.0.0"
