import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Image,
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { audioService } from '../services/audio';
import { getGongSound, getGongUri } from '../data/audioAssets';
import { trackSimpleTimerStart, trackSimpleTimerComplete } from '../services/analytics';

export const SimpleTimerScreen: React.FC = () => {
  const navigation = useNavigation();
  const [duration, setDuration] = useState(10); // minutes
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration * 60); // seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasPlayedGong = useRef(false);
  // Track wall-clock time to handle screen sleep correctly
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRemainingRef = useRef<number>(duration * 60);
  // Track the expected end time for background completion detection
  const endTimeRef = useRef<number | null>(null);
  // Track notification ID for cancellation
  const notificationIdRef = useRef<string | null>(null);

  // Schedule notification for timer completion
  const scheduleCompletionNotification = async (seconds: number) => {
    if (Platform.OS === 'web') return; // Skip on web
    
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Timer Complete',
          body: 'Your meditation timer has finished',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });
      notificationIdRef.current = identifier;
    } catch (error) {
      console.error('Error scheduling completion notification:', error);
    }
  };

  // Cancel the completion notification
  const cancelCompletionNotification = async () => {
    if (notificationIdRef.current && Platform.OS !== 'web') {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        notificationIdRef.current = null;
      } catch (error) {
        console.error('Error canceling notification:', error);
      }
    }
  };

  // Check if timer should have completed while app was in background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isRunning && endTimeRef.current) {
        const now = Date.now();
        if (now >= endTimeRef.current) {
          // Timer should have completed while in background
          if (!hasPlayedGong.current) {
            hasPlayedGong.current = true;
            playGongSound();
          }
          cancelCompletionNotification();
          setIsRunning(false);
          setShowComplete(true);
          setTimeRemaining(0);
          startTimeRef.current = null;
          endTimeRef.current = null;
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning]);

  // Play gong sound when timer completes
  const playGongSound = async () => {
    try {
      let audioSource: number | { uri: string } = getGongSound();

      if (Platform.OS === 'web') {
        const uri = await getGongUri();
        if (uri) {
          audioSource = { uri };
        }
      }

      await audioService.preload(audioSource, {
        onComplete: () => {
          audioService.stop();
        },
        onError: (error) => {
          console.error('Gong playback error:', error);
        },
      });
      await audioService.play();
    } catch (error) {
      console.error('Failed to play gong sound:', error);
    }
  };

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      // Set start time when timer begins (using wall-clock time)
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        pausedTimeRemainingRef.current = timeRemaining;
      }

      timerRef.current = setInterval(() => {
        // Calculate remaining time based on actual elapsed wall-clock time
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        const newTimeRemaining = Math.max(0, pausedTimeRemainingRef.current - elapsed);

        if (newTimeRemaining <= 0) {
          // Play gong before stopping
          if (!hasPlayedGong.current) {
            hasPlayedGong.current = true;
            playGongSound();
          }
          cancelCompletionNotification();
          setIsRunning(false);
          setShowComplete(true);
          setTimeRemaining(0);
          startTimeRef.current = null;
          endTimeRef.current = null;
        } else {
          setTimeRemaining(newTimeRemaining);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    const startingTime = timeRemaining === 0 ? duration * 60 : timeRemaining;
    if (timeRemaining === 0) {
      setTimeRemaining(duration * 60);
      hasPlayedGong.current = false;
    }
    trackSimpleTimerStart(duration);
    // Set the expected end time for background completion detection
    endTimeRef.current = Date.now() + startingTime * 1000;
    // Schedule notification for completion
    scheduleCompletionNotification(startingTime);
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    // Save the current time remaining when pausing
    pausedTimeRemainingRef.current = timeRemaining;
    startTimeRef.current = null;
    endTimeRef.current = null;
    cancelCompletionNotification();
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleResume = () => {
    // Reset start time - it will be set fresh when useEffect runs
    startTimeRef.current = null;
    // Set expected end time for background completion detection
    endTimeRef.current = Date.now() + timeRemaining * 1000;
    // Schedule notification for remaining time
    scheduleCompletionNotification(timeRemaining);
    setIsRunning(true);
    setIsPaused(false);
  };

  const handleReset = () => {
    cancelCompletionNotification();
    setIsRunning(false);
    setIsPaused(false);
    setShowComplete(false);
    setTimeRemaining(duration * 60);
    hasPlayedGong.current = false;
    startTimeRef.current = null;
    pausedTimeRemainingRef.current = duration * 60;
    endTimeRef.current = null;
    audioService.stop();
  };

  const handleEnd = () => {
    if (isPaused) {
      // If already paused, just go back
      handleReset();
      navigation.goBack();
    } else {
      // If running, show confirmation
      Alert.alert(
        'End Timer',
        'Are you sure you want to end this meditation?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End',
            style: 'destructive',
            onPress: () => {
              handleReset();
              navigation.goBack();
            },
          },
        ]
      );
    }
  };

  const handleComplete = () => {
    trackSimpleTimerComplete(duration);
    handleReset();
    navigation.goBack();
  };

  const adjustDuration = (minutes: number) => {
    if (!isRunning && !isPaused) {
      const newDuration = Math.max(1, duration + minutes);
      setDuration(newDuration);
      setTimeRemaining(newDuration * 60);
      pausedTimeRemainingRef.current = newDuration * 60;
    }
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
            May your practice bring benefit to all beings.
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
        <TouchableOpacity style={styles.endButton} onPress={handleEnd}>
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

  if (isRunning) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.endButton} onPress={handleEnd}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>

        <View style={styles.meditationView}>
          <Text style={styles.timerLarge}>{formatTime(timeRemaining)}</Text>
          <Text style={styles.meditationPrompt}>Be present with this moment</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
            <Text style={styles.pauseButtonText}>Pause</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Simple Timer</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.durationSelector}>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => adjustDuration(-5)}
          >
            <Text style={styles.adjustButtonText}>-5</Text>
          </TouchableOpacity>

          <View style={styles.durationDisplay}>
            <Text style={styles.durationNumber}>{duration}</Text>
            <Text style={styles.durationLabel}>minutes</Text>
          </View>

          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => adjustDuration(5)}
          >
            <Text style={styles.adjustButtonText}>+5</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.presetButtons}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              setDuration(5);
              setTimeRemaining(5 * 60);
              pausedTimeRemainingRef.current = 5 * 60;
            }}
          >
            <Text style={styles.presetButtonText}>5 min</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              setDuration(10);
              setTimeRemaining(10 * 60);
              pausedTimeRemainingRef.current = 10 * 60;
            }}
          >
            <Text style={styles.presetButtonText}>10 min</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              setDuration(20);
              setTimeRemaining(20 * 60);
              pausedTimeRemainingRef.current = 20 * 60;
            }}
          >
            <Text style={styles.presetButtonText}>20 min</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => {
              setDuration(30);
              setTimeRemaining(30 * 60);
              pausedTimeRemainingRef.current = 30 * 60;
            }}
          >
            <Text style={styles.presetButtonText}>30 min</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instruction}>
          Set your desired duration and begin when ready.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.beginButton} onPress={handleStart}>
          <Text style={styles.beginButtonText}>Begin</Text>
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
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.charcoal,
  },
  beginButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  beginButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.medium,
  },
  // Running timer styles
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
});
