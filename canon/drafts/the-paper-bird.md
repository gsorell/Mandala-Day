# The Paper Bird — Studio Master (draft)

- **Audience:** children (bedtime)
- **Title:** *The Paper Bird* — the anchor names the piece, as *The Firefly Meadow* does.
  If the Kids list should name the setting instead, *The Quiet Classroom* is the
  alternative; the score needs no change either way.
- **Status:** **rendered and wired into the app.** Runs **7:19.0**.
- **Pre-render estimate:** 43 paragraph units (the closing descent counted as **three**) ×
  ~5.15s/unit = 221s, against **199.5s** of notated break → **≈7:00**. Built to the
  Quiet Hall / When the Park Sleeps calibration (~5.13–5.2s per unit), lean composition,
  whole observations rather than fragment-lines.
- **Calibration result — the soft break costs ~3.1s.** This is the first score written
  under the line-length rule, and it settled that rule's open question. 43 paragraph units ×
  5.15s + 199.5s of break predicted **420.5s**; it rendered **439.0s**. The six soft breaks
  are the entire 18.5s difference — **≈3.1s each**, roughly 60% of a full paragraph unit,
  not the breath they were assumed to be. Both corrections are now in
  [../NOTATION.md](../NOTATION.md): the third term in the **Target length** arithmetic, and
  the budgeting note under **Line length and the soft break**.
- **Composition note.** The first draft ran to a **10.3-word mean — the wordiest score in the
  canon** (next: Rain on the Roof 9.2; the marsh 6.4), which is what prompted the rule. Three
  lines were shortened and six split at the comma. Three lines remain in the 13–15 band as
  single grammatical movements: the guinea pig line, the pool metaphor, and the gather line
  (13 words, the same shape and length as the marsh's own).
- **Transcript caveat — do not trust `transcripts/the-paper-bird.txt` in the final third.**
  Whisper degrades badly on this piece's quiet close: it drops "night" from the trademark
  line, renders "The paper bird turns... / and turns back." as the single word "or", mangles
  "The board waits, wiped clean and dark" into the guinea pig line, and hears "shoot" as
  "chute". **The audio is correct** — verified by silence mapping, which resolves the closing
  descent into its four intended weights (2.12s "And the whole quiet classroom" · 1.82s
  caesura · 1.74s "drifts into the soft," · 0.65s · 0.37s "deep" · 0.92s ellipsis · 0.45s
  "night" · 3.1s frame). The lesson generalises: a transcript is evidence about *loud*
  speech. Where a master goes soft and slow, verify with `silencedetect`, not Whisper.
- **Slug:** `the-paper-bird` · **templateId:** `extra_the_paper_bird` · **abbr:** `PB`

## Blueprint

- **Subject:** a room made for a hundred small noises, going on with its slow work after
  everyone has gone. The classroom is not *emptied* at the end of the day — it is revealed
  to have been working all along at a speed too slow to notice while the day was loud.
  Paint dries, a seed leans, a snail crosses, colour goes out of the board.
- **The two-piece problem, and the fix:** *The Quiet Hall* is already a made room at dusk,
  and *When the Park Sleeps* is already a noisy place gone gentle. This piece must not be a
  third emptying. Its engine is the opposite: **nothing here is winding down.** Every
  element is mid-task, and the piece's motion is *continuing*, not draining. It also
  returns to the marsh's **traveling thread** after two resting-gaze pieces in a row.
- **Environment:** one small classroom, from late afternoon into the blue of evening.
  Deliberately generic — no school, teacher, child, subject, or name anywhere in the score.
- **Home:** inside the room. **Guiding thread:** the outside air, in at the window left
  open at the top, moving along the wall and the desks and out again — touching each thing
  in turn. The thread is itself the breath, and it comes and goes.
- **Anchor:** **one little paper bird on a thread above the desks.** It turns slowly around,
  and slowly back — a torsional pendulum, which is what a hung paper bird really is. It
  returns in every pass, opens the gather, and is the last thing still moving at the end.
- **Six recurring elements:** the paper bird (anchor — turns · unwinds · turns back) · the
  day's paintings on their string (lift and lie down; edges gone dry and pale) · the fish
  tank (bubbles rising and gone; **one small snail** crossing the glass all day, leaving a
  clean track through the green) · the paper cups of soil on the sill (one green shoot; all
  the new leaves turned the same way, toward the glass) · the half-wiped board (pale cloudy
  sweeps drying until the writing is gone) · the little guinea pig under its heap of straw
  (the straw rises, and settles).
- **The mirror, kept implicit (Vol I):** the air coming in and going out is the breath; the
  bird winding and unwinding is the breath again, from the other side; the bubbles reaching
  the top and being gone are thoughts; the writing drying off the board is a thought
  letting go; the leaves all turned one way is attention; the snail's slow crossing is
  patience. None named.
- **The one event — the light changes hands.** *The Quiet Hall*'s event was a sound
  disappearing; *When the Park Sleeps*' was a thing appearing. This one is neither: the sun
  drops below the window frame and **the fish tank becomes the brightest thing in the
  room**, its light reaching up onto the ceiling. A room lit all day from outside ends the
  day lit from within. Warmth is protected the same way the park's was — nothing is ever
  fully dark, and the last motion in the piece is the air returning, not a silence.
- **Earned language, on budget (Vol IV):** one rhetorical question — *"Was it that tall this
  morning?"* (final third; points at real, slow motion the world is genuinely making;
  unanswered → 6s silence; not another can-you-hear/feel/find) — and one metaphor — the
  ceiling rippling *"the way water does on the floor of a pool"* (late, simple, hooked to
  something a child knows, and literally true of caustics). Three lines apart, never
  adjacent.
- **Three passes:** *Introduce* (the air at the window, the bird, the paintings, the tank,
  the cups, the board, the guinea pig) · *Deepen* (the paintings have dried and lift more
  easily; the bird's thread reaches its limit and unwinds the other way; the snail's clean
  track and how long it has been crossing; every cup's leaves turned to the glass; the last
  sweeps dry and the writing is gone; the guinea pig turns once and settles) · *Whole* (the
  sun leaves → the shoot against the pale glass → the question → the tank takes the room →
  the ceiling → the metaphor → the bird through the moving light → gather in echoed 2.5s
  beats → 12s immersion → return to the opening image → trademark close with the descent).

## Score

```
<break time="1.5s"/>

A small classroom rests at the end of the afternoon.

<break time="4s"/>

One window is open at the top,
and the outside air moves quietly in.

<break time="3s"/>

Above the desks, a little paper bird hangs from a thread.

<break time="3s"/>

It turns slowly around... and slowly back again.

<break time="5s"/>

Along one wall, the day's paintings hang from a string.

<break time="3s"/>

The moving air lifts their corners, and lays them down again.

<break time="5s"/>

By the window, a fish tank glows in the low light.

<break time="3s"/>

Small bubbles rise through the water, reach the top, and are gone.

<break time="5s"/>

On the windowsill, a row of paper cups holds dark, damp soil.

<break time="3s"/>

In one of them, a small green shoot has pushed through.

<break time="5s"/>

At the front of the room,
pale cloudy sweeps are drying where the writing used to be.

<break time="5s"/>

In the corner, a little guinea pig sleeps under a heap of straw.

<break time="3s"/>

The straw rises, and settles, and rises again.

<break time="6s"/>

The paintings' edges have gone dry and pale,
and they lift more easily now.

<break time="6s"/>

The paper bird turns until its thread will turn no further.

<break time="3s"/>

Then, all on its own, it begins to unwind the other way.

<break time="6s"/>

Low in the tank, one small snail crosses the glass.

<break time="3s"/>

Behind it, a clean, clear path is left through the green.

<break time="5s"/>

It has been crossing since the middle of the day.

<break time="7s"/>

In every cup on the sill,
the new leaves are turned the same way, toward the glass.

<break time="6s"/>

On the board, the last pale sweeps dry,
and the writing is gone.

<break time="7s"/>

Under its heap of straw, the guinea pig turns once, and settles.

<break time="7s"/>

The sun drops below the window frame,
and the room turns soft and blue.

<break time="7s"/>

On the sill, the smallest shoot stands dark against the pale glass.

<break time="3s"/>

Was it that tall this morning?

<break time="6s"/>

The fish tank is now the brightest thing in the room.

<break time="4s"/>

Its light reaches up and rests on the ceiling.

<break time="3s"/>

The whole ceiling ripples, the way water does on the floor of a pool.

<break time="8s"/>

The little paper bird turns slowly through the moving light.

<break time="8s"/>

The paper bird turns above the quiet desks.

<break time="2.5s"/>

The day's paintings hang dry along their string.

<break time="2.5s"/>

The small snail crosses the last of the glass.

<break time="2.5s"/>

The green shoots stand in their row of paper cups.

<break time="2.5s"/>

The board waits, wiped clean and dark.

<break time="2.5s"/>

And the guinea pig sleeps beneath its heap of straw.

<break time="12s"/>

Seen together, the whole small classroom rests in the light of the water.

<break time="8s"/>

The outside air comes in at the window once more.

<break time="3s"/>

The paintings lift, and lie down.

<break time="4s"/>

The paper bird turns...

<break time="3s"/>

and turns back.

<break time="12s"/>

And the whole quiet classroom

drifts into the soft,

deep... night.

<break time="1.5s"/>
```

> The close follows **The closing caesura** and **The closing descent**
> ([../NOTATION.md](../NOTATION.md)): three units across two untagged blank lines, the comma
> after *soft* kept so the sentence stays open across the breath, the last gap an ellipsis
> only, and the silence before it held at `12s`. Do not replace either blank line with a
> break tag.

## If the render comes in short

Deepen, never pad. Room to add, in order: a beat on the bubbles slowing as the tank's pump
settles into the quiet room; one more return to the paintings after the light goes, hanging
still in the blue; a longer hold after the ceiling begins to ripple. Do not add a second
question or a second metaphor — the budget is spent.

## Remaining

- **Render** the master to `…/Audio/MP3/The Paper Bird.mp3`, measure, and trim or deepen
  against the 7:00 target.
- **Wire in** per `CLAUDE.md` §0 — encode to `assets/audio/the-paper-bird.mp3` (64k mono,
  libmp3lame), refresh the checksum manifest, run the quality guard, clone
  `WhenTheParkSleepsScreen.tsx` → `ThePaperBirdScreen.tsx` (keep the header title props),
  add the `App.tsx` route, the `RootStackParamList` entry, the Kids row in
  `SettingsScreen`, and `EXTRA_SESSION_META['extra_the_paper_bird']` with abbr `PB`.
- **Transcript** and **YouTube visual** as usual.
