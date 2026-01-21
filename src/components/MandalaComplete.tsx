import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing } from '../utils/theme';

/**
 * MANDALA COMPLETE CELEBRATION
 *
 * A subtle acknowledgment when all six daily sessions are completed.
 * Simple text with gentle animation - doesn't compete with the logo.
 */

export const MandalaComplete: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Subtle breathing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.blessingText}>Mandala Complete</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  blessingText: {
    color: colors.completeMandala,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    letterSpacing: typography.letterSpacing.spacious,
    textTransform: 'uppercase',
  },
});
