import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { Audio } from 'expo-av';
import { Asset } from 'expo-asset';
import { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { audioService } from '../services/audio';
import { getGongSound, getGongUri } from '../data/audioAssets';
import { addExtraPracticeMinutes, appendExtraInstance } from '../services/storage';
import { SessionStatus } from '../types';
import { BreathingMandalaButton } from '../components/BreathingMandalaButton';

const INHALE_SEC = 4;
const HOLD_IN_SEC = 4;
const EXHALE_SEC = 4;
const HOLD_OUT_SEC = 4;
const CYCLE_SEC = INHALE_SEC + HOLD_IN_SEC + EXHALE_SEC + HOLD_OUT_SEC; // 16

type Phase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

const PHASES: { phase: Phase; duration: number }[] = [
  { phase: 'inhale', duration: INHALE_SEC },
  { phase: 'hold-in', duration: HOLD_IN_SEC },
  { phase: 'exhale', duration: EXHALE_SEC },
  { phase: 'hold-out', duration: HOLD_OUT_SEC },
];

let wakeLock: WakeLockSentinel | null = null;

const requestWakeLock = async () => {
  if (Platform.OS !== 'web') return;
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen');
    }
  } catch (err) {}
};

const releaseWakeLock = async () => {
  if (wakeLock) {
    try { await wakeLock.release(); wakeLock = null; } catch (err) {}
  }
};

export const SquareBreathingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [duration, setDuration] = useState(10);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalTimeRemaining, setTotalTimeRemaining] = useState(600);
  const [currentPhase, setCurrentPhase] = useState<Phase>('inhale');
  const [phaseTimeRemaining, setPhaseTimeRemaining] = useState(INHALE_SEC);

  const startTimeRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(600);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTimeRef = useRef<Date | null>(null);
  const prevPhaseRef = useRef<Phase | null>(null);
  const durationRef = useRef(10);

  const sustainSoundRef = useRef<Audio.Sound | null>(null);
  const mutedSoundRef = useRef<Audio.Sound | null>(null);
  const soundsLoadedRef = useRef(false);

  const breathAnim = useRef(new Animated.Value(0)).current;
  const breathAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathAnimRef.current) breathAnimRef.current.stop();
      if (pulseAnimRef.current) { pulseAnimRef.current.stop(); pulseAnimRef.current = null; }
      if (Platform.OS === 'android') deactivateKeepAwake('square-breathing-timer');
      releaseWakeLock();
      unloadSounds();
    };
  }, []);

  const unloadSounds = async () => {
    try {
      if (sustainSoundRef.current) {
        await sustainSoundRef.current.unloadAsync();
        sustainSoundRef.current = null;
      }
      if (mutedSoundRef.current) {
        await mutedSoundRef.current.unloadAsync();
        mutedSoundRef.current = null;
      }
    } catch (e) {}
    soundsLoadedRef.current = false;
  };

  const loadSounds = async () => {
    if (soundsLoadedRef.current) return;
    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          interruptionModeIOS: 0,
        });
      }

      let sustainSource: number | { uri: string } = require('../../assets/audio/pranayama-sustain.mp3');
      let mutedSource: number | { uri: string } = require('../../assets/audio/pranayama-muted.mp3');

      if (Platform.OS === 'web') {
        const sustainAsset = Asset.fromModule(require('../../assets/audio/pranayama-sustain.mp3'));
        await sustainAsset.downloadAsync();
        sustainSource = { uri: sustainAsset.uri };
        const mutedAsset = Asset.fromModule(require('../../assets/audio/pranayama-muted.mp3'));
        await mutedAsset.downloadAsync();
        mutedSource = { uri: mutedAsset.uri };
      }

      const { sound: s1 } = await Audio.Sound.createAsync(sustainSource, { shouldPlay: false });
      sustainSoundRef.current = s1;
      const { sound: s2 } = await Audio.Sound.createAsync(mutedSource, { shouldPlay: false });
      mutedSoundRef.current = s2;
      soundsLoadedRef.current = true;
    } catch (e) {
      console.error('[SquareBreathing] loadSounds error:', e);
    }
  };

  const playPhaseSound = async (phase: Phase) => {
    try {
      if (phase === 'inhale' || phase === 'exhale') {
        if (sustainSoundRef.current) {
          await sustainSoundRef.current.setPositionAsync(0);
          await sustainSoundRef.current.playAsync();
        }
      } else {
        if (mutedSoundRef.current) {
          await mutedSoundRef.current.setPositionAsync(0);
          await mutedSoundRef.current.playAsync();
        }
      }
    } catch (e) {
      console.error('[SquareBreathing] playPhaseSound error:', e);
    }
  };

  const stopPulse = () => {
    if (pulseAnimRef.current) { pulseAnimRef.current.stop(); pulseAnimRef.current = null; }
    pulseAnim.setValue(1);
  };

  const startPhaseAnimation = (phase: Phase, remainingMs: number, snapToValue?: number) => {
    if (breathAnimRef.current) breathAnimRef.current.stop();
    const toValue = (phase === 'inhale' || phase === 'hold-in') ? 1 : 0;
    if (snapToValue !== undefined) breathAnim.setValue(snapToValue);
    if (phase === 'hold-in' || phase === 'hold-out') {
      breathAnim.setValue(toValue);
      if (phase === 'hold-in') {
        stopPulse();
        // useNativeDriver MUST be false — this view also animates width/height
        // via breathAnim (interpolated), which is JS-only. Mixing drivers on
        // the same view moves the JS node into the native graph and the next
        // JS-driven animation crashes ("animated node moved to native earlier").
        pulseAnimRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 0.97, duration: 1000, useNativeDriver: false }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          ])
        );
        pulseAnimRef.current.start();
      } else {
        stopPulse();
      }
      return;
    }
    stopPulse();
    breathAnimRef.current = Animated.timing(breathAnim, {
      toValue,
      duration: remainingMs,
      useNativeDriver: false,
    });
    breathAnimRef.current.start();
  };

  const getPhaseInfo = (totalElapsedSec: number): { phase: Phase; phaseElapsed: number; phaseIndex: number } => {
    const cycleElapsed = totalElapsedSec % CYCLE_SEC;
    let cumulative = 0;
    for (let i = 0; i < PHASES.length; i++) {
      cumulative += PHASES[i].duration;
      if (cycleElapsed < cumulative) {
        const phaseElapsed = cycleElapsed - (cumulative - PHASES[i].duration);
        return { phase: PHASES[i].phase, phaseElapsed, phaseIndex: i };
      }
    }
    return { phase: 'inhale', phaseElapsed: 0, phaseIndex: 0 };
  };

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdown(null);
      beginMeditation();
    }
  }, [countdown]);

  const handleStart = async () => {
    await loadSounds();
    if (Platform.OS === 'android') {
      try { await activateKeepAwakeAsync('square-breathing-timer'); } catch (e) {}
    }
    requestWakeLock();
    setCountdown(5);
  };

  const beginMeditation = () => {
    const total = durationRef.current * 60;
    pausedTotalRef.current = total;
    setTotalTimeRemaining(total);
    startTimeRef.current = Date.now();
    breathAnim.setValue(0);
    prevPhaseRef.current = 'inhale';
    setCurrentPhase('inhale');
    setPhaseTimeRemaining(INHALE_SEC);
    playPhaseSound('inhale');
    startPhaseAnimation('inhale', INHALE_SEC * 1000, 0);
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (breathAnimRef.current) breathAnimRef.current.stop();
    pausedTotalRef.current = totalTimeRemaining;
    startTimeRef.current = null;
    if (Platform.OS === 'android') deactivateKeepAwake('square-breathing-timer');
    releaseWakeLock();
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleResume = async () => {
    if (Platform.OS === 'android') {
      try { await activateKeepAwakeAsync('square-breathing-timer'); } catch (e) {}
    }
    requestWakeLock();
    startTimeRef.current = Date.now();
    startPhaseAnimation(currentPhase, phaseTimeRemaining * 1000);
    setIsRunning(true);
    setIsPaused(false);
  };

  const handleReset = () => {
    setCountdown(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (breathAnimRef.current) breathAnimRef.current.stop();
    if (Platform.OS === 'android') deactivateKeepAwake('square-breathing-timer');
    releaseWakeLock();
    breathAnim.setValue(0);
    const newTotal = durationRef.current * 60;
    setIsRunning(false);
    setIsPaused(false);
    setTotalTimeRemaining(newTotal);
    setCurrentPhase('inhale');
    setPhaseTimeRemaining(INHALE_SEC);
    pausedTotalRef.current = newTotal;
    startTimeRef.current = null;
    completionTimeRef.current = null;
    prevPhaseRef.current = null;
  };

  const handleEnd = () => {
    handleReset();
    navigation.goBack();
  };

  const playGongSound = async () => {
    try {
      let audioSource: number | { uri: string } = getGongSound();
      if (Platform.OS === 'web') {
        const uri = await getGongUri();
        if (uri) audioSource = { uri };
      }
      await audioService.preload(audioSource, {
        onComplete: () => { audioService.stop(); },
        onError: (error) => { console.error('[SquareBreathing] gong error:', error); },
      });
      await audioService.play();
    } catch (error) {
      console.error('[SquareBreathing] Failed to play gong:', error);
    }
  };

  const handleComplete = async () => {
    const completionDate = completionTimeRef.current || new Date();
    const completedDay = format(completionDate, 'yyyy-MM-dd');
    await playGongSound();
    await addExtraPracticeMinutes(completedDay, durationRef.current);
    await appendExtraInstance({
      id: `${completedDay}_extra_square_breathing_${Date.now()}`,
      date: completedDay,
      templateId: 'extra_square_breathing',
      scheduledAt: completionDate.toISOString(),
      status: SessionStatus.COMPLETED,
      endedAt: completionDate.toISOString(),
      snoozeCount: 0,
      duration: durationRef.current,
    });
    navigation.navigate('SessionComplete', {
      sessionTitle: 'Square Breathing',
      dedication: 'May your steady breath bring balance to all beings.',
      shareMessage: 'I completed a square breathing meditation',
      duration: durationRef.current,
    });
  };

  const adjustDuration = (mins: number) => {
    if (!isRunning && !isPaused) {
      const newDuration = Math.max(1, duration + mins);
      setDuration(newDuration);
      setTotalTimeRemaining(newDuration * 60);
      pausedTotalRef.current = newDuration * 60;
    }
  };

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;
      const elapsedMs = Date.now() - startTimeRef.current;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const newTotal = Math.max(0, pausedTotalRef.current - elapsedSec);
      const totalElapsed = durationRef.current * 60 - newTotal;
      const { phase, phaseElapsed, phaseIndex } = getPhaseInfo(totalElapsed);
      const phaseRemaining = PHASES[phaseIndex].duration - phaseElapsed;

      setTotalTimeRemaining(newTotal);
      setCurrentPhase(phase);
      setPhaseTimeRemaining(phaseRemaining);

      if (phase !== prevPhaseRef.current) {
        prevPhaseRef.current = phase;
        playPhaseSound(phase);
        const totalElapsedFrac = durationRef.current * 60 - pausedTotalRef.current + elapsedMs / 1000;
        const cycleElapsedFrac = totalElapsedFrac % CYCLE_SEC;
        let cumulative = 0;
        let fracPhaseElapsed = 0;
        for (let i = 0; i < PHASES.length; i++) {
          cumulative += PHASES[i].duration;
          if (cycleElapsedFrac < cumulative) {
            fracPhaseElapsed = cycleElapsedFrac - (cumulative - PHASES[i].duration);
            break;
          }
        }
        const fracRemainingMs = (PHASES[phaseIndex].duration - fracPhaseElapsed) * 1000;
        const snapStart = phase === 'inhale' ? fracPhaseElapsed / INHALE_SEC
          : phase === 'exhale' ? 1 - fracPhaseElapsed / EXHALE_SEC
          : undefined;
        startPhaseAnimation(phase, fracRemainingMs, snapStart);
      }

      if (newTotal <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (breathAnimRef.current) breathAnimRef.current.stop();
        if (Platform.OS === 'android') deactivateKeepAwake('square-breathing-timer');
        releaseWakeLock();
        setIsRunning(false);
        completionTimeRef.current = new Date();
        handleComplete();
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const circleSize = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  // Countdown state
  if (countdown !== null) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={[styles.endButton, { top: insets.top + spacing.sm }]} onPress={handleEnd}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
        <View style={styles.countdownView}>
          <Text style={styles.countdownNumber}>{countdown === 0 ? '' : countdown}</Text>
          <Text style={styles.countdownText}>
            {countdown === 0 ? 'Begin...' : 'Prepare yourself...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Paused state
  if (isPaused) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={[styles.endButton, { top: insets.top + spacing.sm }]} onPress={handleEnd}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
        <View style={styles.meditationView}>
          <Text style={styles.timerLarge}>{formatTime(totalTimeRemaining)}</Text>
          <Text style={styles.meditationPrompt}>Paused</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
            <Text style={styles.resumeButtonText}>Resume</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Running state
  if (isRunning) {
    const phaseDisplay =
      currentPhase === 'inhale' ? 'Inhale'
      : currentPhase === 'hold-in' ? 'Hold'
      : currentPhase === 'exhale' ? 'Exhale'
      : 'Hold';

    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={[styles.endButton, { top: insets.top + spacing.sm }]} onPress={handleEnd}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
        <View style={styles.meditationView}>
          <Text style={styles.totalTimer}>{formatTime(totalTimeRemaining)}</Text>
          <View style={styles.breathCircleContainer}>
            <Animated.View
              style={[
                styles.breathCircleOuter,
                { width: circleSize, height: circleSize, transform: [{ scale: pulseAnim }] },
              ]}
            />
          </View>
          <Text style={styles.phaseLabel}>{phaseDisplay}</Text>
          <Text style={styles.phaseCount}>{phaseTimeRemaining}</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
            <Text style={styles.pauseButtonText}>Pause</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Setup state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Square Breathing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.durationSelector}>
          <TouchableOpacity style={styles.adjustButton} onPress={() => adjustDuration(-5)}>
            <Text style={styles.adjustButtonText}>-5</Text>
          </TouchableOpacity>
          <View style={styles.durationDisplay}>
            <Text style={styles.durationNumber}>{duration}</Text>
            <Text style={styles.durationLabel}>minutes</Text>
          </View>
          <TouchableOpacity style={styles.adjustButton} onPress={() => adjustDuration(5)}>
            <Text style={styles.adjustButtonText}>+5</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.presetButtons}>
          {[5, 10, 20, 30].map((min) => (
            <TouchableOpacity
              key={min}
              style={styles.presetButton}
              onPress={() => {
                setDuration(min);
                setTotalTimeRemaining(min * 60);
                pausedTotalRef.current = min * 60;
              }}
            >
              <Text style={styles.presetButtonText}>{min} min</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.instruction}>Inhale · Hold · Exhale · Hold</Text>
      </View>

      <View style={styles.footer}>
        <BreathingMandalaButton onPress={handleStart} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.charcoal,
  },
  backButton: {
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    color: colors.accent,
    fontSize: typography.fontSizes.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.medium,
  },
  headerSpacer: {
    width: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  durationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xxl,
  },
  adjustButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.ritualSurface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.charcoal,
  },
  adjustButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.medium,
  },
  durationDisplay: {
    alignItems: 'center',
  },
  durationNumber: {
    color: colors.textPrimary,
    fontSize: 72,
    fontWeight: typography.fontWeights.light,
    lineHeight: 72,
  },
  durationLabel: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
    marginTop: spacing.xs,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  presetButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.charcoal,
    backgroundColor: colors.ritualSurface,
  },
  presetButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  instruction: {
    color: colors.accent,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  footer: {
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  countdownView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  countdownNumber: {
    color: colors.accent,
    fontSize: 120,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 4,
  },
  countdownText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.lg,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },
  endButton: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  endButtonText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
  },
  meditationView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  totalTimer: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 2,
    marginBottom: spacing.xxl,
  },
  timerLarge: {
    color: colors.accent,
    fontSize: 96,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 4,
    marginBottom: spacing.xxl,
  },
  breathCircleContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  breathCircleOuter: {
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  phaseLabel: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  phaseCount: {
    color: colors.accent,
    fontSize: 64,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 2,
  },
  meditationPrompt: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.lg,
    fontStyle: 'italic',
  },
  controls: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  pauseButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.ritualSurface,
    borderWidth: 1,
    borderColor: colors.charcoal,
  },
  pauseButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
  resumeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  resumeButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
});
