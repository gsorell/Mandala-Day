import React, { useState, useEffect, useRef } from 'react';
import { BreathingMandalaButton } from '../components/BreathingMandalaButton';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { audioService } from '../services/audio';
import { getGongSound, getGongUri } from '../data/audioAssets';
import { trackSimpleTimerStart, trackSimpleTimerComplete } from '../services/analytics';
import { backgroundTimer } from '../services/backgroundTimer';
import { addExtraPracticeMinutes } from '../services/storage';
import {
  areWebNotificationsSupported,
  getNotificationPermission,
} from '../services/webNotifications';

// Show web notification for timer completion
const showTimerCompleteWebNotification = () => {
  if (Platform.OS !== 'web') return;
  if (!areWebNotificationsSupported()) return;
  if (getNotificationPermission() !== 'granted') return;

  try {
    new Notification('Timer Complete', {
      body: 'Your meditation timer has finished',
      icon: '/icon-192.png',
      tag: 'timer-complete',
      requireInteraction: true,
    });
  } catch (error) {
    console.error('Error showing web notification:', error);
  }
};

// Wake Lock to keep screen awake on web/PWA during timer
let wakeLock: WakeLockSentinel | null = null;

const requestWakeLock = async () => {
  if (Platform.OS !== 'web') return;
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('Wake Lock acquired');
    }
  } catch (err) {
    console.log('Wake Lock error:', err);
  }
};

const releaseWakeLock = async () => {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('Wake Lock released');
    } catch (err) {
      console.log('Wake Lock release error:', err);
    }
  }
};

export const SimpleTimerScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
  // Track when meditation was actually completed (not when user presses Return)
  const completionTimeRef = useRef<Date | null>(null);

  // Ensure the timer-gong notification channel exists on Android
  const ensureNotificationChannel = async () => {
    if (Platform.OS !== 'android') return;

    try {
      // Delete old cached channel if it exists
      try {
        await Notifications.deleteNotificationChannelAsync('timer-gong');
      } catch (_) {
        // Channel may not exist, ignore
      }

      // Create/ensure the timer-gong-v3 channel exists
      await Notifications.setNotificationChannelAsync('timer-gong-v3', {
        name: 'Timer Completion',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0],
        lightColor: '#6B5B95',
        sound: 'gong',
        bypassDnd: true,
        enableVibrate: false,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
      });
    } catch (error) {
      console.error('Error ensuring notification channel:', error);
    }
  };

  // No longer scheduling notifications - gong will only play in-app
  const scheduleCompletionNotification = async (seconds: number) => {
    // Notification removed per user request
    // Gong will play when timer completes if app is in foreground
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      backgroundTimer.stop();
      // Release keep awake on unmount
      if (Platform.OS === 'android') {
        deactivateKeepAwake('meditation-timer');
      }
      releaseWakeLock();
    };
  }, []);

  // Check if timer should have completed while app was in background (web/fallback)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // On Android with foreground service, the service handles completion
      // This is mainly for web/PWA fallback
      if (Platform.OS !== 'android' && nextAppState === 'active' && isRunning && endTimeRef.current) {
        const now = Date.now();
        if (now >= endTimeRef.current) {
          // Timer completed while in background
          // On web/PWA, we play gong now when user returns
          if (!hasPlayedGong.current) {
            hasPlayedGong.current = true;
            playGongSound();
            showTimerCompleteWebNotification();
          }
          cancelCompletionNotification();
          releaseWakeLock();
          setIsRunning(false);
          // Record completion time when timer actually finished (use endTimeRef as that's when it completed)
          completionTimeRef.current = new Date(endTimeRef.current!);
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
    // On Android, the foreground service handles the timer - skip local interval
    if (Platform.OS === 'android' && backgroundTimer.isRunning()) {
      return;
    }

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
          // Cancel notification to avoid duplicate sounds
          cancelCompletionNotification();
          // Release wake lock - timer is done
          if (Platform.OS === 'android') {
            deactivateKeepAwake('meditation-timer');
          }
          releaseWakeLock();
          // Play gong and show notification
          if (!hasPlayedGong.current) {
            hasPlayedGong.current = true;
            playGongSound();
            showTimerCompleteWebNotification();
          }
          setIsRunning(false);
          // Record completion time now, not when user presses Return
          completionTimeRef.current = new Date();
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

  const handleStart = async () => {
    const startingTime = timeRemaining === 0 ? duration * 60 : timeRemaining;
    if (timeRemaining === 0) {
      setTimeRemaining(duration * 60);
      hasPlayedGong.current = false;
    }
    trackSimpleTimerStart(duration);
    // Set the expected end time for background completion detection
    endTimeRef.current = Date.now() + startingTime * 1000;

    // Keep screen awake during meditation (Android native)
    if (Platform.OS === 'android') {
      try {
        await activateKeepAwakeAsync('meditation-timer');
        console.log('Screen keep awake activated');
      } catch (err) {
        console.log('Keep awake error:', err);
      }
    }

    // Keep screen awake on web/PWA so timer and gong work
    requestWakeLock();
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = async () => {
    // Save the current time remaining when pausing
    pausedTimeRemainingRef.current = timeRemaining;
    startTimeRef.current = null;
    endTimeRef.current = null;
    cancelCompletionNotification();
    // Stop the foreground service on Android
    await backgroundTimer.stop();
    // Release screen wake lock
    if (Platform.OS === 'android') {
      deactivateKeepAwake('meditation-timer');
    }
    releaseWakeLock();
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleResume = async () => {
    // Reset start time - it will be set fresh when useEffect runs
    startTimeRef.current = null;
    // Set expected end time for background completion detection
    endTimeRef.current = Date.now() + timeRemaining * 1000;

    // Re-activate screen wake lock on Android
    if (Platform.OS === 'android') {
      try {
        await activateKeepAwakeAsync('meditation-timer');
      } catch (err) {
        console.log('Keep awake error:', err);
      }
    }

    // Re-acquire wake lock for web/fallback
    requestWakeLock();
    setIsRunning(true);
    setIsPaused(false);
  };

  const handleReset = async () => {
    cancelCompletionNotification();
    // Stop the foreground service on Android
    await backgroundTimer.stop();
    // Release screen wake lock
    if (Platform.OS === 'android') {
      deactivateKeepAwake('meditation-timer');
    }
    releaseWakeLock();
    setIsRunning(false);
    setIsPaused(false);
    setShowComplete(false);
    setTimeRemaining(duration * 60);
    hasPlayedGong.current = false;
    startTimeRef.current = null;
    pausedTimeRemainingRef.current = duration * 60;
    endTimeRef.current = null;
    completionTimeRef.current = null;
    audioService.stop();
  };

  const handleEnd = () => {
    if (isPaused) {
      // If already paused, just go back
      handleReset();
      navigation.goBack();
    } else {
      // If running, show confirmation with option to keep timer running in background
      Alert.alert(
        'End Timer',
        'Would you like to end the meditation or let it continue in the background?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue in Background',
            onPress: () => {
              // On Android with foreground service, keep it running - it will play gong
              // Clear local interval but let foreground service handle completion
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
              navigation.goBack();
            },
          },
          {
            text: 'End Timer',
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

  const handleComplete = async () => {
    trackSimpleTimerComplete(duration);
    // Save completed minutes to storage using the time when meditation actually finished
    const completionDate = completionTimeRef.current || new Date();
    const completedDay = format(completionDate, 'yyyy-MM-dd');
    await addExtraPracticeMinutes(completedDay, duration);
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

  if (isRunning) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={[styles.endButton, { top: insets.top + spacing.sm }]} onPress={handleEnd}>
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
