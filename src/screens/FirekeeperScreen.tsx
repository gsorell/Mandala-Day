import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

const SECTIONS = [
  {
    id: 'treatise',
    title: 'The Treatise',
    content: `Human beings have often searched for truth in distant places—in heavens beyond the sky, in hidden metaphysical realms, or in abstract theories about mind and matter.

Yet the most immediate fact of existence is far simpler: experience itself.

Before philosophy, before science, before belief, there is the simple appearance of life in awareness—sound, sensation, thought, breath, the wind on the skin, the beating of the heart.

The Firekeeper Philosophy begins here.

Not with speculation about what lies behind experience, but with careful attention to experience as it appears.

When we observe closely, something remarkable becomes clear. The boundary we normally assume between inside and outside begins to soften. The sensation of a heartbeat and the sensation of wind arise in the same way—both appearing within awareness. The distinction between self and world proves to be less solid than we imagined.

Likewise, what we call "things" reveal themselves to be processes. Sensations flicker and dissolve. Thoughts appear and vanish. Even the sense of a personal identity turns out to be a narrative continually assembled and revised.

Reality is not a collection of static objects. It is a living field of movement.

Within this field, attention plays a special role. Wherever attention rests, patterns stabilize. A fleeting sensation becomes an object. A passing thought becomes a problem. Attention gathers the world into form.

For this reason, attention is not merely passive observation—it is participation in the unfolding of reality.

From this insight emerges a simple ethical orientation.

Human life is not primarily about domination, certainty, or personal transcendence. It is about care of the center.

Throughout human history, communities gathered around a hearth fire. The fire provided warmth, safety, and a place to meet. It allowed stories to be told, food to be prepared, and life to continue through the darkness of night.

Someone always had to tend that fire.

The Firekeeper Philosophy adopts this ancient image as its central metaphor.

To live well is to become a keeper of the fire.

The fire represents the living center of awareness, meaning, and community. It is not owned by anyone. It existed before us and will continue after we are gone. But during our time here, we can help ensure that it continues to burn.

The task is simple but profound:

Remain attentive.
Strengthen yourself.
Create order where you can.
Share warmth with others.
And remember the vastness beyond the circle of light.

In this way we participate in the unfolding of life while helping ensure that the center does not go dark.`,
  },
  {
    id: 'aphorisms',
    title: 'The Aphorisms of the Hearth',
    content: `Reality is not hidden behind experience.
It is experience itself.

The boundary between inside and outside is imagined.
Heartbeat and wind arise in the same field.

What we call things are temporary patterns in motion.

The self is not the owner of experience.
It is a story told within it.

Attention gathers the world.
Where attention rests, form appears.

When attention softens, the solidity of things dissolves.

No one stands outside the river of experience.

Meaning is cultivated like a garden, not discovered in distant heavens.

Every life organizes around a center.

The task is simple:
See clearly.
Tend the fire.
Welcome others to its warmth.`,
  },
  {
    id: 'code',
    title: "The Firekeeper's Code",
    content: `Keep the fire.
Warmth comes before philosophy.

Remain steady when others cannot.
There are nights when people lose their way.

Feed the flame with small acts.
Fires endure through patient tending.

Do not claim the fire as yours.
You are only its keeper for a while.

Let others come freely.
A hearth is not a throne.

Protect the center.
Guard it from cold winds and confusion.

Look beyond the flames.
Remember the mountains and the stars.

Teach others to tend the fire.
The work is shared.

Accept that the fire will pass to other hands.
This is how it survives.

Leave quietly when your watch is done.
If the fire still burns, your work was good.`,
  },
  {
    id: 'practices',
    title: 'The Five Practices of the Firekeeper',
    content: `1. Sit with the Fire

Each day, return to stillness. Observe breath, sensation, sound, and thought. Learn the nature of the fire by sitting beside it.

2. Strengthen the Body

The body is the woodpile. Train it so you have the strength to remain steady when the night grows cold.

3. Create Order

Arrange the wood carefully. Clean spaces, finish tasks, and build structures that support clarity.

4. Share Warmth

Offer encouragement, protection, teaching, or listening. The purpose of the fire is gathering.

5. Remember the Vastness

Look beyond the circle of light. Remember the mountains, the sky, and the stars. Humility keeps the fire honest.`,
  },
  {
    id: 'vow',
    title: "The Firekeeper's Vow",
    content: `I will tend the fire.

I will care for the warmth that allows life to gather.

When others lose their way in darkness or confusion, I will remain steady as I am able.

I will feed the flame with patience and attention.

I will not claim the fire as mine, for it was burning long before I arrived and it will burn after I am gone.

I will welcome those who come seeking warmth.

And when my watch is over, I will leave the fire burning.`,
  },
];

export const FirekeeperScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        pinchGestureEnabled={false}
        maximumZoomScale={1}
        minimumZoomScale={1}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Settings</Text>
        </TouchableOpacity>

        <View style={styles.headerSection}>
          <Image
            source={require('../../assets/mandala-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>The Firekeeper</Text>
          <Text style={styles.subtitle}>
            A Treatise on Attention, Community, and the Care of the Center
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            "If the fire still burns,{'\n'}your work was good."
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.primary,
    fontSize: typography.fontSizes.md,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    padding: spacing.lg,
  },
  footerText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
});
