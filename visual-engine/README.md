# Mandala Day — Visual Engine

A reusable, preset-driven renderer for the visual identity of Mandala Day.

It does not make videos. It makes **one** kind of image — *a center without an
edge* — and then makes an endless family of them from a shared visual language.
A soft radial field of warm light gathered somewhere in a deep charcoal void.
No circle, no outline, no object. The center slowly migrates, the radius slowly
breathes, the interior is broken by slowly-evolving noise so the eye can never
find a boundary. Nothing loops. All motion is either continuous noise evolving
along a time axis, or sums of sinusoids with mutually irrational frequencies —
so the composition never returns to a previous state.

The engine is fixed. Each meditation is described entirely by a small JSON
**preset** plus an audio file. Adding a meditation is: drop in audio, write a
preset, run `render <name>`.

---

## Install

Requires **Python 3.10+**, **FFmpeg** (with `ffprobe`) on `PATH`, and a GPU /
OpenGL 3.3 driver.

```bash
cd visual-engine
python -m venv .venv
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
```

Optionally install the `render` console command:

```bash
pip install -e .
```

## Render the first meditation

Fast sanity check first (720p / 30fps / 20s, a few seconds to encode):

```bash
python render.py geometry_of_attention --preview
```

Then the real thing — 4K / 60fps, length matched exactly to the audio:

```bash
python render.py geometry_of_attention
```

Output lands in `C:\Users\gsore\Desktop\Mandala Day Assets\MP4 Outputs\` (set in
`cli.py`; override per-run with `-o`). If you ran `pip install -e .` you can use
`render geometry_of_attention` instead of `python render.py ...`.

> **Note:** a full 4K/60fps/10-minute render is 36,000 frames. It is GPU-bound
> on the shader and CPU-bound on the x264 encode; expect it to take a while.
> Use `--x264-preset medium` (or `veryfast`) to trade file size for speed while
> iterating, and the default `slow` for final delivery.

### Useful flags

| Flag | Purpose |
|---|---|
| `--preview` | 1280×720, 30fps, 20s, fast encode — for checking motion/color |
| `--duration 120` | Override length (seconds) |
| `--no-audio` | Render silent video |
| `--fps 30` | Frame rate |
| `--width / --height` | Custom resolution |
| `--crf 17` | x264 quality (lower = better/larger) |
| `--x264-preset slow` | x264 speed/size tradeoff |
| `-o path.mp4` | Custom output path |

---

## Adding a new meditation

1. Put the audio somewhere (e.g. the app's `assets/audio/`).
2. Copy `presets/geometry_of_attention.json` to `presets/<name>.json`.
3. Point `audio` at the file (path is resolved **relative to the preset file**)
   and set `name`.
4. Adjust the artistic parameters (see below). Give each preset a distinct
   `seed` so no two share a composition.
5. `python render.py <name>`

That's it. The renderer never changes.

## Preset parameters

Colors are sRGB hex (`"#0d1017"`) or `[r, g, b]` in 0..1. Everything else maps
directly onto a shader uniform.

| Key | Meaning |
|---|---|
| `name` | Output filename stem |
| `audio` | Audio path, relative to the preset file (or absolute) |
| `seed` | Offset into the noise fields — unique per preset |
| `background_color` | The void |
| `field_color` | The gathered warmth |
| `brightness` | Overall field gain |
| `field_radius` | Gaussian sigma (screen-height units) — how large the field is |
| `field_softness` | >1 broadens the falloff tail (softer edge) |
| `drift_speed` | How fast the center migrates |
| `drift_amount` | How far the center wanders |
| `breathing_amount` | Slow radius modulation depth |
| `time_scale` | Global rate at which the noise evolves |
| `noise_intensity` | Luminance texture depth inside the field |
| `warp_amount` | Domain-warp displacement strength |
| `warp_scale` | Domain-warp spatial frequency |
| `node_count` | Number of light nodes. `1` (default) = single field. `>1` = the field begins as that many scattered nodes and **coalesces** into one over the session — attention gathering |
| `node_spread` | How far the nodes start apart (only with `node_count > 1`) |
| `node_drift` | Gentle per-node wander before they gather |
| `coalesce_start` | Progress (0..1) at which gathering begins |
| `coalesce_end` | Progress (0..1) by which the nodes have fully merged |
| `vignette` | Edge darkening depth |
| `grain_amount` | Film grain depth |
| `duration` | Optional fixed length (seconds); omit to follow the audio |

Keep the values quiet. If a change is *obvious* in motion, it is probably too
much — the field should make a viewer unsure whether anything is changing.

**Coalescence** is progress-based (`u_time / duration`), so it always spans the
whole session regardless of length. To *see* it while tuning, render a short
clip — e.g. `python render.py geometry_of_attention --duration 45 --no-audio` —
which compresses the entire gathering into 45 seconds.
`presets/geometry_of_attention.json` is a worked example (5 nodes, seed 3).

---

## Architecture

```
visual-engine/
├── render.py                  # zero-install entry point
├── pyproject.toml             # installs the `render` command
├── requirements.txt
├── presets/
│   └── geometry_of_attention.json
├── output/                    # rendered MP4s (gitignored)
└── src/mandala_engine/
    ├── preset.py              # Preset dataclass: JSON -> uniforms
    ├── shader.py              # GLSL loading + #pragma include
    ├── renderer.py            # moderngl offscreen renderer (one frame at a time)
    ├── encoder.py             # FFmpeg H.264 + audio mux (streaming)
    ├── audio.py               # ffprobe duration
    ├── pipeline.py            # preset -> renderer -> encoder orchestration
    ├── cli.py                 # argparse front end
    └── shaders/
        ├── quad.vert          # fullscreen quad
        ├── field.frag         # THE visual — a center without an edge
        └── lib_noise.glsl     # simplex noise / fbm / hashing
```

**The shader is the visual identity.** Presets only re-parameterize it. When you
want a genuinely new *kind* of subtlety (field distortion, depth, soft color
drift, luminance texture), add it as an optional block in `field.frag` gated by
a new uniform that defaults to "off," then expose it as a preset key. The
renderer, encoder and pipeline should not need to change.
