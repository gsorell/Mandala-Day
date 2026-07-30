/**
 * Daily contemplative teachings — the pool the "teaching of the day" notification
 * draws from.
 *
 * ## Provenance and why the wording is what it is
 *
 * Every entry here is written in fresh English. That is deliberate, not lazy:
 *
 * - Ancient texts (Pāli Canon, Tao Te Ching, Zhuangzi, the Gospels, Marcus Aurelius…)
 *   are in the public domain, but *modern English translations of them are separately
 *   copyrighted*. Quoting a familiar rendering — Mitchell's Tao, Barks' Rumi,
 *   Easwaran's Dhammapada — would be copying a living author's work. So these are
 *   renderings of the teaching, not reproductions of any translation.
 * - Writers who published in English before 1929 (Emerson, Thoreau, Blake) are
 *   genuinely quotable, and a handful of those are close to verbatim.
 * - Writers translated from another language (Tolstoy, Dostoevsky, Nietzsche,
 *   Schopenhauer, Rumi, Hafiz) get the same treatment as the ancient texts, for the
 *   same reason.
 * - Living or recently-deceased teachers are never quoted. Their core insight is
 *   restated in original language and credited as `Inspired by <name>`.
 *
 * The `source` field therefore names *where the teaching comes from*, not a book you
 * could look the sentence up in. Surface that honestly in the UI — see
 * `TEACHINGS_ATTRIBUTION_NOTE` below, which is written to be displayed verbatim.
 *
 * ## Editing rules
 *
 * **Only ever append.** A scheduled notification stores the index it was built with,
 * so reordering or deleting an entry re-points notifications already sitting in the
 * queue at the wrong teaching. Appending leaves every existing index valid.
 *
 * Appending does still change which teaching lands on which *date*, because the walk
 * is taken modulo the pool size (see `stride`). That is unavoidable in any scheme
 * that visits every entry exactly once, and it is harmless — any teaching suits any
 * day. The only visible seam: on the day you ship new entries, a notification queued
 * before the change shows the teaching it was built with (correct, since it carries
 * its own index), while opening the screen directly recomputes and may show a
 * different one. It resolves itself once the queue is topped up on next launch.
 */

export interface Teaching {
  teaching: string;
  source: string;
}

/**
 * Display this wherever teachings are shown (About screen, or a footer on the
 * teaching detail view). It is the honest disclosure that keeps the attributions
 * from reading as verbatim quotes.
 */
export const TEACHINGS_ATTRIBUTION_NOTE =
  'These teachings are rendered in original language rather than quoted from any ' +
  'particular translation. Attributions name the tradition or author the insight ' +
  'comes from. Modern teachers are never quoted directly — their teaching is ' +
  'restated and credited as "Inspired by."';

export const TEACHINGS: Teaching[] = [
  // ─────────────────────────────────────────────────────────────────
  // Dhammapada
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'Mind comes first. What you think again and again, you become.', source: 'Dhammapada' },
  { teaching: 'Hatred has never once been ended by hatred. It ends by its opposite.', source: 'Dhammapada' },
  { teaching: 'A fool who knows he is a fool is, in that much, wise.', source: 'Dhammapada' },
  { teaching: 'One day lived clearly is worth more than a hundred years lived asleep.', source: 'Dhammapada' },
  { teaching: 'Rain leaks into a badly roofed house. Craving leaks into an unguarded mind.', source: 'Dhammapada' },
  { teaching: 'Whatever harm an enemy can do you, an untrained mind does worse.', source: 'Dhammapada' },
  { teaching: 'One useful word, heard and settled into, outweighs a thousand ornamented ones.', source: 'Dhammapada' },
  { teaching: 'To master yourself is a greater victory than to take a thousand cities.', source: 'Dhammapada' },
  { teaching: 'Do not dismiss a small good act. A jar fills drop by drop.', source: 'Dhammapada' },
  { teaching: 'Hold back rising anger the way a driver holds a chariot on a turn.', source: 'Dhammapada' },
  { teaching: 'Set down what is gone. Set down what has not come. Look at what is here.', source: 'Dhammapada' },
  { teaching: 'Health is the greatest gain. Contentment is the greatest wealth.', source: 'Dhammapada' },
  { teaching: 'As a rock stands unmoved by wind, a settled mind stands unmoved by praise and blame.', source: 'Dhammapada' },
  { teaching: 'You are your own refuge. Look for no other.', source: 'Dhammapada' },
  { teaching: 'Where nothing is held, nothing can be lost, and nothing is left to fear.', source: 'Dhammapada' },
  { teaching: 'See this world as a bubble on water, as heat shimmering on a road.', source: 'Dhammapada' },
  { teaching: 'Guard the mind the way a border town is guarded. The gates matter more than the walls.', source: 'Dhammapada' },
  { teaching: 'Weeds ruin a field. Wanting ruins a life.', source: 'Dhammapada' },
  { teaching: 'Silence alone does not make a sage. Weighing what is true does.', source: 'Dhammapada' },
  { teaching: 'The path is walked by you. The awakened only point at it.', source: 'Dhammapada' },
  { teaching: 'Whoever wounds no living thing, by word or by hand, is called restrained.', source: 'Dhammapada' },
  { teaching: 'Better than a hundred hollow verses is one line that brings the mind to rest.', source: 'Dhammapada' },
  { teaching: 'Do not follow what is low. Do not live carelessly.', source: 'Dhammapada' },
  { teaching: 'As bees take nectar without harming the flower, move through the world lightly.', source: 'Dhammapada' },
  { teaching: 'The wise, hearing themselves corrected, take it the way one takes a gift.', source: 'Dhammapada' },
  { teaching: 'There is no fire like wanting. There is no chain like hatred.', source: 'Dhammapada' },
  { teaching: 'The night is long for the watchman. The road is long for the tired.', source: 'Dhammapada' },
  { teaching: 'Not by the shaven head, not by the robe. By what the hands have let go of.', source: 'Dhammapada' },
  { teaching: 'Whoever is certain the fault lies elsewhere has stopped learning.', source: 'Dhammapada' },
  { teaching: 'What is done is done. Attend to what you are doing now.', source: 'Dhammapada' },

  // ─────────────────────────────────────────────────────────────────
  // Saṃyutta Nikāya · Majjhima Nikāya · Sutta Nipāta · Udāna · Itivuttaka
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'Form is a heap of foam. Feeling is a bubble rising on water.', source: 'Saṃyutta Nikāya' },
  { teaching: 'Everything that has arisen has already begun to pass.', source: 'Saṃyutta Nikāya' },
  { teaching: 'You are struck by one arrow. Do not put the second one in yourself.', source: 'Saṃyutta Nikāya' },
  { teaching: 'Pain in the body is one thing. The story told about it is another.', source: 'Saṃyutta Nikāya' },
  { teaching: 'Find one thing in you that has not changed since this morning.', source: 'Saṃyutta Nikāya' },
  { teaching: 'The world burns with wanting, and calls the burning pleasure.', source: 'Saṃyutta Nikāya' },
  { teaching: 'The elements of this body were borrowed. They will be returned.', source: 'Saṃyutta Nikāya' },
  { teaching: 'When walking, know that you are walking. That is the whole instruction.', source: 'Majjhima Nikāya' },
  { teaching: 'Breathing in, know it. Breathing out, know it. Begin nowhere else.', source: 'Majjhima Nikāya' },
  { teaching: 'This body will be a corpse. Seeing that clearly is not morbid. It is accurate.', source: 'Majjhima Nikāya' },
  { teaching: 'A man shot with an arrow refuses treatment until he learns who made the bow.', source: 'Majjhima Nikāya' },
  { teaching: 'The teaching is a raft. Cross the river, then set it down.', source: 'Majjhima Nikāya' },
  { teaching: 'Nothing whatsoever is to be held as me, or as mine.', source: 'Majjhima Nikāya' },
  { teaching: 'Sit down. Straighten. Put attention on the breath and leave it there.', source: 'Majjhima Nikāya' },
  { teaching: 'Some questions are not worth answering. Set them aside and keep practicing.', source: 'Majjhima Nikāya' },
  { teaching: 'Wander alone, harming nothing, like a rhinoceros with its single horn.', source: 'Sutta Nipāta' },
  { teaching: 'As water does not stay on a lotus leaf, let nothing stay on you.', source: 'Sutta Nipāta' },
  { teaching: 'Whoever is attached nowhere has left grief no door.', source: 'Sutta Nipāta' },
  { teaching: 'A well-thrown word can wound for a lifetime. Weigh it before it leaves.', source: 'Sutta Nipāta' },
  { teaching: 'Do not measure yourself as better, worse, or equal. Drop the measuring.', source: 'Sutta Nipāta' },
  { teaching: 'The sage does not build a house inside any view.', source: 'Sutta Nipāta' },
  { teaching: 'There is an unborn, an unmade. Were there not, there would be no way out.', source: 'Udāna' },
  { teaching: 'Where there is no here, no there, and nothing between, suffering ends.', source: 'Udāna' },
  { teaching: 'As the ocean has one taste, salt, this training has one taste: release.', source: 'Udāna' },
  { teaching: 'Two things are worth doing: seeing clearly what harms, and setting it down.', source: 'Itivuttaka' },
  { teaching: 'Give what you can, even a little. A small gift given openly is not small.', source: 'Itivuttaka' },
  { teaching: 'Of all the things to keep in mind, keep in mind that you will die.', source: 'Itivuttaka' },
  { teaching: 'Craving stitches one moment to the next, then calls the seam a self.', source: 'Pāli Canon' },
  { teaching: 'Do not accept this because I said it. Test it as a goldsmith tests gold.', source: 'Pāli Canon' },
  { teaching: 'Holding anger is picking up a hot coal to throw. Notice whose hand burns.', source: 'Pāli tradition' },

  // ─────────────────────────────────────────────────────────────────
  // Zen · Chan
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'A monk asked whether a dog has buddha nature. Joshu said: no.', source: 'Mumonkan' },
  { teaching: 'Show me the face you had before your parents met.', source: 'Mumonkan' },
  { teaching: 'The gate has no gate. How will you pass through it?', source: 'Mumonkan' },
  { teaching: 'A monk asked what the teaching was. Joshu said: the cypress in the courtyard.', source: 'Joshu' },
  { teaching: 'Have you eaten? Then go and wash your bowl.', source: 'Joshu' },
  { teaching: 'Joshu was asked where the way is. He said: just outside the gate.', source: 'Joshu' },
  { teaching: 'Ordinary mind is the way.', source: 'Nansen' },
  { teaching: 'Every day is a good day.', source: 'Yunmen' },
  { teaching: 'Asked for the teaching of a lifetime, Yunmen said: an appropriate response.', source: 'Yunmen' },
  { teaching: 'Medicine and sickness cure one another. The whole earth is medicine.', source: 'Yunmen' },
  { teaching: 'Asked the highest meaning of the holy truth: empty, and nothing holy in it.', source: 'Blue Cliff Record' },
  { teaching: 'The emperor asked who stood before him. Bodhidharma said: I do not know.', source: 'Bodhidharma' },
  { teaching: 'Point straight at the mind. Do not lean on words.', source: 'Bodhidharma' },
  { teaching: 'To look for the buddha outside your own mind is to hunt for footprints in the sky.', source: 'Bodhidharma' },
  { teaching: 'If you meet the Buddha on the road, do not stop to worship. Keep walking.', source: 'Linji' },
  { teaching: 'You are already complete, and you spend your days looking for a head you never lost.', source: 'Linji' },
  { teaching: 'Do not borrow another set of eyes.', source: 'Linji' },
  { teaching: 'There is nothing to grasp, and it is not far away.', source: 'Linji' },
  { teaching: 'Guest and host trade places all day long and nobody notices.', source: 'Linji' },
  { teaching: 'The way is wide as open space. Nothing is missing and nothing is extra.', source: 'Xinxin Ming' },
  { teaching: 'Try to still the movement and your stillness will move.', source: 'Xinxin Ming' },
  { teaching: 'Prefer nothing, and the way is plain.', source: 'Xinxin Ming' },
  { teaching: 'Setting truth against falsehood is the sickness of the mind.', source: 'Xinxin Ming' },
  { teaching: 'One is all, and all is one. Hold that, and the argument is over.', source: 'Xinxin Ming' },
  { teaching: 'Stop talking. Stop thinking. Then there is nothing you will not understand.', source: 'Xinxin Ming' },
  { teaching: 'Do not go looking for the truth. Only stop cherishing opinions.', source: 'Xinxin Ming' },
  { teaching: 'When the mind stops choosing, the ten thousand things are one thing.', source: 'Xinxin Ming' },
  { teaching: 'To study yourself is to forget yourself.', source: 'Dōgen' },
  { teaching: 'Find your place where you stand, and practice begins there.', source: 'Dōgen' },
  { teaching: 'A fish does not leave the water and call that enlightenment.', source: 'Dōgen' },
  { teaching: 'Nobody sits their way to the far shore. The sitting is the shore.', source: 'Dōgen' },
  { teaching: 'Practice with the whole body, or do not call it practice.', source: 'Dōgen' },
  { teaching: 'What is the sound of one hand?', source: 'Hakuin' },
  { teaching: 'This very body is the buddha. This very place is the lotus land.', source: 'Hakuin' },
  { teaching: 'Sit still and do nothing. Spring arrives. The grass grows without help.', source: 'Zenrin Kushu' },
  { teaching: 'Before awakening: chop wood, carry water. After awakening: chop wood, carry water.', source: 'Zen proverb' },
  { teaching: 'Do not mistake the finger for the moon.', source: 'Chan tradition' },
  { teaching: 'Nothing is hidden. That is exactly why it is hard to find.', source: 'Chan tradition' },
  { teaching: 'Not knowing is nearest.', source: 'Chan tradition' },
  { teaching: 'A monk asked where to begin. The teacher said: from where you are standing.', source: 'Chan tradition' },
  { teaching: 'The word water has never once been wet.', source: 'Chan tradition' },
  { teaching: 'When thirsty, you do not study the well. You drink.', source: 'Chan tradition' },
  { teaching: 'You cannot step off the way. That is what makes it the way.', source: 'Chan tradition' },
  { teaching: 'The great way has no gate, and a thousand roads enter it.', source: 'Chan tradition' },
  { teaching: 'When you are hungry, eat. When you are tired, sleep. Where is the mystery?', source: 'Chan tradition' },
  { teaching: 'Sit as a mountain sits, and add nothing to it.', source: 'Zen tradition' },
  { teaching: 'The moon does not plan to be reflected. The water does not plan to reflect.', source: 'Zen tradition' },
  { teaching: 'Snow falls into the sea and leaves no trace.', source: 'Zen tradition' },
  { teaching: 'A cracked bowl still holds water. Use it.', source: 'Zen tradition' },
  { teaching: 'The bell does not decide when it is struck.', source: 'Zen tradition' },
  { teaching: 'Sweep the yard. That is enough for now.', source: 'Zen tradition' },
  { teaching: 'Empty-handed I came. Empty-handed I go.', source: 'Zen tradition' },
  { teaching: 'What are you doing right now? Answer before you think.', source: 'Zen tradition' },

  // ─────────────────────────────────────────────────────────────────
  // Dzogchen · Mahamudra
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'Recognize your own nature. Settle on that single point. Trust the release.', source: 'Garab Dorje' },
  { teaching: 'Awareness has no shape, no color, no location — and it is not absent.', source: 'Garab Dorje' },
  { teaching: 'Nothing needs adding. Nothing needs removing. Look now.', source: 'Garab Dorje' },
  { teaching: 'Do not correct the mind. Let it settle the way silt settles in still water.', source: 'Longchenpa' },
  { teaching: 'Thoughts rise in awareness the way waves rise in water, not as intruders.', source: 'Longchenpa' },
  { teaching: 'Leave it as it is. That is the whole practice, and the hardest part.', source: 'Longchenpa' },
  { teaching: 'Whatever appears, appears in awareness, and awareness is not stained by it.', source: 'Longchenpa' },
  { teaching: 'The one searching is the one being searched for.', source: 'Longchenpa' },
  { teaching: 'Rest without a reference point, and see what remains.', source: 'Longchenpa' },
  { teaching: 'Do not follow the thought. Do not fight it. Watch where it goes unattended.', source: 'Longchenpa' },
  { teaching: 'Everything that appears is the ornament of what is aware.', source: 'Longchenpa' },
  { teaching: 'Nothing here is under construction.', source: 'Jigme Lingpa' },
  { teaching: 'All this appearing, and not one solid thing in it.', source: 'Jigme Lingpa' },
  { teaching: 'Devotion opens what analysis cannot.', source: 'Jigme Lingpa' },
  { teaching: 'Practice until the practice and the day are the same length.', source: 'Jigme Lingpa' },
  { teaching: 'Let the mind be like an old man watching children play.', source: 'Mahamudra tradition' },
  { teaching: 'Do not think, do not analyze, do not meditate. Rest without contriving.', source: 'Mahamudra tradition' },
  { teaching: 'Look at the looker. There is no second one there.', source: 'Mahamudra tradition' },
  { teaching: 'Too tight and the mind hardens. Too loose and it scatters. Find the middle tension.', source: 'Mahamudra tradition' },
  { teaching: 'Ordinary mind, unaltered, is the destination.', source: 'Mahamudra tradition' },
  { teaching: 'Between one thought and the next there is a gap. Live there.', source: 'Mahamudra tradition' },
  { teaching: 'What is watching the breath? Turn and look.', source: 'Mahamudra tradition' },
  { teaching: 'Water that is not stirred clears itself.', source: 'Mahamudra tradition' },
  { teaching: 'Let the body be still, the breath be ordinary, the mind be unmanaged.', source: 'Mahamudra tradition' },
  { teaching: 'Ground, path, and result have one taste.', source: 'Mahamudra tradition' },
  { teaching: 'Space does not need clearing.', source: 'Dzogchen tradition' },
  { teaching: 'Trying to be aware is one more thought. Drop it and notice what is left.', source: 'Dzogchen tradition' },
  { teaching: 'There is no meditator. There is only meditation, and then not even that.', source: 'Dzogchen tradition' },
  { teaching: 'Do not take the clouds as proof there is no sky.', source: 'Dzogchen tradition' },
  { teaching: 'Recognition takes an instant. Familiarity takes a life.', source: 'Dzogchen tradition' },
  { teaching: 'Whatever you call it, it was here before the name.', source: 'Dzogchen tradition' },
  { teaching: 'If awareness could be lost, you would have lost it already.', source: 'Dzogchen tradition' },
  { teaching: 'The path is short. The habits are long.', source: 'Dzogchen tradition' },
  { teaching: 'Do not wait for a better mind to practice with.', source: 'Dzogchen tradition' },
  { teaching: 'Do not build a better cage. The door was never locked.', source: 'Dzogchen tradition' },

  // ─────────────────────────────────────────────────────────────────
  // Advaita
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'Ask who is asking. Follow that question and no other.', source: 'Ramana Maharshi' },
  { teaching: 'The thought I comes first. Every other thought is its guest.', source: 'Ramana Maharshi' },
  { teaching: 'Silence is the loudest teaching, and it never needs translating.', source: 'Ramana Maharshi' },
  { teaching: 'You are not the one who wakes and sleeps. You are what notices both.', source: 'Ramana Maharshi' },
  { teaching: 'You are not wrong to want happiness. You are looking in the wrong direction.', source: 'Ramana Maharshi' },
  { teaching: 'Last night in dreamless sleep you did not cease. Who stayed?', source: 'Ramana Maharshi' },
  { teaching: 'There is no reaching. There is only ceasing to overlook.', source: 'Ramana Maharshi' },
  { teaching: 'Whose problem is it? Find the owner, and the problem often thins out.', source: 'Ramana Maharshi' },
  { teaching: 'Let what comes come. Let what goes go. Find out what stays.', source: 'Ramana Maharshi' },
  { teaching: 'The mind turned outward becomes the world. Turned inward, it becomes the self.', source: 'Ramana Maharshi' },
  { teaching: 'Do not try to still the mind. Ask instead whose mind it is.', source: 'Ramana Maharshi' },
  { teaching: 'Death takes the body. Find out today whether it takes you.', source: 'Ramana Maharshi' },
  { teaching: 'Whatever you do, do it as though it were being done through you.', source: 'Ramana Maharshi' },
  { teaching: 'You were never bound. What exactly are you trying to free?', source: 'Ashtavakra Gita' },
  { teaching: 'You are not in the body. The body is in you, as a jar sits in space.', source: 'Ashtavakra Gita' },
  { teaching: 'Desire and aversion belong to the mind. The mind is not you.', source: 'Ashtavakra Gita' },
  { teaching: 'Waves rise and fall. The sea gains nothing and loses nothing.', source: 'Ashtavakra Gita' },
  { teaching: 'Doing and not doing are both fine. Neither one adds to you.', source: 'Ashtavakra Gita' },
  { teaching: 'Give up the effort of giving things up.', source: 'Ashtavakra Gita' },
  { teaching: 'Knowing you are nothing in particular, you are at ease anywhere.', source: 'Ashtavakra Gita' },
  { teaching: 'The world appears in you. You do not appear in it.', source: 'Ashtavakra Gita' },
  { teaching: 'No teacher, no student, no teaching. And still: sit down.', source: 'Avadhuta Gita' },
  { teaching: 'How could what is everywhere be attained?', source: 'Avadhuta Gita' },
  { teaching: 'Neither bound nor free, neither pure nor stained. Such is awareness.', source: 'Avadhuta Gita' },
  { teaching: 'There is no coming and going for one who is already here.', source: 'Avadhuta Gita' },
  { teaching: 'Before the first thought this morning, you were already present.', source: 'Advaita tradition' },
  { teaching: 'You search everywhere for the one who is searching.', source: 'Advaita tradition' },
  { teaching: 'The screen is never wet, though rivers cross it.', source: 'Advaita tradition' },
  { teaching: 'Attention can be turned around. That is the entire method.', source: 'Advaita tradition' },
  { teaching: 'What is aware of confusion is not confused.', source: 'Advaita tradition' },
  { teaching: 'The seeker is the last thing to be seen through.', source: 'Advaita tradition' },
  { teaching: 'Whatever can be described is not the one describing.', source: 'Advaita tradition' },
  { teaching: 'You will not find the eye by looking harder.', source: 'Advaita tradition' },
  { teaching: 'Being does not require your permission.', source: 'Advaita tradition' },
  { teaching: 'Grace is not withheld. Attention is.', source: 'Advaita tradition' },

  // ─────────────────────────────────────────────────────────────────
  // Taoism
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'The way that can be named is not the way.', source: 'Tao Te Ching' },
  { teaching: 'Water takes the lowest place, and wears down stone.', source: 'Tao Te Ching' },
  { teaching: 'Knowing others is knowledge. Knowing yourself is clarity.', source: 'Tao Te Ching' },
  { teaching: 'Do less. Understand more.', source: 'Tao Te Ching' },
  { teaching: 'A cup is useful because it is empty.', source: 'Tao Te Ching' },
  { teaching: 'The soft outlasts the hard. The yielding outlasts the rigid.', source: 'Tao Te Ching' },
  { teaching: 'Muddy water clears if you leave it alone.', source: 'Tao Te Ching' },
  { teaching: 'Whoever is content is already wealthy.', source: 'Tao Te Ching' },
  { teaching: 'A journey of a thousand miles begins beneath your foot.', source: 'Tao Te Ching' },
  { teaching: 'Those who know do not talk much. Those who talk much do not know.', source: 'Tao Te Ching' },
  { teaching: 'Act without forcing, and nothing is left undone.', source: 'Tao Te Ching' },
  { teaching: 'Fill the bowl too full and you will spill it carrying it.', source: 'Tao Te Ching' },
  { teaching: 'Thirty spokes, and the wheel turns on the hole at the center.', source: 'Tao Te Ching' },
  { teaching: 'Great skill looks like doing nothing much.', source: 'Tao Te Ching' },
  { teaching: 'Stop working to be admired, and there is nothing left to defend.', source: 'Tao Te Ching' },
  { teaching: 'Heaven and earth play no favorites, and the rain comes down anyway.', source: 'Tao Te Ching' },
  { teaching: 'To know that you do not know is the beginning of health.', source: 'Tao Te Ching' },
  { teaching: 'The tree that bends survives the storm the stiff one loses to.', source: 'Tao Te Ching' },
  { teaching: 'Be like a valley. Everything flows to it because it does not compete.', source: 'Tao Te Ching' },
  { teaching: 'Meet the small task with the same care as the large one.', source: 'Tao Te Ching' },
  { teaching: 'I dreamt I was a butterfly, and cannot say which of us is dreaming now.', source: 'Zhuangzi' },
  { teaching: 'The useless tree is the one no axe wants. It grows old.', source: 'Zhuangzi' },
  { teaching: 'A frog in a well describes the sky exactly.', source: 'Zhuangzi' },
  { teaching: 'The trap is forgotten once the fish is caught. So it is with words.', source: 'Zhuangzi' },
  { teaching: 'The cook keeps his blade sharp by going where the joints already open.', source: 'Zhuangzi' },
  { teaching: 'When the shoe fits, the foot is forgotten.', source: 'Zhuangzi' },
  { teaching: 'Do not argue with a man who is certain. Go for a walk instead.', source: 'Zhuangzi' },
  { teaching: 'He who knows he is a fool is not the greatest fool.', source: 'Zhuangzi' },
  { teaching: 'Let the mind work like a mirror. It receives everything and stores nothing.', source: 'Zhuangzi' },
  { teaching: 'Death and life are one long weather.', source: 'Zhuangzi' },
  { teaching: 'Go where the day is already going, and arrive without exhaustion.', source: 'Zhuangzi' },
  { teaching: 'Emptiness is not lack. It is room.', source: 'Taoist tradition' },
  { teaching: 'The sage does not hurry, and finishes.', source: 'Taoist tradition' },
  { teaching: 'The tongue outlasts the teeth.', source: 'Taoist tradition' },
  { teaching: 'Stop measuring the wind. Set the sail.', source: 'Taoist tradition' },

  // ─────────────────────────────────────────────────────────────────
  // Stoicism
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'You could leave life right now. Let that decide what you do next.', source: 'Marcus Aurelius' },
  { teaching: 'What stands in your path is material for the work, not an interruption of it.', source: 'Marcus Aurelius' },
  { teaching: 'Confine yourself to the present. The rest is memory and rehearsal.', source: 'Marcus Aurelius' },
  { teaching: 'Events are outside you. Your judgment of them is not.', source: 'Marcus Aurelius' },
  { teaching: 'When you wake, remember what a rare thing it is to be awake at all.', source: 'Marcus Aurelius' },
  { teaching: 'Ask of each thing: what is this, in itself? What is it made of?', source: 'Marcus Aurelius' },
  { teaching: 'People will act badly. Expecting otherwise is the only real surprise.', source: 'Marcus Aurelius' },
  { teaching: 'Stop debating what a good person is. Become one and end the argument.', source: 'Marcus Aurelius' },
  { teaching: 'Notice how quickly everything is forgotten, and let that lighten you.', source: 'Marcus Aurelius' },
  { teaching: 'Do the work in front of you as if it were the last thing you would do.', source: 'Marcus Aurelius' },
  { teaching: 'Nothing that happens to a person falls outside what a person can carry.', source: 'Marcus Aurelius' },
  { teaching: 'Retire into yourself. The mind you carry is quieter than any countryside.', source: 'Marcus Aurelius' },
  { teaching: 'Do not be disgusted, discouraged, or impatient with what you must repeat.', source: 'Marcus Aurelius' },
  { teaching: 'Anger at events is absurd. Events do not know that you are angry.', source: 'Marcus Aurelius' },
  { teaching: 'You are a small stream in a long river. Behave accordingly.', source: 'Marcus Aurelius' },
  { teaching: 'Remove your judgment about the harm, and the harm goes with it.', source: 'Marcus Aurelius' },
  { teaching: 'Whatever anyone else does or says, your work is to be decent.', source: 'Marcus Aurelius' },
  { teaching: 'The same nature that handed you breath comes to take it. No one is being wronged.', source: 'Marcus Aurelius' },
  { teaching: 'Some things are up to you. Most are not. Sorting them is the whole practice.', source: 'Epictetus' },
  { teaching: 'It is not what happens that disturbs you, but what you decide it means.', source: 'Epictetus' },
  { teaching: 'You do not control the play. You can only act your part well.', source: 'Epictetus' },
  { teaching: 'Do not wish things were otherwise. Wish to see them as they are.', source: 'Epictetus' },
  { teaching: 'When someone insults you, notice that the sting is your agreement with them.', source: 'Epictetus' },
  { teaching: 'Say little at gatherings, and only when it is your turn.', source: 'Epictetus' },
  { teaching: 'Do not explain your philosophy. Embody it.', source: 'Epictetus' },
  { teaching: 'If someone speaks ill of you, ask whether it is true before it is offensive.', source: 'Epictetus' },
  { teaching: 'What broke was always breakable. You knew that when you took it up.', source: 'Epictetus' },
  { teaching: 'Kiss your child goodnight knowing they are mortal. Now you have kissed them.', source: 'Epictetus' },
  { teaching: 'A man who needs the day to go his way is owned by the day.', source: 'Epictetus' },
  { teaching: 'The body is on loan, like the room you sleep in on a journey.', source: 'Epictetus' },
  { teaching: 'First say what you would be. Then do the work that follows from it.', source: 'Epictetus' },
  { teaching: 'Do not be a philosopher at dinner. Be one when it costs you something.', source: 'Epictetus' },
  { teaching: 'You have two ears and one mouth. Use them in that proportion.', source: 'Stoic tradition' },
  { teaching: 'Most of the suffering happens in rehearsal, not in the event.', source: 'Seneca' },
  { teaching: 'You act as if you will live forever. Look at how much of today you gave away.', source: 'Seneca' },
  { teaching: 'The life is long enough. You spent most of it somewhere else.', source: 'Seneca' },
  { teaching: 'No mind is at rest if it is always packing for somewhere else.', source: 'Seneca' },
  { teaching: 'Begin living at once, and count each day as a life of its own.', source: 'Seneca' },
  { teaching: 'To be everywhere is to be nowhere. Stay long enough to know a place.', source: 'Seneca' },
  { teaching: 'What fortune gave, it can take back. Hold it the way a guest holds a cup.', source: 'Seneca' },
  { teaching: 'Whoever fears death will never do anything worthy of the living.', source: 'Seneca' },
  { teaching: 'Retire into yourself often, and choose your company carefully.', source: 'Seneca' },
  { teaching: 'No one is poor whose wants are within reach.', source: 'Seneca' },
  { teaching: 'Rehearse misfortune quietly, so that it does not arrive as a stranger.', source: 'Seneca' },
  { teaching: 'Anger is a brief madness. Wait, and it will end before you act.', source: 'Seneca' },
  { teaching: 'Count each day as the last, and each unexpected morning as a gift.', source: 'Seneca' },

  // ─────────────────────────────────────────────────────────────────
  // Christian mysticism
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'Look at the birds. They store nothing, and they are fed.', source: 'Gospel sayings of Jesus' },
  { teaching: 'Do not worry about tomorrow. Today asks enough of you.', source: 'Gospel sayings of Jesus' },
  { teaching: 'No one will point and say, there it is. It is inside you.', source: 'Gospel sayings of Jesus' },
  { teaching: 'Why study the speck in another eye and not the beam in your own?', source: 'Gospel sayings of Jesus' },
  { teaching: 'Whoever works hardest to keep his life is the one who loses it.', source: 'Gospel sayings of Jesus' },
  { teaching: 'Consider the lilies. They neither labor nor worry, and nothing is added to them.', source: 'Gospel sayings of Jesus' },
  { teaching: 'Ask, and keep asking. Knock, and keep knocking.', source: 'Gospel sayings of Jesus' },
  { teaching: 'Enter your room, shut the door, and pray where no one is watching.', source: 'Gospel sayings of Jesus' },
  { teaching: 'A single wholehearted thank you is already a complete prayer.', source: 'Meister Eckhart' },
  { teaching: 'What you are looking for is nearer to you than you are to yourself.', source: 'Meister Eckhart' },
  { teaching: 'To be empty of things is to be full of God.', source: 'Meister Eckhart' },
  { teaching: 'The seeing goes both ways, and there is only one seeing.', source: 'Meister Eckhart' },
  { teaching: 'Stop adding to your prayer. Subtract from it.', source: 'Meister Eckhart' },
  { teaching: 'The soul does not grow by addition. It grows by subtraction.', source: 'Meister Eckhart' },
  { teaching: 'Let the world pass through you and find nothing to catch on.', source: 'Meister Eckhart' },
  { teaching: 'Do not ask where God is. Ask where you have not been looking.', source: 'Meister Eckhart' },
  { teaching: 'Whoever is at home in the present is at home in eternity.', source: 'Meister Eckhart' },
  { teaching: 'Between you and what you seek there is a cloud of not knowing. Stay in it.', source: 'The Cloud of Unknowing' },
  { teaching: 'Beat on that darkness with one short word, and do not explain the word.', source: 'The Cloud of Unknowing' },
  { teaching: 'Thought cannot reach it. Longing can.', source: 'The Cloud of Unknowing' },
  { teaching: 'Put all your knowing beneath a cloud of forgetting.', source: 'The Cloud of Unknowing' },
  { teaching: 'One word held simply is better than many words held cleverly.', source: 'The Cloud of Unknowing' },
  { teaching: 'Do not strain. Strain is the mind refusing to be quiet.', source: 'The Cloud of Unknowing' },
  { teaching: 'Let nothing shake you. All of it passes. Only what is true stays.', source: 'Teresa of Ávila' },
  { teaching: 'Prayer is a conversation with someone you know is listening.', source: 'Teresa of Ávila' },
  { teaching: 'The soul is a castle of many rooms. Most of us live in the entryway.', source: 'Teresa of Ávila' },
  { teaching: 'Patience finishes everything that hurry cannot.', source: 'Teresa of Ávila' },
  { teaching: 'There is no need to shout. The one you address is not far off.', source: 'Teresa of Ávila' },
  { teaching: 'Do not be discouraged by a wandering mind. Return, and return again.', source: 'Teresa of Ávila' },
  { teaching: 'To reach what you have not known, travel by a road you cannot map.', source: 'John of the Cross' },
  { teaching: 'More light than the eye can take is indistinguishable from darkness.', source: 'John of the Cross' },
  { teaching: 'At the end you will be examined on one subject only: love.', source: 'John of the Cross' },
  { teaching: 'Where you find no love, bring some, and then there will be love there.', source: 'John of the Cross' },
  { teaching: 'Silence is the first language of the one you are seeking.', source: 'John of the Cross' },
  { teaching: 'Let go of the ladder once you are standing on the roof.', source: 'John of the Cross' },

  // ─────────────────────────────────────────────────────────────────
  // Sufism
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'What broke in you is the opening. Do not rush to seal it.', source: 'Rumi' },
  { teaching: 'You have searched the whole world for something that was never lost.', source: 'Rumi' },
  { teaching: 'Say less. The heart was never fluent in explanation.', source: 'Rumi' },
  { teaching: 'The reed sings because it was cut from the reed bed.', source: 'Rumi' },
  { teaching: 'Stories of other crossings will not carry you across. Walk.', source: 'Rumi' },
  { teaching: 'Grief empties the room so that something else can be set down in it.', source: 'Rumi' },
  { teaching: 'Beyond the argument about who is right there is open ground. Meet there.', source: 'Rumi' },
  { teaching: 'The night is not the enemy of the lamp.', source: 'Rumi' },
  { teaching: 'The thing you are looking for is also looking.', source: 'Rumi' },
  { teaching: 'Trade some of your cleverness for honest bewilderment.', source: 'Rumi' },
  { teaching: 'Do not grieve. Whatever leaves comes back wearing another shape.', source: 'Rumi' },
  { teaching: 'Water carves the stone without arguing.', source: 'Rumi' },
  { teaching: 'The tavern keeper knows more about the heart than the preacher does.', source: 'Hafiz' },
  { teaching: 'I learned nothing from the pious that the wine did not teach better.', source: 'Hafiz' },
  { teaching: 'Do not measure the rose by the length of its season.', source: 'Hafiz' },
  { teaching: 'The one you are looking for has never once left the room.', source: 'Hafiz' },
  { teaching: 'Your face is the whole book. I have stopped reading the commentaries.', source: 'Hafiz' },
  { teaching: 'Let go of the rug you were saving for a better prayer.', source: 'Hafiz' },
  { teaching: 'Sorrow is a guest. Set a place for it and it will not take the house.', source: 'Hafiz' },
  { teaching: 'The nightingale does not ask what the song is for.', source: 'Hafiz' },
  { teaching: 'Trust the rope, and still tie the camel.', source: 'Sufi tradition' },
  { teaching: 'Die before you die, and you will not have to die again.', source: 'Sufi tradition' },
  { teaching: 'First knowledge, then practice, then the setting down of both.', source: 'Sufi tradition' },

  // ─────────────────────────────────────────────────────────────────
  // Public-domain writers
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'There is one time that matters: now. One person: the one in front of you.', source: 'Leo Tolstoy' },
  { teaching: 'Everyone wants to change the world. Nobody wants to change himself.', source: 'Leo Tolstoy' },
  { teaching: 'The strongest of warriors is the one who has learned to wait.', source: 'Leo Tolstoy' },
  { teaching: 'Whoever does not know his own smallness will never see anything large.', source: 'Leo Tolstoy' },
  { teaching: 'Real life happens in small changes, not in the events you would report.', source: 'Leo Tolstoy' },
  { teaching: 'If you feel no pain at all, some part of your life is asleep.', source: 'Leo Tolstoy' },
  { teaching: 'Take hold of the moments of happiness. They are the whole of it.', source: 'Leo Tolstoy' },
  { teaching: 'Love a person in their ordinariness, not in your idea of them.', source: 'Fyodor Dostoevsky' },
  { teaching: 'To love someone is to see what they were meant to be when no one else does.', source: 'Fyodor Dostoevsky' },
  { teaching: 'Nothing is easier than condemning the one who has failed.', source: 'Fyodor Dostoevsky' },
  { teaching: 'Often the only door left open is the one that suffering opens.', source: 'Fyodor Dostoevsky' },
  { teaching: 'A person can get used to almost anything. That is both a mercy and a danger.', source: 'Fyodor Dostoevsky' },
  { teaching: 'Beauty is the battlefield, and the fight is inside the man looking at it.', source: 'Fyodor Dostoevsky' },
  { teaching: 'Give a person a why and they will carry almost any how.', source: 'Friedrich Nietzsche' },
  { teaching: 'Stare long into the dark and it begins to return the look.', source: 'Friedrich Nietzsche' },
  { teaching: 'Become who you already are.', source: 'Friedrich Nietzsche' },
  { teaching: 'The surest way to ruin a person is to teach them to distrust their own senses.', source: 'Friedrich Nietzsche' },
  { teaching: 'The thoughts worth keeping arrive while walking, not while sitting at a desk.', source: 'Friedrich Nietzsche' },
  { teaching: 'Love your fate. Not because it is kind, but because it is yours.', source: 'Friedrich Nietzsche' },
  { teaching: 'There is more wisdom in your body than in your best conclusions.', source: 'Friedrich Nietzsche' },
  { teaching: 'We rarely think about what we have, and constantly about what we lack.', source: 'Arthur Schopenhauer' },
  { teaching: 'Talent hits a target others can see. Genius hits one no one else can find.', source: 'Arthur Schopenhauer' },
  { teaching: 'Compassion is the whole basis of morality. The rest is decoration.', source: 'Arthur Schopenhauer' },
  { teaching: 'You are most yourself when no one is watching. Spend time there.', source: 'Arthur Schopenhauer' },
  { teaching: 'Life swings between wanting a thing and being bored of having it.', source: 'Arthur Schopenhauer' },
  { teaching: 'The first forty years write the text. The rest is commentary.', source: 'Arthur Schopenhauer' },
  { teaching: 'Nothing can bring you peace but yourself.', source: 'Ralph Waldo Emerson' },
  { teaching: 'Adopt the pace of nature. Her secret is patience.', source: 'Ralph Waldo Emerson' },
  { teaching: 'The years teach much which the days never know.', source: 'Ralph Waldo Emerson' },
  { teaching: 'To be great is to be misunderstood.', source: 'Ralph Waldo Emerson' },
  { teaching: 'Finish each day and be done with it.', source: 'Ralph Waldo Emerson' },
  { teaching: 'A person is what they think about all day long.', source: 'Ralph Waldo Emerson' },
  { teaching: 'I went to the woods because I wished to live deliberately.', source: 'Henry David Thoreau' },
  { teaching: 'Our life is frittered away by detail. Simplify.', source: 'Henry David Thoreau' },
  { teaching: 'It is not enough to be busy. The ants are busy. What are we busy about?', source: 'Henry David Thoreau' },
  { teaching: 'The price of a thing is the amount of life you exchange for it.', source: 'Henry David Thoreau' },
  { teaching: 'Only that day dawns to which we are awake.', source: 'Henry David Thoreau' },
  { teaching: 'In wildness is the preservation of the world.', source: 'Henry David Thoreau' },
  { teaching: 'I never found a companion so companionable as solitude.', source: 'Henry David Thoreau' },
  { teaching: 'To see a world in a grain of sand, and heaven in a wild flower.', source: 'William Blake' },
  { teaching: 'If the doors of perception were cleansed, everything would appear as it is: infinite.', source: 'William Blake' },
  { teaching: 'Eternity is in love with the productions of time.', source: 'William Blake' },
  { teaching: 'The road of excess leads to the palace of wisdom.', source: 'William Blake' },
  { teaching: 'He who binds to himself a joy does the winged life destroy.', source: 'William Blake' },

  // ─────────────────────────────────────────────────────────────────
  // Modern teachers — original phrasing, credited as inspiration
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'You cannot get wet from the word water, or free from the word freedom.', source: 'Inspired by Alan Watts' },
  { teaching: 'Gripping the present is like carrying water in a fist.', source: 'Inspired by Alan Watts' },
  { teaching: 'You are not a passenger in the world. You are one of the ways it happens.', source: 'Inspired by Alan Watts' },
  { teaching: 'Insisting on security is the very thing that makes you feel unsafe.', source: 'Inspired by Alan Watts' },
  { teaching: 'Nobody hurries through a piece of music to reach the final chord.', source: 'Inspired by Alan Watts' },
  { teaching: 'Stop looking for the meaning behind the day. Look at the day.', source: 'Inspired by Alan Watts' },
  { teaching: 'Do not use practice as a respectable way of avoiding your life.', source: 'Inspired by Chögyam Trungpa' },
  { teaching: 'The ego is glad to take up meditation, and will tell you how well it is going.', source: 'Inspired by Chögyam Trungpa' },
  { teaching: 'Stay with the boredom. It is more honest than the interesting states.', source: 'Inspired by Chögyam Trungpa' },
  { teaching: 'Be willing to be sad without turning it into a story.', source: 'Inspired by Chögyam Trungpa' },
  { teaching: 'Bravery is staying in the room when nothing is coming to reassure you.', source: 'Inspired by Chögyam Trungpa' },
  { teaching: 'There is no ground under you. There never was, and you have been walking anyway.', source: 'Inspired by Chögyam Trungpa' },
  { teaching: 'Washing the dishes is not something to get through so you can rest.', source: 'Inspired by Thich Nhat Hanh' },
  { teaching: 'Breathe, and know that you are breathing. The rest follows from that.', source: 'Inspired by Thich Nhat Hanh' },
  { teaching: 'Walk as though the ground were glad to hold you.', source: 'Inspired by Thich Nhat Hanh' },
  { teaching: 'Anger is a child crying. It does not need an argument. It needs attention.', source: 'Inspired by Thich Nhat Hanh' },
  { teaching: 'You will not arrive at peace. You can walk peacefully now.', source: 'Inspired by Thich Nhat Hanh' },
  { teaching: 'This cup of tea is enough of an event.', source: 'Inspired by Thich Nhat Hanh' },
  { teaching: 'You are already here. The work is noticing how often you leave.', source: 'Inspired by Ram Dass' },
  { teaching: 'Treat everyone you meet as part of your own training.', source: 'Inspired by Ram Dass' },
  { teaching: 'When you reach the end of your certainty, you have arrived somewhere useful.', source: 'Inspired by Ram Dass' },
  { teaching: 'Stop defending yourself for one minute. What is left standing is love.', source: 'Inspired by Ram Dass' },
  { teaching: 'Your family will show you how far your practice has gone.', source: 'Inspired by Ram Dass' },
  { teaching: 'What you refuse to look at inside you will arrive later as circumstance.', source: 'Inspired by Carl Jung' },
  { teaching: 'The parts of yourself you hide do not leave. They wait.', source: 'Inspired by Carl Jung' },
  { teaching: 'There is no light without something solid to cast a shadow.', source: 'Inspired by Carl Jung' },
  { teaching: 'What stays unexamined runs the day, and takes the name of fate.', source: 'Inspired by Carl Jung' },
  { teaching: 'The middle of life asks a different question than the first half did.', source: 'Inspired by Carl Jung' },
  { teaching: 'Do not work at being good. Work at being whole.', source: 'Inspired by Carl Jung' },
  { teaching: 'The cave you are afraid to enter holds the thing you went looking for.', source: 'Inspired by Joseph Campbell' },
  { teaching: 'Every road worth walking begins with a refusal to walk it.', source: 'Inspired by Joseph Campbell' },
  { teaching: 'Let go of the life you planned so the one you have can arrive.', source: 'Inspired by Joseph Campbell' },
  { teaching: 'Every myth is a map of one person\'s interior. Read your own.', source: 'Inspired by Joseph Campbell' },
  { teaching: 'Do not be serious about being spiritual. Seriousness is an illness of the ego.', source: 'Inspired by Osho' },
  { teaching: 'Sit without a goal, including the goal of sitting well.', source: 'Inspired by Osho' },
  { teaching: 'Loneliness is a room missing someone. Aloneness is the room.', source: 'Inspired by Osho' },

  // ─────────────────────────────────────────────────────────────────
  // Ashtavakra Gita — later additions
  //
  // Appended rather than filed with the other Ashtavakra entries above, which sit
  // in the Advaita block. Inserting them there would shift every index after it,
  // and queued notifications carry their index. See the editing rules at the top.
  // ─────────────────────────────────────────────────────────────────
  { teaching: 'You thought yourself bound. Now you think yourself free. Same thinker.', source: 'Ashtavakra Gita' },
  { teaching: 'You are the witness. You were never the thing witnessed.', source: 'Ashtavakra Gita' },
  { teaching: 'The rope was never a snake. The fear was real enough.', source: 'Ashtavakra Gita' },
  { teaching: 'Even wanting liberation is a chain. A gold one, but a chain.', source: 'Ashtavakra Gita' },
  { teaching: 'What has no parts cannot come apart.', source: 'Ashtavakra Gita' },
  { teaching: 'Space is not touched by what moves through it. Neither are you.', source: 'Ashtavakra Gita' },
  { teaching: 'The sage acts, and no trace of a doer remains.', source: 'Ashtavakra Gita' },
  { teaching: 'What is there to renounce when nothing was ever yours?', source: 'Ashtavakra Gita' },
  { teaching: 'You dreamt the bondage. Now you are dreaming the escape.', source: 'Ashtavakra Gita' },
  { teaching: 'Meditation is for someone who believes he is scattered. Are you?', source: 'Ashtavakra Gita' },
  { teaching: 'Let the body do what bodies do. It is not your concern.', source: 'Ashtavakra Gita' },
  { teaching: 'Desire is the only rope, and no one else tied it.', source: 'Ashtavakra Gita' },
  { teaching: 'Pleasure and pain visit the mind. Find out who is never visited.', source: 'Ashtavakra Gita' },
  { teaching: 'Knower, knowing, known: three words worn by one thing.', source: 'Ashtavakra Gita' },
  { teaching: 'Where is the world when you are not thinking of it?', source: 'Ashtavakra Gita' },
  { teaching: 'You need no practice to be what you have not stopped being.', source: 'Ashtavakra Gita' },
];

/**
 * Deterministic teaching-of-the-day.
 *
 * Indexes by whole days since the Unix epoch (local time), stepping through the pool
 * with a stride coprime to its length — so consecutive days come from different
 * traditions, and every teaching appears exactly once before any repeats.
 */
export const teachingIndexForDate = (date: Date = new Date()): number => {
  const epochDay = Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000
  );
  return (((epochDay * stride()) % TEACHINGS.length) + TEACHINGS.length) % TEACHINGS.length;
};

export const teachingForDate = (date: Date = new Date()): Teaching =>
  TEACHINGS[teachingIndexForDate(date)];

/** How many days until the pool wraps around and repeats. */
export const teachingCycleDays = (): number => TEACHINGS.length;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * Step size for the day-to-day walk: the first value at or above n/φ that is coprime
 * to the pool length. Coprime guarantees a full cycle; n/φ (the golden ratio, ~0.618n)
 * is the low-discrepancy choice that keeps *successive* days far apart in the array,
 * so consecutive teachings come from different traditions.
 *
 * Do not "simplify" this to something like n/3. A stride near a simple fraction of n
 * is the failure case: 3 × (n/3) ≈ n means the walk folds into three slowly-drifting
 * orbits, and every third day lands a couple of entries from the last one — i.e. the
 * same tradition block. At n=418 that produced 5 distinct sources across a 14-day
 * window; the golden-ratio stride gives 13.
 *
 * Memoised — the pool length never changes at runtime.
 */
let cachedStride: number | null = null;
const stride = (): number => {
  if (cachedStride !== null) return cachedStride;
  const n = TEACHINGS.length;
  let s = Math.floor(n / 1.618033988749895);
  while (s < n && gcd(s, n) !== 1) s += 1;
  cachedStride = s < n ? s : 1;
  return cachedStride;
};
