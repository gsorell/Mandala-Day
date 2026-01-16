import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { PHILOSOPHY_SECTIONS, PRACTICE_TYPE_INFO } from '../data/philosophy';
import { PracticeType } from '../types';

export const TheViewScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedPractice, setExpandedPractice] = useState<PracticeType | null>(null);

  const practiceTypes = Object.values(PRACTICE_TYPE_INFO);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Settings</Text>
        </TouchableOpacity>

        <Text style={styles.title}>The View</Text>
        <Text style={styles.subtitle}>
          The philosophical roots of these practices
        </Text>

        {/* Philosophy sections */}
        {PHILOSOPHY_SECTIONS.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        {/* Practice types */}
        <View style={styles.practicesSection}>
          <Text style={styles.practicesHeader}>The Six Practices</Text>
          <Text style={styles.practicesSubheader}>
            Tap any practice to learn more
          </Text>

          {practiceTypes.map((practice, index) => {
            const isExpanded = expandedPractice === practice.type;
            return (
              <TouchableOpacity
                key={practice.type}
                style={[styles.practiceCard, isExpanded && styles.practiceCardExpanded]}
                onPress={() => setExpandedPractice(isExpanded ? null : practice.type)}
                activeOpacity={0.7}
              >
                <View style={styles.practiceHeader}>
                  <View style={styles.practiceOrderBadge}>
                    <Text style={styles.practiceOrderText}>{index + 1}</Text>
                  </View>
                  <View style={styles.practiceTitleContainer}>
                    <Text style={styles.practiceName}>{practice.name}</Text>
                    <Text style={styles.practiceEssence}>{practice.essence}</Text>
                  </View>
                  <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
                </View>

                {isExpanded && (
                  <View style={styles.practiceDetails}>
                    <Text style={styles.traditionLabel}>Tradition</Text>
                    <Text style={styles.traditionText}>{practice.tradition}</Text>

                    <Text style={styles.descriptionText}>{practice.description}</Text>

                    {practice.whyThisTime && (
                      <>
                        <Text style={styles.whyTimeLabel}>Why this time of day?</Text>
                        <Text style={styles.whyTimeText}>{practice.whyThisTime}</Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            "The finger pointing at the moon{'\n'}is not the moon."
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
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    marginBottom: spacing.xl,
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
  practicesSection: {
    marginTop: spacing.lg,
  },
  practicesHeader: {
    color: colors.primary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  practicesSubheader: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.md,
  },
  practiceCard: {
    backgroundColor: colors.ritualSurface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  practiceCardExpanded: {
    borderColor: colors.primaryLight,
    borderWidth: 1,
  },
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  practiceOrderBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  practiceOrderText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  practiceTitleContainer: {
    flex: 1,
  },
  practiceName: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  practiceEssence: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
  },
  expandIcon: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xl,
    marginLeft: spacing.sm,
  },
  practiceDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.charcoal,
  },
  traditionLabel: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  traditionText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.md,
  },
  descriptionText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
    marginBottom: spacing.md,
  },
  whyTimeLabel: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  whyTimeText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
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
