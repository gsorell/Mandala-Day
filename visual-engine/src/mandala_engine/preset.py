"""Preset loading and validation.

A preset is a small JSON file of *artistic* parameters. It is the only thing
that differs between one meditation and the next; the renderer and shaders are
fixed. See ``presets/geometry_of_attention.json`` for a worked example and
``Preset`` below for the full set of fields and their defaults.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any, Sequence

Color = tuple[float, float, float]


def _parse_color(value: Any) -> Color:
    """Accept ``"#rrggbb"`` (sRGB hex) or ``[r, g, b]`` floats in 0..1."""
    if isinstance(value, str):
        s = value.lstrip("#")
        if len(s) != 6:
            raise ValueError(f"Hex color must be 6 digits, got {value!r}")
        return tuple(int(s[i : i + 2], 16) / 255.0 for i in (0, 2, 4))  # type: ignore[return-value]
    if isinstance(value, Sequence) and len(value) == 3:
        return tuple(float(c) for c in value)  # type: ignore[return-value]
    raise ValueError(f"Cannot parse color from {value!r}")


@dataclass
class Preset:
    """The complete artistic description of one visual.

    Colors are given in the JSON as sRGB hex strings (``"#0d1017"``) or as
    ``[r, g, b]`` lists in 0..1, and are normalized to float triples on load.
    Every numeric field maps directly onto a ``u_*`` uniform in ``field.frag``.
    """

    # Identity / assets ------------------------------------------------------
    name: str = "untitled"
    #: Audio file path, resolved relative to the preset file's directory.
    audio: str | None = None
    #: Offset into the noise fields, so two presets never share a composition.
    seed: float = 0.0

    # Palette ----------------------------------------------------------------
    background_color: Color = (0.051, 0.063, 0.090)  # deep charcoal/navy
    field_color: Color = (0.702, 0.525, 0.235)       # warm brass

    # Field shape ------------------------------------------------------------
    brightness: float = 0.90
    field_radius: float = 0.32       # Gaussian sigma in screen-height units
    field_softness: float = 1.15     # >1 softens the tail

    # Motion -----------------------------------------------------------------
    drift_speed: float = 1.0         # rate the center migrates
    drift_amount: float = 0.18       # how far the center wanders
    breathing_amount: float = 0.20   # radius modulation depth
    time_scale: float = 0.05         # global noise evolution rate

    # Texture / warp ---------------------------------------------------------
    noise_intensity: float = 0.35    # luminance texture depth
    warp_amount: float = 0.25        # domain-warp strength
    warp_scale: float = 1.10         # domain-warp spatial frequency

    # Coalescence ------------------------------------------------------------
    # Optional. With node_count == 1 the visual is a single field (default) and
    # none of these have any effect. With node_count > 1 the field begins as
    # that many disparate nodes of light and gathers into one over the session
    # — attention settling. coalesce_start/end are fractions of progress (0..1).
    node_count: int = 1
    node_layout: int = 0             # 0 = random scatter, 1 = vertical column
    node_spread: float = 0.55        # how far the nodes are placed apart
    node_drift: float = 0.12         # gentle per-node wander
    coalesce_start: float = 0.0      # progress at which gathering begins
    coalesce_end: float = 0.65       # progress by which it completes
    reverse: float = 0.0             # 0 = gather over session, 1 = disperse (dissolve)

    # Settle & expand (optional "arrival" moves, same session curve). Both
    # default to 0 (no effect). settle_rise lifts the field up at the start so
    # it descends to center; expand starts it contracted so it grows to full.
    settle_rise: float = 0.0         # initial vertical lift (screen-height units)
    expand: float = 0.0              # initial contraction 0..1 that grows to full

    # Sway & clarify (both optional, default 0 = off).
    sway: float = 0.0                # lateral swell amplitude (screen-height units)
    clarify: float = 0.0             # 0..1 haze-clearing depth, rides the session curve

    # Finishing --------------------------------------------------------------
    vignette: float = 0.35           # edge darkening depth
    grain_amount: float = 0.020      # film grain depth

    #: Optional fixed duration in seconds. When ``None`` the render length is
    #: taken from the audio file (or the CLI ``--duration`` flag).
    duration: float | None = None

    # ------------------------------------------------------------------------
    @classmethod
    def from_file(cls, path: str | Path) -> "Preset":
        path = Path(path)
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls.from_dict(data, base_dir=path.parent, default_name=path.stem)

    @classmethod
    def from_dict(
        cls,
        data: dict[str, Any],
        *,
        base_dir: Path | None = None,
        default_name: str | None = None,
    ) -> "Preset":
        known = {f.name for f in fields(cls)}
        unknown = set(data) - known
        if unknown:
            raise ValueError(
                f"Unknown preset keys: {', '.join(sorted(unknown))}. "
                f"Valid keys: {', '.join(sorted(known))}"
            )

        kwargs: dict[str, Any] = dict(data)
        for key in ("background_color", "field_color"):
            if key in kwargs:
                kwargs[key] = _parse_color(kwargs[key])

        preset = cls(**kwargs)
        if default_name and "name" not in data:
            preset.name = default_name
        # Resolve the audio path relative to the preset's own directory.
        if preset.audio and base_dir is not None:
            audio_path = Path(preset.audio)
            if not audio_path.is_absolute():
                preset.audio = str((base_dir / audio_path).resolve())
        return preset

    def uniforms(self) -> dict[str, Any]:
        """Map preset fields onto shader uniform names.

        Only the artistic fields are returned; ``u_resolution`` and ``u_time``
        are supplied per-frame by the renderer.
        """
        return {
            "u_seed": self.seed,
            "u_bg_color": self.background_color,
            "u_field_color": self.field_color,
            "u_brightness": self.brightness,
            "u_field_radius": self.field_radius,
            "u_field_softness": self.field_softness,
            "u_drift_speed": self.drift_speed,
            "u_drift_amount": self.drift_amount,
            "u_breathing_amount": self.breathing_amount,
            "u_time_scale": self.time_scale,
            "u_noise_intensity": self.noise_intensity,
            "u_warp_amount": self.warp_amount,
            "u_warp_scale": self.warp_scale,
            "u_node_count": int(self.node_count),
            "u_node_layout": int(self.node_layout),
            "u_node_spread": self.node_spread,
            "u_node_drift": self.node_drift,
            "u_coalesce_start": self.coalesce_start,
            "u_coalesce_end": self.coalesce_end,
            "u_reverse": self.reverse,
            "u_settle_rise": self.settle_rise,
            "u_expand": self.expand,
            "u_sway": self.sway,
            "u_clarify": self.clarify,
            "u_vignette": self.vignette,
            "u_grain_amount": self.grain_amount,
        }
