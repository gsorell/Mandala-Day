# The Play Fort — Studio Master

- **Audience:** children (bedtime)
- **Title:** *The Play Fort* (composed as "Pillow Fort"; retitled at render).
- **Status:** **rendered at 6:47** — author confirms the render matches this score
  verbatim (no edits), so the score below is the exact wording of record. Encoded to
  `assets/audio/the-play-fort.mp3` (64k mono, quality guard ok). **Not yet wired into the app.**
- **Target length:** ~7 min — **met (6:47).** Composing lean up front (~44 spoken lines
  vs. First Snow's ~55, which rendered 9:09) landed it on target without the ~30% overshoot.

## Blueprint

- **Subject:** the small, safe world of a child's own pillow fort at the end of the day —
  a made world that is nonetheless alive and moving on its own.
- **Environment:** the inside of a pillow fort in a dark, quiet room (the house beyond it
  continuing safely). A *resting gaze* (like "Where the Stars Turn"), not a traveling
  thread — the listener stays inside the fort; the world's small motions come to them.
- **Home:** inside the fort. **Anchor:** the little lantern glowing on the floor — the sun
  of this small world; everything else is seen by its light, and the gaze keeps returning
  to it.
- **Guiding thread:** the deepening quiet of the room. Gaze rests on the lantern, lifts to
  the blanket roof, into the beam, to the corner, to the doorway and the house beyond.
- **Six recurring elements:** lantern (anchor) · blanket roof (rises/settles = breath) ·
  dust motes in the beam (appear/fade) · the little bear in the corner (the steady one) ·
  the cat at the doorway (peek-a-boo — looks in, leaves, returns and settles) · the house
  beyond (a soft sound, a passing shadow — the world continuing safely = care).
- **The mirror, kept implicit (Vol I):** the roof lifting and settling is the breath; the
  dust drifting into light and out, and the shadow crossing the wall, are thoughts arising
  and passing; the cat leaving and coming back is the peek-a-boo that *is* the care; the
  house sounds softening is the settling toward sleep. None named.
- **Earned language, on budget (Vol IV):** one rhetorical question — "Can you see them
  drifting there?" (dust motes, second half, rides a real motion, unanswered → silence) —
  and one metaphor — the lantern "like a small moon held inside the blanket" (late, simple,
  hooked to something a child knows). Non-adjacent.
- **Three passes:** *Introduce* (meet each element once) · *Deepen* (revisit — the light
  lends its gold to everything; the roof-breath slows; the dust question; a shadow crosses
  and clears; the cat returns and settles) · *Whole* (gather in echoed 2.5s beats → one
  12s immersion → return to the opening image → trademark close).

## Score

```
<break time="1.5s"/>

In a dark and quiet room, a small fort glows beneath a draped blanket.

<break time="4s"/>

A little lantern stands on the floor inside, glowing softly.

<break time="3s"/>

Above, the blanket roof sags gently between two chairs.

<break time="3s"/>

A breath of air drifts through the room.

<break time="2.5s"/>

The roof lifts a little...

<break time="2.5s"/>

then settles down again.

<break time="6s"/>

In the lantern's beam, tiny specks of dust rise and turn.

<break time="3s"/>

One drifts slowly up through the light...

<break time="2.5s"/>

past the edge, and out of sight.

<break time="6s"/>

In the corner, a small stuffed bear sits very still.

<break time="3s"/>

The warm light rests on its soft, round face.

<break time="6s"/>

Where the blanket meets the floor, a small doorway opens to the dark room beyond.

<break time="3s"/>

A soft sound drifts from somewhere in the house, then fades into quiet.

<break time="5s"/>

At the little doorway, a cat looks in.

<break time="3s"/>

Then it slips back out into the dark.

<break time="7s"/>

The little lantern glows on, steady and warm.

<break time="3s"/>

Its light spills across the blanket walls, and every fold turns the same warm gold.

<break time="6s"/>

The roof stirs once more as the air moves through.

<break time="3s"/>

It rises slowly...

<break time="2.5s"/>

and sinks back down, slower still.

<break time="7s"/>

More specks of dust turn in the beam.

<break time="3s"/>

They float high, and low, and high again.

<break time="3s"/>

Can you see them drifting there?

<break time="6s"/>

A shadow slides across the blanket wall.

<break time="3s"/>

Someone has walked past, far off in the house.

<break time="3s"/>

The shadow slips away...

<break time="2.5s"/>

and the wall glows warm again.

<break time="7s"/>

At the doorway, the cat returns.

<break time="3s"/>

It steps inside, soft and slow.

<break time="3s"/>

It curls up close beside the bear...

<break time="2.5s"/>

and goes still.

<break time="8s"/>

The little lantern glows like a small moon held inside the blanket.

<break time="8s"/>

The lantern glows warm at the center.

<break time="2.5s"/>

The roof rests softly overhead.

<break time="2.5s"/>

The specks of dust drift slow through the fading light.

<break time="2.5s"/>

The little bear sits still in the corner.

<break time="2.5s"/>

The cat sleeps curled close beside it.

<break time="2.5s"/>

And beyond the doorway, the whole house has gone quiet.

<break time="12s"/>

Seen together, the small fort glows softly in the dark, still room.

<break time="8s"/>

A breath of air drifts through the room.

<break time="3s"/>

The roof lifts...

<break time="3s"/>

and settles.

<break time="4s"/>

A speck of dust rises through the light...

<break time="3s"/>

and is gone.

<break time="10s"/>

And the whole little fort drifts into the soft, deep night.

<break time="1.5s"/>
```

## Next steps

- **Done:** rendered (6:47), encoded to `assets/audio/the-play-fort.mp3` (64k mono),
  `CHECKSUMS.sha256` refreshed, quality guard passed (−0.4/−0.3/−0.2 dB vs. master).
- **To ship into the app (§0, not yet done):** screen (clone Geometry) · route · type ·
  Extras row · History meta (`extra_play_fort`, 2-letter abbr e.g. `PF`) · YouTube visual
  preset · version bump + builds. See repo `CLAUDE.md`.
