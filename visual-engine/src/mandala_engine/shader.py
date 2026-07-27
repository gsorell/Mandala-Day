"""Shader source loading and ``#pragma include`` resolution.

Core-profile GLSL has no include mechanism, so we implement a tiny one: a line
of the form ``#pragma include "file.glsl"`` is replaced by the contents of that
file (looked up next to the including shader). Includes are resolved once, are
not recursive, and are guarded against double-inclusion within a single file.
"""

from __future__ import annotations

import re
from pathlib import Path

SHADER_DIR = Path(__file__).parent / "shaders"

_INCLUDE_RE = re.compile(r'^\s*#pragma\s+include\s+"([^"]+)"\s*$', re.MULTILINE)


def load_shader(name: str) -> str:
    """Load a shader by filename (e.g. ``"field.frag"``), resolving includes."""
    path = SHADER_DIR / name
    source = path.read_text(encoding="utf-8")
    included: set[str] = set()

    def _replace(match: re.Match[str]) -> str:
        inc_name = match.group(1)
        if inc_name in included:
            return ""  # already pulled in; avoid duplicate definitions
        included.add(inc_name)
        return (SHADER_DIR / inc_name).read_text(encoding="utf-8")

    return _INCLUDE_RE.sub(_replace, source)
