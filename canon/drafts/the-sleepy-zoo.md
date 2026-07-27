# The Sleepy Zoo — Studio Master (draft)

- **Audience:** children (bedtime)
- **Title:** *The Sleepy Zoo* (working title — alternates: *The Zoo at Dusk*, *When the
  Zoo Grows Quiet*. Retitle at render if desired, as Play Fort was.)
- **Status:** **rendered and wired into the app.** Runs **7:36.8** (rendered ~9% over the
  ~7:00 target — a fine bedtime length, shipped as-is). Encoded to
  `assets/audio/the-sleepy-zoo.mp3` (64k mono; quality guard −0.4/−0.2/−0.2 dB vs. master).
  Wired into the app: screen `SleepyZooScreen.tsx` · route `SleepyZoo` · type · Extras row
  ("8 min guided") · History meta `extra_sleepy_zoo` (abbr `SZ`). **Not yet:** YouTube
  visual preset, version bump + builds.

## Blueprint

- **Subject:** a zoo at closing time, dusk deepening into night — a whole small world of
  animals each settling down to sleep in its own true way, the dark made gentle and safe.
- **Environment:** the winding zoo path at dusk, lamps coming on, a round moon rising over
  the dark trees. A **traveling thread** (like The Quiet Marsh's creek), *not* a resting
  gaze — the path carries the viewpoint in past each enclosure, then turns and carries it
  back toward the gate as full night falls. A deliberate change from the last three
  resting-gaze pieces (Stars / Play Fort / Firefly).
- **Home:** the zoo path from the gate. **Anchor:** the round moon rising over the zoo (and
  the warm lamp at the gate) — the steady light returned to; the moon climbs higher as the
  night deepens, so time accumulates indirectly.
- **Guiding thread:** the deepening quiet of the zoo. The path travels in — elephant,
  giraffes, otter pool, monkeys, owl — then turns back toward the gate, revisiting each now
  deeper asleep as the lamps glow and the moon climbs.
- **Five animals + the moon/lamp anchor:** the **elephant** (great gray side rising and
  falling = breath, unnamed) · the **giraffes** (lower the long neck, fold the long legs;
  on return, neck curved back with the head laid on its own side — true giraffe sleep = the
  body settling) · the **otters** (roamer/peek-a-boo: one dives, a ring spreads and smooths,
  it surfaces again; on return it climbs out and curls beside the other = thought arising/
  passing + the return-and-settle beat) · the **monkeys** (huddle close; one little one
  still stirs, then tucks in = the last restless thought settling; on return, one dark
  breathing shape) · the **owl** (awake at the far turn, the night-watcher = the world
  continuing safely, care).
- **The mirror, kept implicit (Vol I):** the elephant's side rising and falling is the
  breath; the otter surfacing and going under, and the ring spreading and smoothing, are
  thoughts arising and passing; the one restless monkey going still is the mind settling;
  the moon climbing and the lamps glowing on is the settling toward sleep; the owl watching
  over is the care. None named.
- **The return-and-settle beat (successor to Firefly's firefly + rabbit / Play Fort's cat +
  bear):** the diving otter is the **roamer** (its slipping under and surfacing is its
  *true* nature — no invention needed). At the close it climbs out of the smooth pool and
  curls close beside the other otter, the two resting together — companionship at the
  threshold of sleep, true to how otters actually rest.
- **Earned language, on budget (Vol IV):** one rhetorical question — "Can you find it there,
  awake in the dark?" (the owl, at the far turn into the second half, rides a real motion —
  the owl has just turned its head — unanswered → silence) — and one metaphor — the round
  moon glowing "like a night-light left on for every sleeping animal" (late, simple, hooked
  to something every child knows; carries the care register). Non-adjacent.
- **Three passes:** *Introduce* (the path travels in, meeting each animal once) · *Deepen*
  (the path turns back toward the gate; lamps glow on, the moon climbs; each animal is
  revisited one relationship deeper — the monkeys are now one breathing shape, the otter
  returns and settles, the giraffe's neck is curved back over its own side, the elephant's
  breath slows and deepens) · *Whole* (the night-light metaphor → gather in echoed 2.5s
  beats → one 12s immersion → return to the opening image at the gate → trademark close).

## Score

```
<break time="1.5s"/>

The zoo lies quiet in the last soft light of evening.

<break time="4s"/>

At the gate, one lamp glows warm, and the path winds on into the quiet zoo.

<break time="3s"/>

Above the dark trees, a round moon is rising.

<break time="4s"/>

Beside the path, a great elephant stands in its yard.

<break time="4s"/>

It sways a little, slow and heavy.

<break time="3s"/>

Its wide gray side rises...

<break time="2.5s"/>

and slowly falls.

<break time="6s"/>

Farther along, two tall giraffes stand beneath a bare tree.

<break time="3s"/>

One lowers its long neck all the way to the ground.

<break time="2.5s"/>

It folds its long legs, and settles onto the cool grass.

<break time="6s"/>

The path curves past a still, dark pool, where two otters float together.

<break time="4s"/>

One rolls over, and slips under without a sound.

<break time="2.5s"/>

A ring spreads slowly across the water...

<break time="2.5s"/>

then it surfaces again, close by.

<break time="6s"/>

In a tree beside the path, small monkeys gather into one warm huddle.

<break time="3s"/>

One little monkey still shifts and stirs.

<break time="2.5s"/>

Then it tucks itself in among the rest.

<break time="6s"/>

At the far end of the path, an owl sits high on a branch.

<break time="4s"/>

It turns its round head slowly, this way, and that.

<break time="3s"/>

Can you find it there, awake in the dark?

<break time="6s"/>

Now the path turns back toward the gate.

<break time="4s"/>

One by one, the soft lamps glow on along the way.

<break time="3s"/>

The round moon has climbed higher, white and clear.

<break time="6s"/>

In the tree, the huddle of monkeys has gone still.

<break time="3s"/>

Now they are one dark, round shape among the leaves, rising and falling slowly together.

<break time="7s"/>

The dark pool lies smooth and still now.

<break time="3s"/>

The otter that dived slips up out of the water.

<break time="2.5s"/>

It climbs out, and curls close beside the other.

<break time="3s"/>

The two lie together, still and warm.

<break time="7s"/>

Farther on, the giraffe rests low on the ground.

<break time="3s"/>

Its long neck curves back, its head laid soft against its own side.

<break time="7s"/>

The great elephant stands quiet in its yard.

<break time="3s"/>

Its wide side rises...

<break time="3s"/>

and falls, slower now, and deeper.

<break time="8s"/>

High over the whole zoo, the round moon glows, like a night-light left on for every sleeping animal.

<break time="8s"/>

The great elephant breathes slow and deep in the dark.

<break time="2.5s"/>

The tall giraffe sleeps folded on the ground.

<break time="2.5s"/>

The two otters lie curled close beside the pool.

<break time="2.5s"/>

The little monkeys rest in one warm shape.

<break time="2.5s"/>

And high on its branch, the owl keeps watch over them all.

<break time="12s"/>

Seen together, the whole zoo rests beneath the round white moon.

<break time="8s"/>

At the gate, the one lamp still glows warm.

<break time="4s"/>

The elephant's wide side rises...

<break time="3s"/>

and falls.

<break time="4s"/>

A ring spreads on the dark pool...

<break time="3s"/>

and smooths away.

<break time="10s"/>

And the whole quiet zoo

 drifts into the soft, deep night.

<break time="1.5s"/>
```

> The closing line is split by an **untagged blank line** — the closing caesura. See
> [../NOTATION.md](../NOTATION.md).

## Next steps

- **Render** the score through ElevenLabs, **measure**, and adjust to ~7:00 (composed lean
  at ~46 lines; if it lands short, deepen — don't pad). Then encode to
  `assets/audio/the-sleepy-zoo.mp3` (64k mono, libmp3lame), refresh `CHECKSUMS.sha256`,
  run the quality guard.
- **Transcribe** the render (`scripts/transcribe.py`) into `transcripts/the-sleepy-zoo.txt`.
- **Ship into the app (repo `CLAUDE.md` §0):** screen (clone Geometry) · route · type ·
  Extras row · History meta (`extra_sleepy_zoo`, 2-letter abbr e.g. `SZ`) · YouTube visual
  preset · version bump + builds.
```
