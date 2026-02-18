import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../utils/theme';

interface BreathingMandalaButtonProps {
  onPress: () => void;
}

export const BreathingMandalaButton: React.FC<BreathingMandalaButtonProps> = ({ onPress }) => {
  const breathScale = useRef(new Animated.Value(1)).current;
  const breathOpacity = useRef(new Animated.Value(0.78)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  // Counter-scale on core so the text doesn't grow with the outer rings
  const inverseBreathScale = Animated.divide(1, breathScale);

  useEffect(() => {
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(breathScale, {
            toValue: 1.04,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breathOpacity, {
            toValue: 1.0,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(breathScale, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breathOpacity, {
            toValue: 0.78,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    breathLoop.start();
    return () => breathLoop.stop();
  }, []);

  const handlePressIn = () => {
    Animated.timing(pressScale, {
      toValue: 0.93,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(pressScale, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      {/* Outer container: handles scale only */}
      <Animated.View style={[styles.container, { transform: [{ scale: breathScale }, { scale: pressScale }] }]}>
        {/* Rings layer: handles opacity only, rings drawn as absolute siblings */}
        <Animated.View style={[styles.ringsLayer, { opacity: breathOpacity }]}>
          <View style={styles.ring1bg} />
          <View style={styles.ring2bg} />
          <View style={styles.ring3bg} />
        </Animated.View>
        {/* Core: always full opacity, counter-scaled to prevent text jump */}
        <Animated.View style={[styles.core, { transform: [{ scale: inverseBreathScale }] }]}>
          <View style={styles.innerDetail} />
          <Text style={styles.text}>Begin</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 148,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringsLayer: {
    position: 'absolute',
    width: 148,
    height: 148,
  },
  ring1bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(184, 148, 95, 0.06)',
  },
  ring2bg: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(184, 148, 95, 0.11)',
  },
  ring3bg: {
    position: 'absolute',
    top: 27,
    left: 27,
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(184, 148, 95, 0.18)',
  },
  core: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.agedBrass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDetail: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 0.5,
    borderColor: 'rgba(11, 8, 23, 0.25)',
  },
  text: {
    color: colors.white,
    fontSize: 13,
    fontWeight: typography.fontWeights.medium as any,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
