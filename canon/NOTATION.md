# ElevenLabs Performance Notation

How to turn a designed investigation (see [CANON.md](CANON.md), Volumes III & IV) into a
copy/paste-ready ElevenLabs Studio Master. This is the pause system that produces
realistic, appropriately-paced narration.

## The only tag you use

```
<break time="Xs"/>
```

One observation per line. A break tag sits **between every observation** — and before the
first line and after the last. Blank lines around each element keep the score readable;
between two complete observations ElevenLabs ignores the whitespace and reads only the text
and the break tags.

**One exception, and it is a tool:** a blank line placed *inside* a single sentence is not
ignored — it produces a real, unmeasured breath. See **The closing caesura** below, the only
place the form uses it.

## Pause vocabulary

Each pause length has a **function**. Choose by what the moment is doing, not by
punctuation.

| Tag | Function | Use it for |
|---|---|---|
| `1.5s` | **Frame** | Entry and exit only — the very first line and the very last line. |
| `2s` | **Short continuation** | A tight completing half-beat: "Then another." |
| `2.5s` | **Continuation** | Two observations of the *same* ongoing movement. The early/mid workhorse. |
| `3s` | **Recognition (light)** | After introducing a new element or a small discovery — let it land. |
| `4s` | **Recognition** | After the opening establishing sentence; a discovery becoming experience. |
| `5s` | **Dwelling (light)** | Remain briefly with a completed small motion (ripples fading). |
| `6s` | **Dwelling** | After a completed mini-scene (the dragonfly lifts away). |
| `7s` | **Dwelling / scene change** | Let a whole vignette settle before the next begins. |
| `8s` | **Immersion** | Deep stillness; the narrator disappears briefly. Belongs to later thirds. |
| `10s` | **Immersion (deep)** | After the "seen together" gather — the whole world held at once. |
| `15s+` | **Release** | Optional, final third only — the world continues without narration. |

Bands, if you prefer them: **2–2.5s continuation · 3–4s recognition · 5–7s dwelling ·
8–12s immersion · 15s+ release.** Frame is a fixed 1.5s.

## Placement rules

1. **Arc of trust.** Open short (2–4s). Grow the pauses as the world becomes familiar.
   The longest silences (8s+, and any 15s+ release) belong to the **final third** and the
   gather. Never open with a long silence — it hasn't been earned.
2. **Ellipsis = unfolding, break = dwelling.** Use "…" inside a line to let one thought
   unfold within a single breath; the break *after* the line is where it dwells.
3. **Hidden rhythm.** Vary the pause within its band — avoid a metronome. But when you
   **echo** an earlier observation (especially the final gather that lists each element
   again), reuse a *consistent* short beat (`2.5s`) so the recurrence itself becomes the
   rhythm.
4. **Pauses follow discoveries, not commas.** A longer pause marks a completed discovery;
   a short one carries a movement forward.
5. **Silence before naming.** When recognition is stronger than description, place the
   pause *before* you name the thing.
6. **The performance test.** Read the score aloud. If the pause pattern alone sounds
   arbitrary, revise it. Every pause should be defensible.

## Structure of a finished score

- `1.5s` frame → **opening observation of the world** (the world already exists).
- Establish the **home** and the **anchor** object.
- **Pass 1 — Introduce:** move the guiding thread through the world, meeting each element
  once. Shorter pauses (2.5–6s).
- **Pass 2 — Deepen:** return along the thread; each element reveals one new relationship.
  Pauses lengthen (3–8s).
- **Pass 3 — Whole / gather:** list the elements together in quick echoed beats (`2.5s`),
  then a deep `10s` immersion — "Seen together, the whole …".
- **Ending:** return to the opening image, the trademark line
  *"And the whole [environment] drifts into the soft, deep night."* — split by **the closing
  caesura** (below) — then a closing `1.5s` frame.

## The closing caesura

The trademark final line carries more weight than any other sentence in the score, and read
straight through it lands flat — it goes by as just one more observation. Break it across an
**untagged blank line**, between the subject and the verb:

```
And the whole dark meadow

 drifts into the soft, deep night.
```

The blank line inside the sentence produces ElevenLabs' own paragraph breath — an
**unmeasured caesura**, not a timed stop. That difference is the whole point:

- A `<break time="2s"/>` there reads as the gap *between two sentences*. The line breaks in
  half and the gravitas leaks out.
- A bare blank line reads as **one sentence breathing**. The environment is named and held;
  then the verb descends onto it as a separate movement, and the world goes down into sleep.

**Use it only here** — on the final trademark line. Its power is that nothing else in the
score does it. Everywhere else, one observation per line with a measured break between.

> Established on *The Firefly Meadow*. The rendered close is the reference performance.

### The closing descent

One caesura fixes *where* the line breathes, but it leaves `the soft, deep night` to be read
as a single quick descriptive phrase — commas get a comma's worth of time — and the piece
ends before the ear knows it has ended. The last words must land as **separate descending
weights**, not as a list.

The validated form splits the trademark line into **three** units across **two** untagged
blank lines, with a single ellipsis inside the last:

```
And the whole quiet park

drifts into the soft,

deep... night.
```

Three weights, each lighter and lower than the one before:

1. **the environment, named and held** — the subject alone;
2. **the verb descending onto it** — and note the **comma is kept**. The phrase is left
   grammatically *open* across the breath, so the third unit resumes the sentence instead of
   starting a new one. Drop that comma and the close reads as two sentences;
3. **the last two words** — `deep` and `night`, held apart by an ellipsis only, because they
   must stay inside one breath.

The wording of the trademark line never changes; only its layout and punctuation do, and
only inside a score. Quote it as one sentence in prose.

**Why each gap gets the mark it gets.** The three available marks are not
interchangeable — they are three different weights:

- an **ellipsis** is *unfolding within one breath* (see **Internal pauses**) — the lightest;
- an **untagged blank line** is ElevenLabs' own paragraph breath — unmeasured, heavier than
  an ellipsis, but still inside one sentence's prosody;
- a `<break>` is a *measured stop* and reads as the gap between sentences — too heavy
  anywhere in this line. It fragments the close into separate utterances and resets the
  prosody between them, which is fatal on the last thing the listener hears.

The first gap needs the paragraph breath; the last needs only the ellipsis. **Notating both
gaps as ellipses is not enough** — that version was tried on the render and still went by
briskly, which is how this rule was found.

**Hold the silence before the line at `12s`** rather than the usual `10s`, so the close
arrives out of a deeper quiet. The `1.5s` closing frame is unaffected — it is a frame, not
part of the descent.

> Established by ear on *When the Park Sleeps*; that master's close is the reference
> performance. Masters rendered before this rule keep their existing performances — the
> descent applies to every score written from here on.

## Target length

A children's Studio Master should run **about 7 minutes** of rendered audio. **Adult**
Studio Masters aim for **about 10 minutes.** ElevenLabs delivers roughly **4 seconds per
short line** (its own micro-pauses on "…" included) *on top of* the summed `<break>` time —
so a score that reads spacious on paper still comes in short. Always **render, measure, and
adjust.** If it lands under target, spend the room on genuine *deepening* — a second pass
that revisits elements to reveal new relationships — and on longer final-third silences.
Never pad arbitrarily. ("Where the Stars Turn" first rendered at 5:34; adding the Deepen
pass shown below brought it to ≈7 min.)

**Estimating a render before you hear it.** The arithmetic is
`total ≈ (paragraph units × per-unit rate) + summed break time`. Two rules keep it honest:

- **Count paragraph units, not sentences.** ElevenLabs bills every block separated by a
  blank line as its own read, with its own breath. The **closing descent is three units, not
  one** — the two untagged blank lines inside that single sentence each start a new read.
  Miscounting it as one line is a ~10s error, all of it at the end.
- **Re-total the break tags after the last pause edit.** A late `10s → 12s` hold is invisible
  to an estimate written before it.

Observed per-unit rates on children's masters: **~5.1–5.2s** (*The Quiet Hall* 5.2, *When the
Park Sleeps* 5.13) for scores built from whole observations, rising to **~5.4s** on scores
heavy with short fragment-lines and ellipses (*Rain on the Roof*). Fragments are slower per
unit, not faster. For a true 7:00, budget **~45 units against ~200s of break.**

**How the ten minutes is filled varies with the piece.** An instruction-dense investigation
(a body descent, a guided scan) spends most of it in *speech* — the Deepen pass carries the
length. A sparser inquiry (attention, thought, dissolution) spends more of it in *silence* —
long final-third holds carry the length. Same target; different balance of word and pause.
Match the balance to what the piece is doing, and reach the target by deepening, never by
restoring cut material to fill time.

---

## Reference Studio Master — "The Quiet Marsh" (children's)

The canonical example. Note how the pauses start short, grow through the middle, reserve
`7–8s` dwelling for scene changes, use `2.5s` echoed beats in the gather, and land the
single `10s` immersion right after "Seen together".

> **Its close is the one thing not to copy.** This master predates both the caesura and the
> descent, so its trademark line is written straight through. It is reproduced as rendered,
> as a record of the performance. Notate a new close per **The closing caesura** and **The
> closing descent** above.

```
<break time="1.5s"/>

A quiet marsh rests beneath the evening sky.

<break time="4s"/>

Near the edge of the marsh, one little patch of tall grass grows beside a winding tidal creek.

<break time="3s"/>

The creek slips gently past the grass.

<break time="2.5s"/>

The water moves so slowly that it almost seems to be resting.

<break time="5s"/>

A tiny leaf floats with the gentle current.

<break time="2.5s"/>

It slips around one blade of grass.

<break time="2s"/>

Then another.

<break time="5s"/>

Small ripples follow behind it.

<break time="2.5s"/>

They grow wider...

<break time="2.5s"/>

Then quietly fade away.

<break time="6s"/>

A blue dragonfly settles on the tip of one tall blade.

<break time="2.5s"/>

Its wings shimmer in the evening light.

<break time="3s"/>

A moment later...

<break time="2.5s"/>

It lifts into the air again.

<break time="6s"/>

The winding creek continues through the marsh.

<break time="3s"/>

Its gentle current passes a tiny fiddler crab on the muddy bank.

<break time="3s"/>

The crab takes a few careful steps.

<break time="2.5s"/>

Then disappears into a little round burrow.

<break time="7s"/>

The creek winds between long green reeds.

<break time="3s"/>

The breeze bends them all together.

<break time="3s"/>

A little later...

<break time="2.5s"/>

They stand tall again.

<break time="6s"/>

A small silver fish glides between the reeds.

<break time="2.5s"/>

It disappears.

<break time="2s"/>

Then appears again.

<break time="7s"/>

The creek grows a little wider.

<break time="3s"/>

A white heron stands in the shallow water.

<break time="3s"/>

One slow step...

<break time="3s"/>

Then another.

<break time="7s"/>

The water becomes still again.

<break time="8s"/>

The winding creek continues toward open water.

<break time="3s"/>

The evening breeze carries tiny ripples across its surface.

<break time="3s"/>

The ripples travel gently back through the winding creek.

<break time="8s"/>

The little patch of grass sways beside the winding creek.

<break time="2.5s"/>

The dragonfly returns for only a moment.

<break time="2.5s"/>

The fiddler crab rests inside its little burrow.

<break time="2.5s"/>

The reeds bend softly together.

<break time="2.5s"/>

The silver fish glides through the quiet water.

<break time="2.5s"/>

The heron stands where the creek becomes wide.

<break time="10s"/>

Seen together, the whole little marsh rests beneath the evening sky.

<break time="8s"/>

The winding creek finds its gentle way through the grass.

<break time="3s"/>

The breeze comes...

<break time="3s"/>

and goes.

<break time="4s"/>

The water rises...

<break time="3s"/>

and settles.

<break time="10s"/>

And the whole marsh drifts into the soft, deep night.

<break time="1.5s"/>
```

---

## Reference Studio Master — "Where the Stars Turn" (children's)

A second validated exemplar, built deliberately unlike the marsh — proof the form flexes.
Where the marsh uses a **traveling thread** (the creek carries the viewpoint forward past
each element), this one uses a **resting gaze**: the listener stays in one place and the
real, slow motions of space unfold, the gaze gliding from the near moon outward to the
deep sky and back. The guiding thread is the deepening night itself. This shows the
"one continuous path" of Volume III need not move the viewpoint at all.

It carries a full three-pass structure: an **Introduce** pass (near → far), a **Deepen**
pass that revisits the moon, comet, planet, and star-pair to reveal one new relationship
in each — earthshine (the moon lit by its world), the tail shedding its dust, a moon's
shadow crossing the rings, the pair trading places — then the **Whole** (river of stars,
gather, close). The Deepen pass is also what carried it from its first 5:34 render to the
≈7-minute target; note that it adds no new rhetorical questions or metaphors — deepening
is plain observation, and the earned-language budget stays spent at one of each.

What it demonstrates:

- **Protect the spell (Volume V).** Every motion is astronomically true — the moon
  circles, the ring turns together, the star is *hidden by passing dust and revealed*
  (never a star dimming on its own), the binary pair circles. Nothing is "passed,"
  nothing teleports. Transitions are gentle spatial glides: *Nearby / Farther out /
  Deeper still / far away*.
- **The world as mirror, kept implicit (Volume I).** The star hiding and returning is a
  thought arising and passing; the closing *"comes round… and goes / grows… and softens"*
  is the breath — neither is ever named.
- **Earned language, on budget (Volume IV).** Exactly one rhetorical question and one
  earned metaphor, non-adjacent, both in the second half. The question — *"Can you
  find it?"* — works because it rides a motion the world already began (the star has just
  returned), points only at what is really there, goes unanswered, and is followed by a
  real 5s silence. The metaphor — *"a quiet river of stars"* — arrives late, simple,
  hooked to something a child knows.

> As with the marsh, **its close predates the caesura and the descent** and is reproduced as
> rendered. Copy its structure and its pauses, not its final line.

```
<break time="1.5s"/>

Far up in the quiet dark, the night stretches wide and deep.

<break time="4s"/>

One small, still world floats in the dark, and a little moon circles slowly around it.

<break time="3s"/>

The moon drifts without a sound.

<break time="2.5s"/>

Its light rests along one curved edge.

<break time="5s"/>

Nearby, a thin veil of dust drifts through the dark.

<break time="2.5s"/>

It catches the faint light.

<break time="2s"/>

The glow spreads wide...

<break time="2.5s"/>

Then quietly softens away.

<break time="6s"/>

Farther out, a comet hangs in the deep dark.

<break time="2.5s"/>

Its long tail streams softly behind it.

<break time="3s"/>

A little at a time...

<break time="2.5s"/>

The tail thins, and fades.

<break time="6s"/>

Deeper still, a great ringed planet turns.

<break time="3s"/>

The light moves slowly along its rings.

<break time="3s"/>

Slowly...

<break time="2.5s"/>

All of it turns together.

<break time="7s"/>

A single small star shines far away.

<break time="3s"/>

A thin drift of dust passes across it.

<break time="2.5s"/>

For a moment, it is gone.

<break time="3s"/>

Then it shines once more.

<break time="3.5s"/>

Can you find it?

<break time="5s"/>

Two far stars slowly circle each other.

<break time="3s"/>

One turns to the front...

<break time="3s"/>

Then the other.

<break time="3s"/>

Around, and around, without end.

<break time="7s"/>

The little moon's dark side glows faintly...

<break time="3s"/>

lit softly by the world it circles.

<break time="8s"/>

The comet's long tail lets go of its dust.

<break time="3s"/>

The freed dust drifts slowly into the dark.

<break time="8s"/>

A tiny moon crosses before the great rings.

<break time="3s"/>

Its small shadow slips across them...

<break time="3s"/>

Then quietly, it is gone.

<break time="8s"/>

The two far stars turn on.

<break time="3s"/>

One shines bright...

<break time="2.5s"/>

The other, soft.

<break time="3s"/>

Slowly, the two trade places.

<break time="8s"/>

The night grows deeper, and more still.

<break time="8s"/>

A quiet river of stars stretches across the whole sky.

<break time="3s"/>

Its countless lights glow softly together.

<break time="8s"/>

The little moon circles the small, still world.

<break time="2.5s"/>

The veil of dust softens and fades.

<break time="2.5s"/>

The comet hangs with its long, streaming tail.

<break time="2.5s"/>

The great planet turns with all its rings.

<break time="2.5s"/>

The small star shines, and hides, and shines again.

<break time="2.5s"/>

The two far stars circle on, without end.

<break time="12s"/>

Seen together, the whole sky rests, quiet and deep.

<break time="8s"/>

The little moon comes round...

<break time="3s"/>

And goes.

<break time="4s"/>

The light grows...

<break time="3s"/>

And softens.

<break time="10s"/>

And the whole quiet sky drifts into the soft, deep night.

<break time="1.5s"/>
```
