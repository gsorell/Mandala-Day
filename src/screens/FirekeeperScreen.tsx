import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing } from '../utils/theme';

const SECTIONS = [
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

        {SECTIONS.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}
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
});
