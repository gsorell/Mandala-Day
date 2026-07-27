"""Offscreen GPU renderer.

Renders the fixed ``field.frag`` shader into an offscreen framebuffer at an
arbitrary resolution and hands back raw RGB bytes for one frame at a time. The
renderer holds no notion of duration, audio or encoding — it only knows how to
draw the visual at a given time ``t``. That separation keeps it reusable.
"""

from __future__ import annotations

from typing import Any

import moderngl
import numpy as np

from .preset import Preset
from .shader import load_shader


class FieldRenderer:
    """A reusable offscreen renderer for a single preset.

    Parameters
    ----------
    preset:
        The artistic parameters to draw. Its uniforms are applied once at
        construction (they do not change over the course of a render).
    width, height:
        Output resolution in pixels.
    duration:
        Total session length in seconds. Drives session progress (``u_time /
        u_duration``) for time-based effects such as node coalescence. Pass 0
        if unknown; progress is then treated as 0 throughout.
    """

    def __init__(
        self,
        preset: Preset,
        width: int,
        height: int,
        duration: float = 0.0,
    ) -> None:
        self.preset = preset
        self.width = width
        self.height = height
        self.duration = duration

        # A standalone context has no window; it renders purely offscreen using
        # whatever GPU backend moderngl can find (WGL on Windows).
        self.ctx = moderngl.create_standalone_context()

        self.program = self.ctx.program(
            vertex_shader=load_shader("quad.vert"),
            fragment_shader=load_shader("field.frag"),
        )

        # Two triangles as a strip covering clip space [-1, 1]^2.
        quad = np.array(
            [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0],
            dtype="f4",
        )
        self.vbo = self.ctx.buffer(quad.tobytes())
        self.vao = self.ctx.vertex_array(
            self.program, [(self.vbo, "2f", "in_pos")]
        )

        # Single RGB render target. 3 components: we never need alpha here.
        self.fbo = self.ctx.simple_framebuffer((width, height), components=3)

        self._set_static_uniforms()

    # ------------------------------------------------------------------ #
    def _set_uniform(self, name: str, value: Any) -> None:
        """Set a uniform if the program actually declares it.

        Uniforms that are unused get optimized out by the GLSL compiler, so we
        silently skip anything the program doesn't expose. This lets presets
        carry parameters a given shader may ignore.
        """
        member = self.program.get(name, None)
        if member is not None:
            member.value = value  # type: ignore[union-attr]

    def _set_static_uniforms(self) -> None:
        self._set_uniform("u_resolution", (float(self.width), float(self.height)))
        self._set_uniform("u_duration", float(self.duration))
        for name, value in self.preset.uniforms().items():
            self._set_uniform(name, value)

    # ------------------------------------------------------------------ #
    def render_frame(self, t: float) -> bytes:
        """Render the visual at time ``t`` (seconds) and return RGB bytes.

        The returned buffer is ``width * height * 3`` bytes, row-major, with the
        first row corresponding to the bottom of the image (OpenGL convention).
        The encoder is responsible for the vertical flip.
        """
        self._set_uniform("u_time", float(t))
        self.fbo.use()
        self.ctx.clear(0.0, 0.0, 0.0, 1.0)
        self.vao.render(moderngl.TRIANGLE_STRIP)
        return self.fbo.read(components=3, alignment=1)

    def release(self) -> None:
        """Free GPU resources. Safe to call more than once."""
        for obj in (self.vao, self.vbo, self.fbo, self.program, self.ctx):
            try:
                obj.release()
            except Exception:
                pass

    def __enter__(self) -> "FieldRenderer":
        return self

    def __exit__(self, *exc: object) -> None:
        self.release()
