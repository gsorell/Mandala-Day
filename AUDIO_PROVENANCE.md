# Audio provenance

Where the spoken voice in `assets/audio/` actually comes from, and the settings
that would be needed to reproduce it.

**Every narrated track is ElevenLabs text-to-speech**, not a microphone recording.
One voice is used throughout: a professional voice clone (`pvc`) named
**Theo Silk — British Deep Sleep & Meditation**, which ElevenLabs renamed to
**Theo Silk — British Deep Sleep & Calm** around March 2026. Both names refer to
the same voice; tracks generated before and after the rename are interchangeable.

## Why this file exists

The generation settings survive in exactly one place: the clip names embedded in the
Audacity project files (`…/Audio/AUP3/*.aup3`), which are **not in this repo** and exist
for only 16 of the 28 narrated tracks. If ElevenLabs retires the voice, or a track needs
to be regenerated to match the others, the strings below are what make that possible.
They are not recoverable from anything in git.

## The production chain

```
ElevenLabs render (MP3 download)
  → Audacity project        …/Audio/AUP3/<Name>.aup3      (32-bit float @ 44.1 kHz, single mono voice track)
  → exported MP3 master     …/Audio/MP3/<Name>.mp3        (the "master" that scripts/check-audio-quality.sh compares against)
  → app encode              assets/audio/<hyphen-name>.mp3 (64 kbps mono LAME)
```

`…/Audio/MP3/` is the master folder and the reference for both audio guards. There is
one lossy generation between master and app. `…/Audio/MP3-deboomed/` holds the output
of the reverted correction; it is **not** a pipeline input, and the only file in it
that still matters is Crown to Sole (see below), which was hand-edited there.

There is **no lossless original.** The Audacity projects store 32-bit float, but the
content inside them is decoded from the ElevenLabs MP3 download, so re-rendering a
project gains essentially nothing over working from the exported master. The projects
contain a single mono voice track — no separate ambience, music, or bell stems.

## Reading the settings string

A clip name looks like:

```
ElevenLabs_2026-07-11T16_08_08_Theo Silk - British Deep Sleep & Calm_pvc_sp95_s50_sb75_se0_b_m2
                                                                     |   |    |   |    |   | |
                                                    professional voice clone  |   |    |   | |
                                                         speed 0.95 ─────────┘   |    |   | |
                                                         stability 50 ─────────┘    |   | |
                                                         similarity boost 75 ────┘   | |
                                                         style exaggeration 0 ──────┘ |
                                                         speaker boost on, model v2 ─┘
```

The `sp`/`s`/`sb`/`se` readings are inferred from the value ranges and are consistent
across every clip; treat them as high-confidence but not vendor-documented. `b` appears
only on later renders and lines up with speaker boost; `m2` is the v2 model.

Two settings eras are visible. Early tracks (Jan–Feb 2026) use
`s100_sb90_se10` with no speaker boost. Everything from roughly March 2026 on uses
`s50_sb75_se0_b` — lower stability, lower similarity boost, no style exaggeration,
speaker boost on. **`s50_sb75_se0_b_m2` is the current house setting.**

## Per-track table

`take(s)` counts the distinct ElevenLabs renders found in the project — more than one
means the track was assembled from multiple generations, and the row shows the **last**
one. A dash means the information does not survive anywhere.

| app file | master | project | voice | settings | generated | takes |
|---|---|---|---|---|---|---|
| `body-safari.mp3` | Body Safari.mp3 | Body Safari | — | — | — | — |
| `body-sea-voyage.mp3` | Body Sea Voyage.mp3 | — | — | — | — | — |
| `compassion-activation.mp3` | Compassion Activation.mp3 | Compassion Activation | Theo Silk — British Deep Sleep & Meditation | `sp89_s50_sb75_se0_b_m2` | 2026-01-25 | 2 |
| `crown-to-sole.mp3` | Crown to Sole.mp3 | — | — | — | — | — |
| `cutting-through.mp3` | Cutting Through.mp3 | Cutting Through | Theo Silk — British Deep Sleep & Calm | `sp91_s50_sb75_se0_b_m2` | 2026-01-19 … 2026-07-06 | 4 |
| `direct-inquiry.mp3` | Direct Inquiry.mp3 | Direct Inquiry | Theo Silk — British Deep Sleep & Calm | `sp91_s50_sb75_se0_b_m2` | 2026-06-25 | 5 |
| `dissolution-rest.mp3` | Dissolution & Rest.mp3 | Dissolution & Rest | Theo Silk — British Deep Sleep & Calm | `sp91_s50_sb75_se0_b_m2` | 2026-01-22 … 2026-07-06 | 4 |
| `embodying-presence.mp3` | Embodying Presence.mp3 | Embodying Presence | Theo Silk — British Deep Sleep & Calm | `sp91_s50_sb75_se0_b_m2` | 2026-01-13 … 2026-07-02 | 8 |
| `integration-motion.mp3` | Integration in Motion.mp3 | Integration in Motion | Theo Silk — British Deep Sleep & Meditation | `sp85_s100_sb90_se10_m2` | 2026-01-21 | 1 |
| `marsh-creek.mp3` | Marsh Creek.mp3 | — | — | — | — | — |
| `prairie-wind.mp3` | Prairie Wind.mp3 | Prairie Wind | — | — | — | — |
| `quiet-cove.mp3` | The Quiet Cove.mp3 | The Quiet Cove | Theo Silk — British Deep Sleep & Calm | `sp95_s50_sb75_se0_b_m2` | 2026-07-11 | 1 |
| `rain-on-the-roof.mp3` | Rain on the Roof.mp3 | — | — | — | — | — |
| `recognizing-thought.mp3` | Recognizing Thought.mp3 | Recognizing Thought | Theo Silk — British Deep Sleep & Calm | `sp95_s50_sb75_se0_b_m2` | 2026-07-09 | 1 |
| `starry-night.mp3` | Starry Night.mp3 | — | — | — | — | — |
| `the-chakra-centers.mp3` | The Chakra Centers.mp3 | The Chakra Centers | Theo Silk — British Deep Sleep & Calm | `sp95_s50_sb75_se0_b_m2` | 2026-07-07 | 3 |
| `the-city-of-lights.mp3` | The City of Lights.mp3 | — | — | — | — | — |
| `the-firefly-meadow.mp3` | The Firefly Meadow.mp3 | — | — | — | — | — |
| `the-first-snow.mp3` | The First Snow.mp3 | — | — | — | — | — |
| `the-geometry-of-attention.mp3` | The Geometry of Attention.mp3 | The Geometry of Attention | Theo Silk — British Deep Sleep & Calm | `sp95_s50_sb75_se0_b_m2` | 2026-07-21 | 1 |
| `the-play-fort.mp3` | The Play Fort.mp3 | — | — | — | — | — |
| `the-quiet-hall.mp3` | The Quiet Hall.mp3 | — | — | — | — | — |
| `the-sleepy-zoo.mp3` | The Sleepy Zoo.mp3 | The Sleepy Zoo | — | — | — | — |
| `vipassana.mp3` | Vipassana.mp3 | Vipassana | Theo Silk — British Deep Sleep & Meditation | `sp89_s50_sb75_se0_b_m2` | 2026-02-01 | 1 |
| `vision.mp3` | Vision.mp3 | Vision | Theo Silk — British Deep Sleep & Calm | `sp110_s50_sb75_se0_b_m2` | 2026-03-26 | 1 |
| `waking-the-view.mp3` | Waking the View.mp3 | Waking the View | Theo Silk — British Deep Sleep & Calm | `sp91_s50_sb75_se0_b_m2` | 2026-07-02 | 1 |
| `when-the-park-sleeps.mp3` | When the Park Sleeps.mp3 | — | — | — | — | — |
| `where-the-stars-turn.mp3` | Where the Stars Turn.mp3 | — | — | — | — | — |

13 of 28 tracks have recoverable settings. The 15 that do not fall into two groups:
tracks with no Audacity project at all (only an exported master survives), and three
projects — Body Safari, Prairie Wind, The Sleepy Zoo — where the clips were flattened
before saving, so the source names are gone. For those, assume the house setting for
their era and expect to tune by ear against a neighbouring track.

## The low-end correction (applied 2026-08-26, REVERTED 2026-09-02)

> **This correction is not in the shipped audio.** It was applied to all 28 tracks
> and then reverted after several days of on-device listening: it fixed the boom
> described below, but was judged to have degraded the audio in other ways. The
> measurements are sound and the problem is real — the judgement was that this
> particular cure cost more than the disease. Kept here because the diagnosis is
> worth having if it is ever revisited; a gentler `TARGET_DB` (+6 or +7 rather than
> +4) is the first thing to try. `scripts/deboom-audio.py` carries the same warning.

This voice's fundamental sits at ~72–80 Hz — very low, and very strong relative to the
rest of the voice. Measured across the library, **~75% of each track's total signal
power was in 60–120 Hz.** Headphones and phone speakers barely reproduce that band, so
it goes unnoticed there; a Bluetooth speaker with a bass boost and a passive radiator
tuned into exactly that region turns it into a boom. That was a real listener report
(2026-08), not a theoretical concern.

`scripts/deboom-audio.py` corrects it. For each track it measures the 60–120 Hz band
against the 250–4000 Hz speech band, then solves the peaking-cut gain at 78 Hz that
lands the result at **+4 dB** (from ~+10). The solve is **per track** — the library spans
~4 dB of boom, so one fixed cut would over-thin the tracks that were already fine
(The Chakra Centers needs −3.2 dB; Cutting Through needs −8.0 dB).

Two things that are easy to get wrong, both learned the hard way:

- **Cutting the boom takes the loudness with it.** That band held ~75% of the power, so
  removing it dropped integrated loudness 3.6–4.6 LU even though K-weighting discounts
  the low end — and it did so *unevenly*, widening the library's spread. The script
  measures each master's LUFS and adds exactly that much back, capped at −1 dBTP.
  The only audible change should be the bass.
- **Don't add a high-pass.** An earlier version high-passed at 45 Hz to clear subsonic
  content. There is essentially none (20–60 Hz measures ~9 dB *below* the speech band),
  and the filter's ringing pushed true peak *up* on some tracks — Body Safari went
  −5.1 → −3.5 dBFS — which then ate the headroom the makeup gain needed. One bell,
  nothing else.

### Loudness

The same pass also normalised every track to **−26.0 LUFS** integrated (`NORM_LUFS`),
capped at −1 dBTP. It belonged in the same pass rather than a separate step because
cutting the boom changes loudness anyway, so the level had to be set explicitly
regardless — and one pass avoids a second gain stage.

**This went away with the revert.** The shipped library is back to its original
3.8 LU spread. Loudness normalisation was never the thing under complaint, so it is
worth noting it could be re-applied on its own: it needs a variant of the script that
sets `TARGET_DB` aside and only does the measure-and-gain half.

−26.0 is the library's own mean, chosen so the app's overall level is unchanged — this
removes the jumps *between* tracks, it does not make the app louder. Before: 3.8 LU
spread (−23.0 to −26.8), with The Chakra Centers a clear outlier. After: **0.6 LU spread,
sd 0.10**, every track within 0.1 LU of target except Body Safari at −26.5, where the
true-peak ceiling binds before the target is reached.

Note the library sits 7–10 LU below spoken-word norms (−16 to −19). That is a deliberate
choice for meditation audio, not a defect — but if it is ever revisited, `NORM_LUFS` is
the single number to change.

### Exception: Crown to Sole

**Crown to Sole is the one track whose source of record is not its master.** On
2026-08-26 it was replaced by hand in `…/Audio/MP3-deboomed/` rather than in
`…/Audio/MP3/`. The replacement is 15 s longer than the master (600.2 s vs 585.3 s,
which also fixed the screen's 10-minute claim — the old file undershot it by 15 s) and
arrived already corrected (+4.1 dB at 60–120 Hz, −25.7 LUFS), so it is not something
`deboom-audio.py` can reproduce from `…/Audio/MP3/Crown to Sole.mp3`.

The script holds it back — see `HAND_EDITED` in `scripts/deboom-audio.py`. Without
that guard, a run would rebuild the track from the stale 585 s master and silently
discard the hand-edited file.

**When the de-boom was reverted on 2026-09-02, this track could not simply be reverted
with the others** — the hand-edited replacement was made *on top of* the de-boomed
version, so reverting it would have thrown away the 15 s of new content. Instead the EQ
was reversed: a +5.90 dB peaking boost at 78 Hz Q1.0, solved to return the 60–120 Hz
band to +9.3 dB (the pre-de-boom file's value), then set to −25.9 LUFS to match that
file's loudness. It lands at +9.4 dB / −25.9 LUFS / 600.2 s. This is an *undo of the
filter*, not a return to an untouched source — the only track in the library that has
been through both a cut and a matching boost.

One consequence while this stands: `scripts/check-audio-quality.sh` would compare this
track against content that no longer matches, so it is skipped there via `STALE_MASTER`
rather than reporting a meaningless pass. `transcripts/crown-to-sole.txt` **was**
refreshed against the 600 s audio and is current.

**Going forward, audio edits belong in `…/Audio/MP3/`** — the master folder. Once this
track's master is replaced with the 10-minute version, delete its `HAND_EDITED` entry
here and its `STALE_MASTER` entry in `scripts/check-audio-quality.sh`, and the track
rejoins the normal pipeline with no special cases.

### What is deliberately NOT corrected

Tonal matching between tracks. Outside the bass band the library is already tight —
standard deviations of 0.6–1.3 dB per octave band, below what is reliably audible as
broadband tilt. Forcing 27 tracks onto a common curve would add a processing stage and
risk a processed sound to fix something no one can hear. The wide min–max spreads in
those bands are outlier-driven, mostly by The Chakra Centers (darker top end, thinner
low-mid — it was post-processed differently, though generated with the same voice and
settings as Quiet Cove and Geometry of Attention).

Re-run the script for any **new** track from this voice; the same profile will be there.
It is idempotent (it always reads the untouched masters, never its own output), and it
does not change duration, so screen duration constants, `transcripts/`, and
`visual-engine/` renders stay valid.

## If you ever regenerate

Regenerating produces a **different performance** — TTS is not deterministic in phrasing
or pacing, so a regenerated track will not line up with the one it replaces. Anything
keyed to the old timing has to be redone: the screen's duration constant, the
transcript in `transcripts/`, and the YouTube visual render in `visual-engine/`.
Matching the settings above gets you the same *voice*, not the same *take*.
