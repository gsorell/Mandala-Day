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
import { Audio } from 'expo-av';
import { Asset } from 'expo-asset';
import { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { addExtraPracticeMinutes, appendExtraInstance } from '../services/storage';
import { SessionStatus } from '../types';
import { BreathingMandalaButton } from '../components/BreathingMandalaButton';

const DEFAULT_SIT_MIN = 20;
const DEFAULT_KINHIN_MIN = 5;

// Traditional rounds. Each chip reads "sit·kinhin"; the sit runs twice, so
// 20·5 is the 45-minute period described in the Soto schedule.
const PRESETS: { sit: number; kinhin: number }[] = [
  { sit: 15, kinhin: 5 },
  { sit: 20, kinhin: 5 },
  { sit: 25, kinhin: 5 },
  { sit: 30, kinhin: 10 },
];

// Soto strike counts: 3 to open, 2 to end the first sit and begin kinhin,
// 1 to end kinhin, 3 to close. Struck slowly enough that each decay is still
// sounding under the next — hence the overlapping pool below rather than a
// single Sound restarted with setPositionAsync(0), which would cut the tail.
const OPENING_STRIKES = 3;
const TO_KINHIN_STRIKES = 2;
const TO_SIT_STRIKES = 1;
const CLOSING_STRIKES = 3;
const STRIKE_GAP_MS = 5000;

type Segment = 'sit1' | 'kinhin' | 'sit2';

const SEGMENT_LABEL: Record<Segment, string> = {
  sit1: 'Zazen',
  kinhin: 'Kinhin',
  sit2: 'Zazen',
};

const SEGMENT_PROMPT: Record<Segment, string> = {
  sit1: 'First sit',
  kinhin: 'Walking — one step to each full breath',
  sit2: 'Second sit',
};

// ---------------------------------------------------------------------------
// Bell player
//
// Module-level, not component state, on purpose: the closing three strikes run
// for ~15s while handleComplete navigates away to SessionComplete. Sounds owned
// by the component would be unloaded by the unmount cleanup mid-ring. These
// survive the unmount; handleEnd cancels them explicitly when the user bails.
// ---------------------------------------------------------------------------

const BELL_POOL_SIZE = 3;
let bellPool: Audio.Sound[] = [];
let bellIndex = 0;
let bellTimeouts: ReturnType<typeof setTimeout>[] = [];
// Bumped every time a sitting claims the pool. handleComplete's deferred
// unload checks its claim is still current, so starting a second sitting
// while the previous closing bell is still decaying doesn't unload the pool
// out from under the new one.
let bellClaim = 0;

const loadBells = async () => {
  bellClaim++;
  if (bellPool.length === BELL_POOL_SIZE) return;
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

    let source: number | { uri: string } = require('../../assets/audio/keisu-bell.mp3');
    if (Platform.OS === 'web') {
      const asset = Asset.fromModule(require('../../assets/audio/keisu-bell.mp3'));
      await asset.downloadAsync();
      source = { uri: asset.uri };
    }

    const pool: Audio.Sound[] = [];
    for (let i = 0; i < BELL_POOL_SIZE; i++) {
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
      pool.push(sound);
    }
    bellPool = pool;
    bellIndex = 0;
  } catch (e) {
    console.error('[SittingWalking] loadBells error:', e);
  }
};

const strikeOnce = async () => {
  if (bellPool.length === 0) return;
  const sound = bellPool[bellIndex % bellPool.length];
  bellIndex++;
  try {
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (e) {
    console.error('[SittingWalking] strike error:', e);
  }
};

// Rings `count` times, spaced by STRIKE_GAP_MS. Returns immediately.
const ringBell = (count: number) => {
  strikeOnce();
  for (let i = 1; i < count; i++) {
    bellTimeouts.push(setTimeout(strikeOnce, i * STRIKE_GAP_MS));
  }
};

const cancelBells = async () => {
  bellTimeouts.forEach(clearTimeout);
  bellTimeouts = [];
  for (const sound of bellPool) {
    try {
      await sound.stopAsync();
    } catch (e) {}
  }
};

const unloadBells = async () => {
  bellTimeouts.forEach(clearTimeout);
  bellTimeouts = [];
  for (const sound of bellPool) {
    try {
      await sound.unloadAsync();
    } catch (e) {}
  }
  bellPool = [];
  bellIndex = 0;
};

// Keep the screen lit on web/PWA for the length of the sit.
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

export const SittingWalkingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [sitMinutes, setSitMinutes] = useState(DEFAULT_SIT_MIN);
  const [kinhinMinutes, setKinhinMinutes] = useState(DEFAULT_KINHIN_MIN);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [segment, setSegment] = useState<Segment>('sit1');
  const [segmentRemaining, setSegmentRemaining] = useState(DEFAULT_SIT_MIN * 60);
  const [totalRemaining, setTotalRemaining] = useState(
    DEFAULT_SIT_MIN * 60 * 2 + DEFAULT_KINHIN_MIN * 60
  );

  const startTimeRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(DEFAULT_SIT_MIN * 60 * 2 + DEFAULT_KINHIN_MIN * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTimeRef = useRef<Date | null>(null);
  const prevSegmentRef = useRef<Segment | null>(null);
  const sitRef = useRef(DEFAULT_SIT_MIN);
  const kinhinRef = useRef(DEFAULT_KINHIN_MIN);

  useEffect(() => { sitRef.current = sitMinutes; }, [sitMinutes]);
  useEffect(() => { kinhinRef.current = kinhinMinutes; }, [kinhinMinutes]);

  const totalMinutes = sitMinutes * 2 + kinhinMinutes;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (Platform.OS === 'android') deactivateKeepAwake('sitting-walking-timer');
      releaseWakeLock();
      // Deliberately NOT unloading the bells here — the closing strikes are
      // still ringing as this unmounts. handleEnd unloads on an early exit,
      // and handleComplete schedules the unload after the last decay.
    };
  }, []);

  // Segment boundaries, in seconds from the start of the sit.
  const segmentsFor = (sitMin: number, kinhinMin: number): { segment: Segment; duration: number }[] => [
    { segment: 'sit1', duration: sitMin * 60 },
    { segment: 'kinhin', duration: kinhinMin * 60 },
    { segment: 'sit2', duration: sitMin * 60 },
  ];

  const getSegmentInfo = (
    elapsedSec: number
  ): { segment: Segment; segmentRemaining: number } => {
    const segments = segmentsFor(sitRef.current, kinhinRef.current);
    let cumulative = 0;
    for (const s of segments) {
      cumulative += s.duration;
      if (elapsedSec < cumulative) {
        return { segment: s.segment, segmentRemaining: cumulative - elapsedSec };
      }
    }
    const last = segments[segments.length - 1];
    return { segment: last.segment, segmentRemaining: 0 };
  };

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
    await loadBells();
    if (Platform.OS === 'android') {
      try { await activateKeepAwakeAsync('sitting-walking-timer'); } catch (e) {}
    }
    requestWakeLock();
    setCountdown(5);
  };

  const beginSitting = () => {
    const total = (sitRef.current * 2 + kinhinRef.current) * 60;
    pausedTotalRef.current = total;
    setTotalRemaining(total);
    startTimeRef.current = Date.now();
    prevSegmentRef.current = 'sit1';
    setSegment('sit1');
    setSegmentRemaining(sitRef.current * 60);
    ringBell(OPENING_STRIKES);
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    pausedTotalRef.current = totalRemaining;
    startTimeRef.current = null;
    if (Platform.OS === 'android') deactivateKeepAwake('sitting-walking-timer');
    releaseWakeLock();
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleResume = async () => {
    if (Platform.OS === 'android') {
      try { await activateKeepAwakeAsync('sitting-walking-timer'); } catch (e) {}
    }
    requestWakeLock();
    startTimeRef.current = Date.now();
    setIsRunning(true);
    setIsPaused(false);
  };

  const handleReset = () => {
    setCountdown(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (Platform.OS === 'android') deactivateKeepAwake('sitting-walking-timer');
    releaseWakeLock();
    const newTotal = (sitRef.current * 2 + kinhinRef.current) * 60;
    setIsRunning(false);
    setIsPaused(false);
    setTotalRemaining(newTotal);
    setSegment('sit1');
    setSegmentRemaining(sitRef.current * 60);
    pausedTotalRef.current = newTotal;
    startTimeRef.current = null;
    completionTimeRef.current = null;
    prevSegmentRef.current = null;
  };

  const handleEnd = async () => {
    handleReset();
    await cancelBells();
    await unloadBells();
    navigation.goBack();
  };

  const handleComplete = async () => {
    const completionDate = completionTimeRef.current || new Date();
    const completedDay = format(completionDate, 'yyyy-MM-dd');
    const minutes = sitRef.current * 2 + kinhinRef.current;

    ringBell(CLOSING_STRIKES);
    // Let the last strike decay, then release the pool. The bells are
    // module-level so this outlives the unmount that navigate() triggers.
    const claim = bellClaim;
    setTimeout(() => {
      if (bellClaim === claim) unloadBells();
    }, CLOSING_STRIKES * STRIKE_GAP_MS + 12000);

    await addExtraPracticeMinutes(completedDay, minutes);
    await appendExtraInstance({
      id: `${completedDay}_extra_sitting_walking_${Date.now()}`,
      date: completedDay,
      templateId: 'extra_sitting_walking',
      scheduledAt: completionDate.toISOString(),
      status: SessionStatus.COMPLETED,
      endedAt: completionDate.toISOString(),
      snoozeCount: 0,
      duration: minutes,
    });
    navigation.navigate('SessionComplete', {
      sessionTitle: 'Sitting & Walking',
      dedication: 'Sitting, walking, sitting. Nothing added.',
      shareMessage: 'I completed a zazen and kinhin sitting',
      duration: minutes,
    });
  };

  const selectPreset = (sit: number, kinhin: number) => {
    if (isRunning || isPaused) return;
    setSitMinutes(sit);
    setKinhinMinutes(kinhin);
    const newTotal = (sit * 2 + kinhin) * 60;
    setTotalRemaining(newTotal);
    setSegmentRemaining(sit * 60);
    pausedTotalRef.current = newTotal;
  };

  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;
      const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const total = (sitRef.current * 2 + kinhinRef.current) * 60;
      const newTotal = Math.max(0, pausedTotalRef.current - elapsedSec);
      const totalElapsed = total - newTotal;

      const info = getSegmentInfo(totalElapsed);
      setTotalRemaining(newTotal);
      setSegment(info.segment);
      setSegmentRemaining(info.segmentRemaining);

      // Ring on the crossing, not on the segment we land in, so an early exit
      // and re-entry can't double-strike.
      if (newTotal > 0 && info.segment !== prevSegmentRef.current) {
        const entering = info.segment;
        prevSegmentRef.current = entering;
        if (entering === 'kinhin') ringBell(TO_KINHIN_STRIKES);
        else if (entering === 'sit2') ringBell(TO_SIT_STRIKES);
      }

      if (newTotal <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (Platform.OS === 'android') deactivateKeepAwake('sitting-walking-timer');
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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
          <Text style={styles.timerLarge}>{formatTime(segmentRemaining)}</Text>
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
          <Text style={styles.totalTimer}>{formatTime(totalRemaining)} remaining</Text>
          <Text style={styles.phaseLabel}>{SEGMENT_LABEL[segment]}</Text>
          <Text style={styles.timerLarge}>{formatTime(segmentRemaining)}</Text>
          <Text style={styles.meditationPrompt}>{SEGMENT_PROMPT[segment]}</Text>
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
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Sitting &amp; Walking</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.figure}>
          <Text style={styles.figureNumbers} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {sitMinutes} · {kinhinMinutes} · {sitMinutes}
          </Text>
          <Text style={styles.figureTotal}>{totalMinutes} minutes</Text>
        </View>

        <View style={styles.presetRow}>
          {PRESETS.map(({ sit, kinhin }) => {
            const active = sit === sitMinutes && kinhin === kinhinMinutes;
            return (
              <TouchableOpacity
                key={`${sit}-${kinhin}`}
                style={[styles.presetChip, active && styles.presetChipActive]}
                onPress={() => selectPreset(sit, kinhin)}
              >
                <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                  {sit}·{kinhin}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.instruction}>Sit · Walk · Sit</Text>
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
    // 44, not 56: the widest value is "30 · 10 · 30" and React Native Web
    // ignores adjustsFontSizeToFit, so an oversized figure truncates to
    // "30 · 10 · 3…" at 320px rather than shrinking. This fits with slack.
    fontSize: 44,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 1,
    lineHeight: 54,
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
  totalTimer: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 2,
    marginBottom: spacing.xxl,
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
    fontSize: 96,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 4,
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
