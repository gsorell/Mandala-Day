# The Sleeping City — Studio Master (draft)

- **Audience:** children (bedtime)
- **Title:** **The City of Lights** (retitled from the working title *The Sleeping City* at
  render). The script never names New York — the yellow cab, the steam grate, the wooden
  water towers and the lit bridge over the river make it unmistakable without breaking the
  trance a proper noun would break.
- **Status:** **rendered and wired into the app.** Runs **7:42.3** (rendered ~10% over the
  ~7:00 target — a fine bedtime length, shipped as-is). Encoded to
  `assets/audio/the-city-of-lights.mp3` (64k mono; quality guard −0.4/−0.3/−0.2 dB vs.
  master). Wired into the app: screen `CityOfLightsScreen.tsx` · route `CityOfLights` ·
  type · Extras row ("8 min guided") · History meta `extra_city_of_lights` (abbr `CL`).
  **Not yet:** YouTube visual preset, version bump + builds.

## Blueprint

- **Subject:** a great city at night, seen from a high window, *emptying and going dark* —
  a loud world made gentle and still, the child safe and high above it while it goes to
  sleep. The whole motion is toward stillness; that is what makes an urban scene a true
  bedtime piece rather than a stimulating one.
- **Environment / gaze:** a **resting gaze** from a high open window (like Where the Stars
  Turn / Play Fort / Firefly) — the listener stays at the window; the gaze glides from near
  (the curtain, the room's reflection) outward across the rooftops to the bridge and river,
  and back. The city's real, slow motions of settling come to it.
- **Home:** the high window. **Anchor:** far off, the tallest tower with a small **red
  light blinking slow and steady** at its very top — the one light that never goes out, the
  skyline's slow pulse; the gaze returns to it, and it carries the whole piece's care
  register (the steady watcher, like the owl). True to real aviation beacons.
- **Guiding thread:** the deepening quiet of the city. Curtain → the windows opposite going
  dark → the street below → the bridge and the river → the rooftops → back to the window.
- **Five elements + the red-light anchor:** the **curtain** in the open window (lifts on the
  night air, settles = breath, unnamed) · the **lighted windows opposite** (go dark one by
  one; one glows on a while, then dark = the city sleeping + peek-a-boo, resolved in Deepen
  as the last lit window) · the **street below** (a single yellow taxi slides past and turns
  away, gone; soft steam rises from a grate and comes apart = movement→stillness, and rising
  /dissolving) · the **bridge and river** (lights strung over the water, doubled in the black
  river; a **small bright boat** crosses, slips under the bridge into the dark and out again
  = the roamer / peek-a-boo, and at the close comes to rest among the far still lights = the
  return-and-settle beat) · the **rooftop pigeons** (tucked in a row; one shifts, then folds
  back in = the last restless one settling, the monkey/First-Snow-bird analog).
- **The mirror, kept implicit (Vol I):** the curtain lifting and settling is the breath; the
  windows going dark, the steam coming apart, the boat slipping under the bridge and out are
  thoughts arising and passing; the pigeon shifting and going still is the mind settling; the
  city emptying is the settling toward sleep; the red light keeping steady watch is the care.
  None named.
- **The return-and-settle beat (successor to the zoo's otters / Firefly's firefly + rabbit):**
  the **boat** is the roamer — crossing the river and slipping under the bridge into the dark
  and out again is its *true* behavior, no invention. At the close it comes to rest at the far
  shore, its light joining the far lights already still — settling among the steady ones.
- **Earned language, on budget (Vol IV):** one rhetorical question — "Can you follow it all
  the way across?" (the boat, ~65% in, rides its real crossing motion, unanswered → silence)
  — and one metaphor — the whole city glowing below "like a sky full of stars turned the
  other way up" (late, simple, hooked to stars a child knows; the emotional core of the
  high-window view). Non-adjacent.
- **Three passes:** *Introduce* (gaze travels near → far, meeting each element once) ·
  *Deepen* (the night deepens, the city empties further — the last lit window goes dark, the
  boat crosses and settles at the far shore, the curtain-breath slows, the red light still
  blinks) · *Whole* (the upside-down-stars metaphor → gather in echoed 2.5s beats → one 12s
  immersion → return to the open window and the red light → trademark close).

## Score

```
<break time="1.5s"/>

Far below the window, the great city glows in the dark.

<break time="4s"/>

In the open window, a thin curtain lifts in the night air.

<break time="2.5s"/>

It rises softly...

<break time="2.5s"/>

then settles back against the sill.

<break time="5s"/>

Far off, the tallest tower stands high against the sky.

<break time="3s"/>

At its very top, a small red light blinks slow, and steady.

<break time="6s"/>

Across the way, a tall building is full of lighted windows.

<break time="4s"/>

One by one, the little windows go dark.

<break time="3s"/>

Here and there, one still glows warm and gold.

<break time="6s"/>

Far down in the street, a single yellow taxi slides past.

<break time="3s"/>

It turns a corner, and is gone.

<break time="5s"/>

Soft white steam rises from a grate in the street.

<break time="3s"/>

It drifts up into the dark, and comes apart.

<break time="6s"/>

Beyond the rooftops, a great bridge crosses the dark river.

<break time="4s"/>

Its long strings of lights hang glowing over the water.

<break time="3s"/>

And every light shines again in the black river below.

<break time="6s"/>

A small bright boat moves slowly across the water.

<break time="3s"/>

It slips beneath the bridge, into the dark...

<break time="2.5s"/>

then out the other side, small and bright.

<break time="6s"/>

On the near rooftops, the wooden water towers stand quiet.

<break time="4s"/>

Along one ledge, a row of pigeons is tucked close together.

<break time="3s"/>

One shifts a little...

<break time="2.5s"/>

then folds back in among the rest.

<break time="7s"/>

The night grows deeper now, and the city grows still.

<break time="6s"/>

Across the way, one last window still glows warm.

<break time="3s"/>

Then it, too, goes dark.

<break time="7s"/>

The small boat crosses the wide, dark river.

<break time="3s"/>

Its light slides slowly toward the far shore.

<break time="3s"/>

Can you follow it all the way across?

<break time="6s"/>

It comes to rest among the far, quiet lights.

<break time="7s"/>

The thin curtain lifts once more in the cool night air.

<break time="3s"/>

It rises slowly...

<break time="2.5s"/>

and settles, slower now, against the sill.

<break time="7s"/>

Far off, the small red light still blinks, slow and steady.

<break time="8s"/>

Seen from up here, the whole city glows below, like a sky full of stars turned the other way up.

<break time="8s"/>

The thin curtain rests still in the open window.

<break time="2.5s"/>

Across the way, every window has gone dark.

<break time="2.5s"/>

Far below, the empty street lies quiet.

<break time="2.5s"/>

The bridge lights glow doubled on the black river.

<break time="2.5s"/>

The small boat rests among the far, still lights.

<break time="2.5s"/>

On the rooftops, the pigeons sleep tucked in a row.

<break time="12s"/>

Seen together, the whole city rests, quiet and dark below.

<break time="8s"/>

In the open window, the thin curtain lifts...

<break time="3s"/>

and settles.

<break time="4s"/>

Far off, the small red light blinks on...

<break time="3s"/>

and off, slow and steady.

<break time="10s"/>

And the whole quiet city

 drifts into the soft, deep night.

<break time="1.5s"/>
```

> The closing line is split by an **untagged blank line** — the closing caesura. See
> [../NOTATION.md](../NOTATION.md).

## Next steps

- **Render** the score through ElevenLabs, **measure**, and adjust to ~7:00 (composed lean
  at ~47 lines; if it lands long, trim a couple of Introduce beats — don't cut the Deepen).
  Then encode to `assets/audio/the-sleeping-city.mp3` (64k mono, libmp3lame), refresh
  `CHECKSUMS.sha256`, run the quality guard.
- **Transcribe** the render (`scripts/transcribe.py`) into `transcripts/the-sleeping-city.txt`.
- **Ship into the app (repo `CLAUDE.md` §0):** screen (clone Geometry) · route · type ·
  Extras row · History meta (`extra_sleeping_city`, 2-letter abbr e.g. `SC`) · YouTube
  visual preset · version bump + builds.
```
