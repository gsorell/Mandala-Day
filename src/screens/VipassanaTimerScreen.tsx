import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { audioService } from '../services/audio';
import { getGongSound, getGongUri } from '../data/audioAssets';
import { addExtraPracticeMinutes, appendExtraInstance } from '../services/storage';
import { SessionStatus } from '../types';
import { BreathingMandalaButton } from '../components/BreathingMandalaButton';

const DEFAULT_MINUTES = 60;

// Standard sitting lengths. 60 is the full hour of the Goenka-style schedule.
const PRESETS = [30, 45, 60, 90];

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

// The opening gong. The closing one is handled by SessionComplete via its
// playEndingGong param — it owns the shared player at that point, and letting
// it ring there avoids racing this screen's unmount.
const playOpeningGong = async () => {
  try {
    let source: number | { uri: string } = getGongSound();
    if (Platform.OS === 'web') {
      const uri = await getGongUri();
      if (uri) source = { uri };
    }
    await audioService.loadAndPlay(source, {
      onComplete: () => { audioService.stop(); },
      onError: (e) => { console.error('[Vipassana] gong error:', e); },
    });
  } catch (e) {
    console.error('[Vipassana] playOpeningGong failed:', e);
  }
};

export const VipassanaTimerScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_MINUTES * 60);

  const startTimeRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef(DEFAULT_MINUTES * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTimeRef = useRef<Date | null>(null);
  const minutesRef = useRef(DEFAULT_MINUTES);

  useEffect(() => { minutesRef.current = minutes; }, [minutes]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (Platform.OS === 'android') deactivateKeepAwake('vipassana-timer');
      releaseWakeLock();
    };
  }, []);

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdown(null);
      beginSitting();
    }
  }, [countdown]);

  const handleStart = async () => {
    if (Platform.OS === 'android') {
      try { await activateKeepAwakeAsync('vipassana-timer'); } catch (e) {}
    }
    requestWakeLock();
    setCountdown(5);
  };

  const beginSitting = () => {
    const total = minutesRef.current * 60;
    pausedRemainingRef.current = total;
    setTimeRemaining(total);
    startTimeRef.current = Date.now();
    playOpeningGong();
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    pausedRemainingRef.current = timeRemaining;
    startTimeRef.current = null;
    if (Platform.OS === 'android') deactivateKeepAwake('vipassana-timer');
    releaseWakeLock();
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleResume = async () => {
    if (Platform.OS === 'android') {
      try { await activateKeepAwakeAsync('vipassana-timer'); } catch (e) {}
    }
    requestWakeLock();
    startTimeRef.current = Date.now();
    setIsRunning(true);
    setIsPaused(false);
  };

  const handleReset = () => {
    setCountdown(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (Platform.OS === 'android') deactivateKeepAwake('vipassana-timer');
    releaseWakeLock();
    const total = minutesRef.current * 60;
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(total);
    pausedRemainingRef.current = total;
    startTimeRef.current = null;
    completionTimeRef.current = null;
  };

  const handleEnd = () => {
    handleReset();
    audioService.stop();
    navigation.goBack();
  };

  const handleComplete = async () => {
    const completionDate = completionTimeRef.current || new Date();
    const completedDay = format(completionDate, 'yyyy-MM-dd');
    const mins = minutesRef.current;

    await addExtraPracticeMinutes(completedDay, mins);
    await appendExtraInstance({
      id: `${completedDay}_extra_vipassana_timer_${Date.now()}`,
      date: completedDay,
      templateId: 'extra_vipassana_timer',
      scheduledAt: completionDate.toISOString(),
      status: SessionStatus.COMPLETED,
      endedAt: completionDate.toISOString(),
      snoozeCount: 0,
      duration: mins,
    });
    navigation.navigate('SessionComplete', {
      sessionTitle: 'Vipassana',
      dedication: 'Sensation arises, is noted, passes.',
      shareMessage: 'I completed a vipassana sitting',
      duration: mins,
      playEndingGong: true,
    });
  };

  const selectPreset = (mins: number) => {
    if (isRunning || isPaused) return;
    setMinutes(mins);
    setTimeRemaining(mins * 60);
    pausedRemainingRef.current = mins * 60;
  };

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;
      const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, pausedRemainingRef.current - elapsedSec);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (Platform.OS === 'android') deactivateKeepAwake('vipassana-timer');
        releaseWakeLock();
        setIsRunning(false);
        completionTimeRef.current = new Date();
        handleComplete();
      }
    }, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Hours matter at this length: 1:00:00 reads better than 60:00.
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
            {countdown === 0 ? 'Begin...' : 'Settle into your posture...'}
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
          <Text style={styles.timerLarge}>{formatTime(timeRemaining)}</Text>
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
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={[styles.endButton, { top: insets.top + spacing.sm }]} onPress={handleEnd}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
        <View style={styles.meditationView}>
          <Text style={styles.phaseLabel}>Vipassana</Text>
          <Text style={styles.timerLarge} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatTime(timeRemaining)}
          </Text>
          <Text style={styles.meditationPrompt}>Note what arises, and let it pass</Text>
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
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Vipassana</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.figure}>
          <Text style={styles.figureNumbers} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {minutes}
          </Text>
          <Text style={styles.figureTotal}>minutes</Text>
        </View>

        <View style={styles.presetRow}>
          {PRESETS.map((mins) => {
            const active = mins === minutes;
            return (
              <TouchableOpacity
                key={mins}
                style={[styles.presetChip, active && styles.presetChipActive]}
                onPress={() => selectPreset(mins)}
              >
                <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                  {mins}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.instruction}>Silent · Gong to open and close</Text>
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
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
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
  figure: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  figureNumbers: {
    color: colors.textPrimary,
    fontSize: 64,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 2,
    lineHeight: 74,
  },
  figureTotal: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    alignSelf: 'stretch',
  },
  presetChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.charcoal,
    backgroundColor: colors.ritualSurface,
    alignItems: 'center',
  },
  presetChipActive: {
    borderColor: colors.agedBrass,
    backgroundColor: 'rgba(196, 144, 64, 0.12)',
  },
  presetChipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  presetChipTextActive: {
    color: colors.accent,
    fontWeight: typography.fontWeights.medium,
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
  // Countdown
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
  // Running / paused
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
  phaseLabel: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  timerLarge: {
    color: colors.accent,
    // 64, not the 96 used on the zazen screen: at 90 minutes this reads
    // "1:29:59" — seven glyphs where that screen only ever had five ("20:00").
    // 96 overflows 320px outright, and 72 left too little margin to trust
    // against font-metric variation.
    fontSize: 64,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 3,
    marginBottom: spacing.xl,
  },
  meditationPrompt: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.lg,
    fontStyle: 'italic',
    textAlign: 'center',
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
