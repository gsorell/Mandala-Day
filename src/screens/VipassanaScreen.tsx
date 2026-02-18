import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AVPlaybackStatus } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { audioService } from '../services/audio';
import { addExtraPracticeMinutes } from '../services/storage';

const VIPASSANA_DURATION_MIN = 10; // 10 minutes
const VIPASSANA_DURATION_SEC = VIPASSANA_DURATION_MIN * 60;

// Audio asset - using require for bundling
const getVipassanaAudio = () => require('../../assets/audio/vipassana.mp3');

export const VipassanaScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(VIPASSANA_DURATION_SEC * 1000);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasStarted = useRef(false);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Audio continues in background - no special handling needed
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hasStarted.current) {
        audioService.stop();
      }
    };
  }, []);

  // Handle countdown timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Countdown finished, start playing
      // Set isPlaying FIRST to avoid flash of "Begin" screen,
      // then clear countdown and start the actual playback
      setIsPlaying(true);
      setCountdown(null);
      playAudio();
    }
  }, [countdown]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaybackStatus = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setCurrentPosition(status.positionMillis);
      if (status.durationMillis) {
        setDuration(status.durationMillis);
      }
    }
  };

  // Play audio after countdown finishes
  const playAudio = async () => {
    hasStarted.current = true;
    setIsPlaying(true);
    setIsPaused(false);

    // On web, audio was preloaded; on native, load and play now
    if (Platform.OS === 'web' && audioService.isLoaded()) {
      await audioService.play();
    } else {
      await audioService.loadAndPlay(getVipassanaAudio(), {
        onPlaybackStatusUpdate: handlePlaybackStatus,
        onComplete: () => {
          setIsPlaying(false);
          setShowComplete(true);
        },
        onError: (error) => {
          console.error('Vipassana playback error:', error);
          setIsPlaying(false);
        },
      });
    }
  };

  const handleStart = async () => {
    if (Platform.OS === 'web') {
      // Web/Safari requires preload during user gesture
      setIsLoading(true);
      try {
        await audioService.preload(getVipassanaAudio(), {
          onPlaybackStatusUpdate: handlePlaybackStatus,
          onComplete: () => {
            setIsPlaying(false);
            setShowComplete(true);
          },
          onError: (error) => {
            console.error('Vipassana playback error:', error);
            setIsPlaying(false);
          },
        });
      } catch (error) {
        console.error('Failed to pre-load Vipassana audio:', error);
      }
      setIsLoading(false);
    }
    // Start countdown (audio will load and play when countdown reaches 0)
    setCountdown(5);
  };

  const handlePause = async () => {
    await audioService.pause();
    setIsPaused(true);
  };

  const handleResume = async () => {
    await audioService.resume();
    setIsPaused(false);
  };

  const handleEnd = async () => {
    await audioService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    navigation.goBack();
  };

  const handleComplete = async () => {
    // Save completed minutes to storage
    const today = format(new Date(), 'yyyy-MM-dd');
    await addExtraPracticeMinutes(today, VIPASSANA_DURATION_MIN);
    setShowComplete(false);
    navigation.goBack();
  };

  // Completion screen
  if (showComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completionContainer}>
          <Image
            source={require('../../assets/mandala-icon-display.png')}
            style={styles.completionLogo}
          />
          <Text style={styles.completionTitle}>Practice Complete</Text>
          <Text style={styles.completionText}>
            May this practice bring clarity and peace to all beings.
          </Text>
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>Return</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Paused state view
  if (isPaused) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={[styles.endButton, { top: insets.top + spacing.sm }]} onPress={handleEnd}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>

        <View style={styles.meditationView}>
          <Text style={styles.timerLarge}>{formatTime(duration - currentPosition)}</Text>
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

  // Playing state view
  if (isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={[styles.endButton, { top: insets.top + spacing.sm }]} onPress={handleEnd}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>

        <View style={styles.meditationView}>
          <Text style={styles.timerLarge}>{formatTime(duration - currentPosition)}</Text>
          <Text style={styles.meditationPrompt}>Observe. Notice. Allow.</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
            <Text style={styles.pauseButtonText}>Pause</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Countdown view
  if (countdown !== null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.countdownView}>
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownText}>
            {countdown === 0 ? 'Begin...' : 'Prepare yourself...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Initial screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vipassana</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.durationDisplay}>
          <Text style={styles.durationNumber}>10</Text>
          <Text style={styles.durationLabel}>minutes</Text>
        </View>

        <Text style={styles.description}>
          A guided Vipassana meditation for insight and clarity.
        </Text>

        <Text style={styles.instruction}>
          Find a comfortable seat and begin when ready.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.beginButtonRing1} onPress={handleStart} activeOpacity={0.85}>
          <View style={styles.beginButtonRing2}>
            <View style={styles.beginButtonRing3}>
              <View style={styles.beginButtonCore}>
                <View style={styles.beginButtonInnerDetail} />
                <Text style={styles.beginButtonText}>Begin</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
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
  durationDisplay: {
    alignItems: 'center',
    marginBottom: spacing.xl,
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
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.lg,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  instruction: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.charcoal,
    alignItems: 'center',
  },
  beginButtonRing1: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(184, 148, 95, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginButtonRing2: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(184, 148, 95, 0.11)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginButtonRing3: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(184, 148, 95, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginButtonCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.agedBrass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginButtonInnerDetail: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 0.5,
    borderColor: 'rgba(11, 8, 23, 0.25)',
  },
  beginButtonText: {
    color: colors.ritualNight,
    fontSize: 13,
    fontWeight: typography.fontWeights.medium,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  // Running/playing styles
  meditationView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  timerLarge: {
    color: colors.accent,
    fontSize: 96,
    fontWeight: typography.fontWeights.light,
    letterSpacing: 4,
    marginBottom: spacing.xxl,
  },
  meditationPrompt: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.lg,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  endButton: {
    position: 'absolute',
    top: 40,
    left: spacing.md,
    zIndex: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  endButtonText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
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
  // Completion screen styles
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  completionLogo: {
    width: 120,
    height: 120,
    marginBottom: spacing.xl,
    opacity: 0.8,
  },
  completionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xl,
  },
  completionText: {
    color: colors.accent,
    fontSize: typography.fontSizes.lg,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.lg * typography.lineHeights.relaxed,
    marginBottom: spacing.xl,
    maxWidth: 300,
  },
  completeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
  },
  completeButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  // Countdown styles
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
    marginBottom: spacing.lg,
    letterSpacing: 4,
  },
  countdownText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.lg,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
