import { PracticeType } from '../types';

export interface PracticeTypeInfo {
  type: PracticeType;
  name: string;
  tradition: string;
  essence: string;
  description: string;
  whyThisTime?: string;
}

export const PRACTICE_TYPE_INFO: Record<PracticeType, PracticeTypeInfo> = {
  [PracticeType.SHAMATHA]: {
    type: PracticeType.SHAMATHA,
    name: 'Shamatha',
    tradition: 'Found across Buddhist traditions',
    essence: 'Calm abiding',
    description:
      'Shamatha means "peaceful abiding" or "calm remaining." It is the practice of allowing the mind to settle naturally, without force. Rather than concentrating intensely, we learn to rest in open awareness—noticing thoughts without following them, letting experience arise and dissolve on its own.',
    whyThisTime:
      'Morning, before the day accumulates momentum. The mind is often quieter, more receptive to simply being.',
  },
  [PracticeType.BODY_AWARENESS]: {
    type: PracticeType.BODY_AWARENESS,
    name: 'Body Awareness',
    tradition: 'Somatic and contemplative traditions',
    essence: 'Embodied presence',
    description:
      'The body is not separate from awareness—it is where awareness lands, where life is actually felt. This practice invites attention to descend from the thinking mind into the living body: the breath, the weight, the warmth. We are not observing the body from outside; we are remembering that we are the body, aware.',
    whyThisTime:
      'Mid-morning, when mental momentum begins to build. Grounding in the body counterbalances the pull toward abstraction.',
  },
  [PracticeType.COMPASSION]: {
    type: PracticeType.COMPASSION,
    name: 'Compassion',
    tradition: 'Tibetan Buddhism, Chenrezig practice',
    essence: 'The heart\'s natural response',
    description:
      'Compassion is not something we manufacture—it is the heart\'s natural response when it is not defended. This practice uses the mantra Om Mani Padme Hum, associated with Avalokiteshvara (Chenrezig), the embodiment of awakened compassion. We do not try to feel a certain way. We simply allow the heart to open, meeting whatever arises—warmth, grief, numbness—without judgment.',
    whyThisTime:
      'Midday, when we have encountered others and the friction of the world. A moment to return to tenderness.',
  },
  [PracticeType.DIRECT_AWARENESS]: {
    type: PracticeType.DIRECT_AWARENESS,
    name: 'Direct Awareness',
    tradition: 'Mahamudra and Dzogchen',
    essence: 'Recognizing what is already present',
    description:
      'This practice points directly at the nature of awareness itself. We are not trying to create a special state or achieve a goal. We simply notice that awareness is already present—that which knows this moment. Thoughts may continue; they do not obstruct recognition. There is nothing to find, nothing to hold. Just this.',
    whyThisTime:
      'Afternoon, when the mind is active but can pause. A cut through accumulated mental busyness.',
  },
  [PracticeType.MOVEMENT]: {
    type: PracticeType.MOVEMENT,
    name: 'Movement',
    tradition: 'Walking meditation, kinhin, embodied awareness',
    essence: 'Awareness in action',
    description:
      'Stillness is not the only door to presence. This practice dissolves the boundary between meditation and life by bringing awareness into movement. Walking, standing, simple gestures—all become occasions for wakefulness. We discover that awareness does not require the body to stop.',
    whyThisTime:
      'Evening, as the day\'s stillness-based practices give way to integration. A bridge between formal practice and ordinary activity.',
  },
  [PracticeType.DISSOLUTION]: {
    type: PracticeType.DISSOLUTION,
    name: 'Dissolution',
    tradition: 'Contemplative sleep practices, bardos',
    essence: 'Letting go into rest',
    description:
      'Each night, we rehearse the dissolution of the day—and, in a sense, of the self. This practice invites us to consciously release the grip on waking identity: the body softens, thoughts thin, boundaries blur. We do not need to resolve everything. We simply allow what has happened to dissolve into space, trusting that awareness continues even as the personal narrative fades.',
    whyThisTime:
      'Night, before sleep. A conscious transition from waking to rest, from doing to being done.',
  },
};

export const PHILOSOPHY_SECTIONS = [
  {
    id: 'mandala',
    title: 'The Mandala',
    content: `A mandala is a complete world—a whole that contains all its parts in relationship.

In this app, the six daily sessions form a mandala of practice: a full cycle that begins with waking awareness, moves through body, heart, and direct seeing, integrates into activity, and dissolves into rest.

Each session is complete in itself. And together, they form something greater—a day lived with intention, though without rigidity.

You don't need to complete all six. The mandala is not a checklist. It is a shape that holds space for your practice, however it unfolds.`,
  },
  {
    id: 'return',
    title: 'The Practice of Return',
    content: `There are no streaks here. No points. No guilt.

The only practice is return.

When you notice you've been away—from presence, from intention, from this app—you simply come back. That's it. That's the whole thing.

Missing a session is not failure. Returning after a week, a month, a year—that is success. Each return is complete in itself.

The spiritual path is not a line. It is an endless series of beginnings.`,
  },
  {
    id: 'traditions',
    title: 'Roots',
    content: `These practices draw from several contemplative traditions:

Shamatha (calm abiding) is foundational to Buddhist meditation, teaching the mind to rest without distraction.

Mahamudra and Dzogchen, from Tibetan Buddhism, point directly at the nature of awareness—not something to achieve, but something to recognize.

Compassion practices, particularly those associated with Chenrezig (Avalokiteshvara), cultivate the heart's natural openness through mantra and visualization.

Somatic awareness—attention to the living body—appears across traditions, from yoga to Zen to secular mindfulness.

These roots are offered not as doctrine, but as context. The practices themselves require no belief. They ask only that you sit down, notice what is here, and see what happens.`,
  },
  {
    id: 'guidance',
    title: 'On Guidance',
    content: `The scripts in this app are not instructions to follow perfectly. They are invitations—gentle nudges in a direction.

If the words don't resonate, let them go. If the timing feels wrong, adjust. The practice is always yours.

A teacher in a room can respond to you. These recorded words cannot. So hold them lightly. Take what helps. Leave what doesn't.

The most important teacher is your own direct experience. Everything else—including these words—is just a finger pointing at the moon.`,
  },
];

export const getPracticeTypeInfo = (type: PracticeType): PracticeTypeInfo => {
  return PRACTICE_TYPE_INFO[type];
};
