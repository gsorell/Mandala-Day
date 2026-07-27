#version 330

// ---------------------------------------------------------------------------
// field.frag — the Mandala Day visual field
//
// A center without an edge. The image is a single soft radial field of warm
// light gathered somewhere near the middle of a deep charcoal/navy void. There
// is no circle, no outline, no object — only a Gaussian falloff whose center
// slowly migrates, whose radius slowly breathes, and whose luminance is broken
// up by slowly-evolving noise so that no edge can ever be located.
//
// Nothing here loops. All motion is driven either by continuous fbm evolving
// along a time axis, or by sums of sinusoids with mutually irrational-ish
// frequencies, so the composition never returns to a previous state.
//
// Every uniform below is an *artistic* parameter supplied by a preset. The
// shader itself is fixed; presets are what make one meditation differ from the
// next. Keep it that way.
// ---------------------------------------------------------------------------

in vec2 v_uv;
out vec4 f_color;

uniform vec2  u_resolution;      // pixels
uniform float u_time;            // seconds since start (monotonic, unbounded)
uniform float u_seed;            // per-preset offset into the noise fields

uniform vec3  u_bg_color;        // sRGB 0..1 — the void
uniform vec3  u_field_color;     // sRGB 0..1 — the gathered warmth

uniform float u_brightness;      // overall field gain
uniform float u_field_radius;    // Gaussian sigma, in screen-height units
uniform float u_field_softness;  // >1 broadens the tail (softer edge)

uniform float u_drift_speed;     // how fast the center migrates
uniform float u_drift_amount;    // how far the center may wander

uniform float u_breathing_amount;// slow radius modulation depth
uniform float u_noise_intensity; // luminance texture depth within the field
uniform float u_time_scale;      // global rate at which noise evolves

uniform float u_warp_amount;     // domain-warp displacement strength
uniform float u_warp_scale;      // domain-warp spatial frequency

uniform float u_vignette;        // edge darkening depth (0 = none)
uniform float u_grain_amount;    // film grain depth

// --- Coalescence ---------------------------------------------------------
// The field can begin as several disparate nodes of light that gradually
// gather into one over the course of the session — attention settling. With
// u_node_count == 1 none of this is active and the visual is a single field.
uniform float u_duration;        // total session length (s); 0 = unknown
uniform int   u_node_count;      // number of light nodes (1 = single field)
uniform int   u_node_layout;     // 0 = random scatter, 1 = vertical column
uniform float u_node_spread;     // how far the nodes are placed apart
uniform float u_node_drift;      // gentle per-node wander
uniform float u_coalesce_start;  // progress (0..1) at which gathering begins
uniform float u_coalesce_end;    // progress (0..1) by which it completes
uniform float u_reverse;         // 0 = gather over session, 1 = disperse (dissolve)

// --- Settle & expand -----------------------------------------------------
// Optional, progress-driven "arrival" moves, sharing the same session curve as
// coalescence. The field can begin lifted and contracted and, over the session,
// settle to center and broaden to full size — presence descending into the body
// and filling it. Both default to 0 (no effect).
uniform float u_settle_rise;     // initial vertical lift, in screen-height units
uniform float u_expand;          // initial contraction (0..1) that grows to full

// --- Sway & clarify ------------------------------------------------------
// Two more optional, independent motions (default 0 = off).
//  sway    — a slow lateral tide, the whole field carried side to side.
//  clarify — a one-way "veil lifting": as the session curve advances, the
//            domain warp and interior noise recede and the field brightens,
//            reading as a single clarifying shift rather than continuous drift.
uniform float u_sway;            // lateral swell amplitude (screen-height units)
uniform float u_clarify;         // 0..1 haze-clearing depth, rides the session curve

// Upper bound for the (dynamically-bounded) node loop.
const int MAX_NODES = 12;

#pragma include "lib_noise.glsl"

vec3 srgb_to_linear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
vec3 linear_to_srgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

void main() {
    // Aspect-correct, screen-height-normalized coordinates centered at (0,0).
    vec2 uv = v_uv - 0.5;
    uv.x *= u_resolution.x / u_resolution.y;

    float seed = u_seed * 13.0;
    // Slow global evolution time for the noise fields.
    float T = u_time * u_time_scale;

    // --- Session curve ----------------------------------------------------
    // Progress through the whole session (0..1) and the curve every progress-
    // driven motion rides. coalesce == 0 -> start of the move; == 1 -> end.
    // `gather` flips it for reverse (dissolve) presets.
    float progress = (u_duration > 0.0) ? clamp(u_time / u_duration, 0.0, 1.0) : 0.0;
    float coalesce = smoothstep(u_coalesce_start, u_coalesce_end, progress);
    float gather = mix(coalesce, 1.0 - coalesce, u_reverse);
    float multi = (u_node_count > 1) ? 1.0 : 0.0;
    float clarify = u_clarify * gather;   // haze-clearing amount, 0..u_clarify

    // --- Field migration --------------------------------------------------
    // The slow drift shared by the whole field (or the whole constellation of
    // nodes). Sum of sinusoids with mutually irrational-ish frequencies:
    // bounded, but never periodic on any human timescale. Feels like drift,
    // not animation.
    float ds = u_drift_speed;
    vec2 commonCenter = vec2(
        sin(u_time * 0.0170 * ds + 0.0) +
        0.55 * sin(u_time * 0.0091 * ds + 1.3) +
        0.30 * sin(u_time * 0.0043 * ds + 4.1),
        cos(u_time * 0.0131 * ds + 0.7) +
        0.55 * cos(u_time * 0.0071 * ds + 2.7) +
        0.30 * sin(u_time * 0.0037 * ds + 5.2));
    commonCenter *= u_drift_amount * 0.5;

    // Lateral swell: a slow tide carrying the whole field side to side. Two
    // mutually irrational frequencies so it never settles into a metronome.
    commonCenter.x += u_sway * (sin(u_time * 0.021) + 0.4 * sin(u_time * 0.013 + 1.0));

    // --- Domain warp ------------------------------------------------------
    // Displace the sampling position by a low-frequency vector noise so the
    // field gently reorganizes rather than merely translating.
    vec2 wp = uv * u_warp_scale + seed;
    vec2 warp = vec2(
        fbm(vec3(wp, T * 0.6)),
        fbm(vec3(wp + 5.2, T * 0.6)));
    // The warp recedes as the field clarifies (the veil lifting).
    vec2 sp = uv + warp * u_warp_amount * (1.0 - clarify);

    // --- Breathing radius -------------------------------------------------
    float breathe = 1.0 + u_breathing_amount * fbm(vec3(seed, seed, T * 0.25));
    float sigma = max(u_field_radius * breathe, 1e-3);

    // --- Soft radial field(s) (no hard edge, ever) ------------------------
    // Settle & expand ride the session curve: lifted+contracted at the start,
    // arriving at centered+full by the end. With the defaults (0) these are
    // no-ops, so a preset that doesn't use them is unaffected.
    commonCenter.y += u_settle_rise * (1.0 - gather);
    sigma *= mix(1.0 - u_expand, 1.0, gather);

    float invExp = 2.0 / max(u_field_softness, 1e-3);

    // Union of the node Gaussians. We accumulate a soft p-norm union (blobs
    // melt together with no crease and no dark seam) and, separately, the peak
    // single node. As the field coalesces we cross-fade from the p-norm union
    // to the peak: at full coalescence every node sits on commonCenter, so the
    // peak *is* the single approved field — the end state is identical to a
    // one-node render, with no brightness build-up from stacking.
    const float P = 3.0;   // p-norm exponent: higher -> closer to a hard max
    float acc = 0.0;       // Σ nodeField^P
    float peak = 0.0;      // max nodeField
    for (int i = 0; i < MAX_NODES; i++) {
        if (i >= u_node_count) break;
        float fi = float(i);
        vec2 place;
        if (u_node_layout == 1) {
            // Vertical column: centers evenly stacked along the axis, held in
            // place — a channel of persistent centers that never merge.
            float t = (u_node_count > 1) ? (fi / float(u_node_count - 1) - 0.5) * 2.0 : 0.0;
            place = vec2(0.0, t * u_node_spread);
        } else {
            // Fully random, seed-driven scatter: independent random x and y per
            // node. No ring, no even angular spacing, no empty center — the
            // nodes land wherever, some centrally, some out toward the edges,
            // as scattered attention would. Change `seed` to reshuffle.
            place = u_node_spread * vec2(
                hash21(vec2(fi * 1.7 + 0.5, u_seed)) * 2.0 - 1.0,
                hash21(vec2(fi * 2.3 + 9.0, u_seed * 1.3 + 4.0)) * 2.0 - 1.0);
        }
        vec2 ndrift = vec2(sin(u_time * 0.019 * ds + fi * 1.7),
                           cos(u_time * 0.017 * ds + fi * 2.3)) * u_node_drift;
        // Dispersion fades as the field gathers (or grows as it disperses).
        vec2 nodePos = commonCenter + (place + ndrift) * (1.0 - gather) * multi;

        float d = length(sp - nodePos);
        float nodeField = exp(-pow(d / sigma, invExp));
        acc += pow(nodeField, P);
        peak = max(peak, nodeField);
    }
    float unionField = pow(acc, 1.0 / P);
    float field = mix(unionField, peak, gather);

    // Luminance texture: break the field's interior with evolving noise so the
    // eye can never settle on a boundary. Its depth also recedes as the field
    // clarifies, so the interior smooths out along with the warp.
    float tex = fbm(vec3(sp * 3.0 + seed, T * 0.5));
    field *= 1.0 + u_noise_intensity * (1.0 - clarify) * tex;

    // Very slow global brightness fluctuation — "is it getting brighter?" — plus
    // a gentle lift as the field clarifies.
    float glow = 1.0 + 0.15 * fbm(vec3(1.7 + seed, 2.3, T * 0.2));
    field = max(field, 0.0) * u_brightness * glow * (1.0 + 0.25 * clarify);

    // --- Compose in linear light -----------------------------------------
    vec3 bg = srgb_to_linear(u_bg_color);
    vec3 fg = srgb_to_linear(u_field_color);
    vec3 col = bg + fg * field;         // additive warmth over the void

    // Gentle vignette so the void deepens toward the frame edges.
    float r = length(uv);
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.15, r);

    // Back to display space.
    col = linear_to_srgb(col);

    // Film grain — evolves every frame, never static.
    float g = hash21(gl_FragCoord.xy + T * 60.0) - 0.5;
    col += g * u_grain_amount;

    // Ordered-ish hash dithering to kill 8-bit banding across the huge, dark,
    // extremely shallow gradients. Essential on charcoal backgrounds.
    float dith = (hash21(gl_FragCoord.xy * 1.37 + 7.0) - 0.5) / 255.0;
    col += dith;

    f_color = vec4(clamp(col, 0.0, 1.0), 1.0);
}
