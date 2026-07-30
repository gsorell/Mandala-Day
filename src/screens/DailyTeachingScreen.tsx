import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
  TEACHINGS,
  TEACHINGS_ATTRIBUTION_NOTE,
  teachingForDate,
} from '../data/teachings';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

// Opened either from the daily notification (which passes the index it was built
// with, so the screen shows the teaching the user actually read) or from the app,
// in which case it falls back to today's.
export const DailyTeachingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'DailyTeaching'>>();

  const index = route.params?.index;
  const teaching =
    index !== undefined && index >= 0 && index < TEACHINGS.length
      ? TEACHINGS[index]
      : teachingForDate();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        pinchGestureEnabled={false}
        maximumZoomScale={1}
        minimumZoomScale={1}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.teachingBlock}>
          <Text style={styles.teaching}>{teaching.teaching}</Text>
          <Text style={styles.source}>{teaching.source}</Text>
        </View>

        <TouchableOpacity
          style={styles.sitButton}
          onPress={() => navigation.navigate('SimpleTimer', {})}
        >
          <Text style={styles.sitButtonText}>Sit with this</Text>
        </TouchableOpacity>

        <Text style={styles.attribution}>{TEACHINGS_ATTRIBUTION_NOTE}</Text>
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
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing.xl,
  },
  backButton: {
    color: colors.primary,
    fontSize: typography.fontSizes.md,
  },
  // The teaching carries the screen — centred in the remaining space with nothing
  // competing for attention.
  teachingBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  teaching: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.light,
    lineHeight: typography.fontSizes.xl * typography.lineHeights.relaxed,
    textAlign: 'center',
  },
  source: {
    color: colors.textRitual,
    fontSize: typography.fontSizes.xs,
    letterSpacing: typography.letterSpacing.spacious,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  sitButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  sitButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
  attribution: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    lineHeight: typography.fontSizes.xs * typography.lineHeights.normal,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
