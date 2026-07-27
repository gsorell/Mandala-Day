#!/usr/bin/env python
"""Convenience entry point so the tool runs without installation.

    python render.py geometry_of_attention

Equivalent to the installed ``render`` console script. Adds ``src/`` to the
path so ``mandala_engine`` imports cleanly from a checkout.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from mandala_engine.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
