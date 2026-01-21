import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../utils/theme';

interface MandalaCompleteProps {
  onPress?: () => void;
}

/**
 * MANDALA COMPLETE CELEBRATION
 *
 * A subtle acknowledgment when all six daily sessions are completed.
 * Simple text with gentle animation - doesn't compete with the logo.
 * Tappable to navigate to the shareable achievement screen.
 */

export const MandalaComplete: React.FC<MandalaCompleteProps> = ({ onPress }) => {
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.blessingText}>Mandala Complete</Text>
        <Text style={styles.tapHint}>Tap to share</Text>
      </Animated.View>
    </TouchableOpacity>
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
  tapHint: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
});
