import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useApp } from '../context/AppContext';
import { getSessionById } from '../data/sessions';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { RootStackParamList } from '../types';
import { audioService } from '../services/audio';
import { getSessionAudioFile, getSessionAudioUri, getGongSound, getGongUri } from '../data/audioAssets';
import { trackMeditationStart, trackMeditationComplete, trackMeditationEndEarly } from '../services/analytics';
import { backgroundTimer } from '../services/backgroundTimer';

type RouteProps = RouteProp<RootStackParamList, 'SessionPlayer'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SessionPlayerScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { instanceId } = route.params;
  const { todayInstances, startSession, completeSession } = useApp();

  const instance = todayInstances.find((i) => i.id === instanceId);
  const session = instance ? getSessionById(instance.templateId) : null;

  // Check if this session has a pre-recorded audio file
  const sessionAudioFile = instance ? getSessionAudioFile(instance.templateId) : undefined;
  const hasAudioFile = sessionAudioFile !== undefined;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(session?.durationSec || 600);
  const [showDedication, setShowDedication] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSilentMode, setIsSilentMode] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);
  // Track wall-clock time to handle screen sleep correctly
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRemainingRef = useRef<number>(session?.durationSec || 600);
  // Track the expected end time for background completion detection
  const endTimeRef = useRef<number | null>(null);
  // Track notification ID for cancellation (silent mode)
  const notificationIdRef = useRef<string | null>(null);
  // Track if completion has been handled (to avoid duplicate handling)
  const completionHandledRef = useRef(false);

  // Ensure the timer-gong notification channel exists on Android
  const ensureNotificationChannel = async () => {
    if (Platform.OS !== 'android') return;

    try {
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
  };

  // Cancel the completion notification
  const cancelCompletionNotification = async () => {
    // No-op since we're not scheduling notifications
  };

  useEffect(() => {
    if (!hasStartedRef.current && instance) {
      startSession(instanceId);
      hasStartedRef.current = true;
    }
  }, [instanceId, instance, startSession]);

  // Cleanup audio, notification, and background timer on unmount
  useEffect(() => {
    return () => {
      audioService.stop();
      cancelCompletionNotification();
      backgroundTimer.stop();
      // Release keep awake on unmount (for silent mode)
      // Use Promise.resolve to handle both sync and async errors
      Promise.resolve()
        .then(() => deactivateKeepAwake('silent-meditation'))
        .catch(() => {
          // Wake lock was never activated, ignore
        });
    };
  }, []);

  // Handle app state changes (background/foreground) for audio interruptions
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // On Android with silent mode and foreground service, the service handles completion
      if (Platform.OS === 'android' && isSilentMode && backgroundTimer.isRunning()) {
        return;
      }

      if (nextAppState === 'active' && isPlaying && endTimeRef.current) {
        const now = Date.now();
        if (now >= endTimeRef.current) {
          // Timer should have completed while in background
          setIsPlaying(false);
          setTimeRemaining(0);
          startTimeRef.current = null;
          endTimeRef.current = null;

          // Cancel notification (it may have already played the gong, or we'll play it now)
          await cancelCompletionNotification();

          // Navigate to completion screen immediately
          setShowDedication(true);

          // Play gong sound if it was a silent practice (web/fallback)
          if (isSilentMode) {
            try {
              let gongSource: number | { uri: string } = getGongSound();
              if (Platform.OS === 'web') {
                const uri = await getGongUri();
                if (uri) {
                  gongSource = { uri };
                }
              }
              await audioService.loadAndPlay(gongSource);
            } catch (error) {
              console.error('Failed to play gong:', error);
            }
          }
        } else if (!isSilentMode) {
          // App returned from background but timer not complete
          // Check if audio was actually interrupted (phone call, etc.)
          // vs just the screen sleeping (audio continues in background)
          const actualStatus = await audioService.getActualStatus();
          if (actualStatus && !actualStatus.isPlaying) {
            // Audio was interrupted - pause the session and show resume button
            pausedTimeRemainingRef.current = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
            setTimeRemaining(pausedTimeRemainingRef.current);
            startTimeRef.current = null;
            endTimeRef.current = null;
            setIsPlaying(false);
            setIsPaused(true);
          }
          // If audio is still playing, just continue - nothing to do
        }
        // For silent mode, timer continues automatically via wall-clock calculation
      }
      // Don't pause when going to background - let audio continue playing
      // The audio service is configured with staysActiveInBackground: true
    });

    return () => {
      subscription.remove();
    };
  }, [isPlaying, isSilentMode]);

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
      playPreloadedAudio();
    }
  }, [countdown]);

  useEffect(() => {
    // On Android with silent mode, the foreground service handles the timer
    if (Platform.OS === 'android' && isSilentMode && backgroundTimer.isRunning()) {
      return;
    }

    if (isPlaying && timeRemaining > 0) {
      // Set start time when timer begins (using wall-clock time)
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        pausedTimeRemainingRef.current = timeRemaining;
      }

      timerRef.current = setInterval(() => {
        // Calculate remaining time based on actual elapsed wall-clock time
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        const newTimeRemaining = Math.max(0, pausedTimeRemainingRef.current - elapsed);

        // Only end session via timer in silent mode (no audio)
        // When audio is playing, let the audio's onComplete callback handle completion
        if (newTimeRemaining <= 0 && isSilentMode) {
          clearInterval(timerRef.current!);
          setIsPlaying(false);
          setTimeRemaining(0);
          startTimeRef.current = null;
          endTimeRef.current = null;

          // Release keep awake - silent meditation is done
          deactivateKeepAwake('silent-meditation');

          // Cancel notification to avoid double gong (notification handles it when phone is asleep)
          cancelCompletionNotification();

          // Navigate to completion screen immediately - gong will continue playing
          // User can stop gong by interacting with completion screen (Return/Share)
          setShowDedication(true);

          // Play gong sound to signal completion in silent mode
          (async () => {
            try {
              let gongSource: number | { uri: string } = getGongSound();
              if (Platform.OS === 'web') {
                const uri = await getGongUri();
                if (uri) {
                  gongSource = { uri };
                }
              }
              await audioService.loadAndPlay(gongSource);
            } catch (error) {
              console.error('Failed to play gong:', error);
            }
          })();
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
  }, [isPlaying, isSilentMode]);

  // Navigate to share screen when meditation completes
  useEffect(() => {
    if (showDedication && session) {
      const completeAndNavigate = async () => {
        trackMeditationComplete(session.title, session.practiceType, session.durationSec);
        await completeSession(instanceId);
        navigation.replace('SessionComplete', {
          instanceId,
          sessionTitle: session.title,
          dedication: session.dedication,
          shareMessage: session.shareMessage,
        });
      };
      completeAndNavigate();
    }
  }, [showDedication, session, instanceId, completeSession, navigation]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Play the pre-loaded audio after countdown finishes
  const playPreloadedAudio = async () => {
    // Track meditation start
    if (session) {
      trackMeditationStart(session.title, session.practiceType);
    }
    // Set the expected end time for background completion detection
    endTimeRef.current = Date.now() + timeRemaining * 1000;

    if (isSilentMode) {
      // Keep screen awake during silent meditation (all platforms)
      try {
        await activateKeepAwakeAsync('silent-meditation');
        console.log('Screen keep awake activated for silent meditation');
      } catch (err) {
        console.log('Keep awake error:', err);
      }

      // On Android, start the foreground service timer for reliable background completion
      if (Platform.OS === 'android') {
        // Reset completion flag for new meditation
        completionHandledRef.current = false;

        const started = await backgroundTimer.start(
          timeRemaining,
          (remaining) => {
            // Update UI with remaining time from background service
            setTimeRemaining(remaining);

            // Handle completion in tick callback since it runs in main JS context
            // The background service's completion callback may not work reliably
            // because it runs in a different JS context on Android
            if (remaining === 0 && !completionHandledRef.current) {
              completionHandledRef.current = true;
              // Navigate to completion screen immediately - gong will continue playing
              // User will stop gong by interacting with completion screen (Return/Share)
              setIsPlaying(false);
              startTimeRef.current = null;
              endTimeRef.current = null;
              deactivateKeepAwake('silent-meditation');
              setShowDedication(true);
            }
          },
          () => {
            // Completion callback from background service - may not work reliably
            // Keeping as fallback in case tick callback didn't trigger
            if (!completionHandledRef.current) {
              completionHandledRef.current = true;
              setIsPlaying(false);
              setTimeRemaining(0);
              startTimeRef.current = null;
              endTimeRef.current = null;
              deactivateKeepAwake('silent-meditation');
              setShowDedication(true);
            }
          }
        );
        console.log('Background timer started:', started);
      }
      setIsPlaying(true);
    } else if (audioService.isLoaded()) {
      setIsPlaying(true);
      await audioService.play();
    } else {
      setIsPlaying(true);
    }
  };

  const togglePlay = async () => {
    if (!isPlaying) {
      // Pre-load audio during user gesture (required for iOS Safari)
      // Then start countdown
      if (hasAudioFile && sessionAudioFile && instance && !isSilentMode) {
        try {
          let audioSource: number | { uri: string } = sessionAudioFile;

          if (Platform.OS === 'web') {
            const uri = await getSessionAudioUri(instance.templateId);
            if (uri) {
              audioSource = { uri };
            }
          }

          // Pre-load audio during the tap gesture
          await audioService.preload(audioSource, {
            onComplete: () => {
              setShowDedication(true);
              setIsPlaying(false);
            },
            onError: (error) => {
              console.error('Audio playback error:', error);
              setIsPlaying(false);
            },
          });
        } catch (error) {
          console.error('Failed to pre-load meditation audio:', error);
        }
      }
      // Start countdown (audio will play when countdown reaches 0, or timer only for silent mode)
      setCountdown(5);
      setIsPaused(false);
    } else {
      // Pausing playback - save the current time remaining
      pausedTimeRemainingRef.current = timeRemaining;
      startTimeRef.current = null;
      endTimeRef.current = null;
      setIsPlaying(false);
      setIsPaused(true);
      if (isSilentMode) {
        await cancelCompletionNotification();
        // Stop the foreground service on Android
        await backgroundTimer.stop();
        // Release screen wake lock
        deactivateKeepAwake('silent-meditation');
      } else {
        await audioService.pause();
      }
    }
  };

  const handleResume = async () => {
    // Reset start time - it will be set fresh when useEffect runs
    startTimeRef.current = null;
    // Set the expected end time for background completion detection
    endTimeRef.current = Date.now() + timeRemaining * 1000;

    if (isSilentMode) {
      // Re-activate screen wake lock for silent mode (all platforms)
      try {
        await activateKeepAwakeAsync('silent-meditation');
      } catch (err) {
        console.log('Keep awake error:', err);
      }

      // On Android, restart the foreground service timer
      if (Platform.OS === 'android') {
        // Reset completion flag for resumed meditation
        completionHandledRef.current = false;

        await backgroundTimer.start(
          timeRemaining,
          (remaining) => {
            setTimeRemaining(remaining);

            // Handle completion in tick callback (same as initial start)
            if (remaining === 0 && !completionHandledRef.current) {
              completionHandledRef.current = true;
              setIsPlaying(false);
              startTimeRef.current = null;
              endTimeRef.current = null;
              deactivateKeepAwake('silent-meditation');
              setShowDedication(true);
            }
          },
          () => {
            // Fallback completion callback
            if (!completionHandledRef.current) {
              completionHandledRef.current = true;
              setIsPlaying(false);
              setTimeRemaining(0);
              startTimeRef.current = null;
              endTimeRef.current = null;
              deactivateKeepAwake('silent-meditation');
              setShowDedication(true);
            }
          }
        );
      }
      setIsPlaying(true);
      setIsPaused(false);
    } else if (audioService.isLoaded()) {
      setIsPlaying(true);
      setIsPaused(false);
      await audioService.play();
    } else {
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handleEndEarly = async () => {
    const endSession = async () => {
      // Track ending early (calculate elapsed time)
      if (session) {
        const elapsedSeconds = session.durationSec - timeRemaining;
        trackMeditationEndEarly(session.title, session.practiceType, elapsedSeconds);
      }
      await audioService.stop();
      await cancelCompletionNotification();
      // Stop the foreground service on Android
      await backgroundTimer.stop();
      // Release keep awake for silent mode
      if (isSilentMode) {
        deactivateKeepAwake('silent-meditation');
      }
      endTimeRef.current = null;
      setIsPlaying(false);
      setIsPaused(false);
      navigation.goBack();
    };

    if (isPaused || !isPlaying) {
      // If paused or not yet started, just end without confirmation
      await endSession();
    } else if (Platform.OS === 'web') {
      // On web, use browser confirm dialog
      if (window.confirm('Are you sure you want to end this session early?')) {
        await endSession();
      }
    } else {
      // On native, use Alert
      Alert.alert(
        'End Session',
        'Are you sure you want to end this session early?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End',
            style: 'destructive',
            onPress: endSession,
          },
        ]
      );
    }
  };

  if (!session || !instance) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Session not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Return</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  // Paused state view
  if (isPaused) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.meditationView}>
          <TouchableOpacity
            style={[styles.endButtonFloating, { top: insets.top + spacing.sm }]}
            onPress={handleEndEarly}
          >
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>

          <View style={styles.meditationContent}>
            <Text style={styles.meditationTitle}>{session.title}</Text>
            <Text style={styles.meditationTimer}>{formatTime(timeRemaining)}</Text>
            <Text style={styles.meditationPrompt}>Paused</Text>
          </View>

          <View style={styles.meditationControls}>
            <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
              <Text style={styles.resumeButtonText}>Resume</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // When meditation is playing, show a simple pleasant timer view
  if (isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.meditationView}>
          <TouchableOpacity
            style={[styles.endButtonFloating, { top: insets.top + spacing.sm }]}
            onPress={handleEndEarly}
          >
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>

          <View style={styles.meditationContent}>
            <Text style={styles.meditationTitle}>{session.title}</Text>
            <Text style={styles.meditationTimer}>{formatTime(timeRemaining)}</Text>
            <Text style={styles.meditationPrompt}>{session.shortPrompt}</Text>
          </View>

          <View style={styles.meditationControls}>
            <TouchableOpacity style={styles.pauseButton} onPress={togglePlay}>
              <Text style={styles.pauseButtonText}>Pause</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleEndEarly}
        >
          <Text style={styles.closeButtonText}>End</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.sessionTitle}>{session.title}</Text>
          <Text style={styles.timer}>{formatTime(timeRemaining)}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scriptContent}
        pinchGestureEnabled={false}
        maximumZoomScale={1}
        minimumZoomScale={1}
      >
        <View style={styles.preSessionView}>
          {countdown !== null ? (
            <>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              <Text style={styles.countdownText}>
                {countdown === 0 ? 'Begin...' : 'Prepare yourself...'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.preSessionPrompt}>{session.shortPrompt}</Text>
              <Text style={styles.preSessionInstruction}>
                Find a comfortable position and prepare to begin.
              </Text>
              
              {hasAudioFile && (
                <TouchableOpacity
                  style={styles.silentToggle}
                  onPress={() => setIsSilentMode(!isSilentMode)}
                >
                  <View style={styles.toggleIndicator}>
                    {isSilentMode && <View style={styles.toggleDot} />}
                  </View>
                  <Text style={styles.silentToggleText}>Silent Practice</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.controls}>
        {countdown === null && (
          <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
            <Text style={styles.playButtonText}>Begin Meditation</Text>
          </TouchableOpacity>
        )}
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
  closeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerRight: {
    width: 50,
  },
  sessionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  timer: {
    color: colors.accent,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    marginTop: spacing.xs,
  },
  viewToggle: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.ritualSurface,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  toggleTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scriptContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  segment: {
    marginBottom: spacing.lg,
  },
  activeSegment: {
    backgroundColor: colors.ritualSurface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: -spacing.md,
  },
  scriptText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    lineHeight: typography.fontSizes.lg * typography.lineHeights.relaxed,
  },
  activeScriptText: {
    color: colors.accent,
  },
  pauseMarker: {
    backgroundColor: colors.ritualSurface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  activePauseMarker: {
    backgroundColor: colors.primary,
    borderLeftColor: colors.white,
  },
  pauseText: {
    color: colors.accent,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
  },
  minimalView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  minimalPrompt: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.fontSizes.xxl * typography.lineHeights.relaxed,
  },
  minimalInstruction: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
  },
  controls: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.charcoal,
  },
  playButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.presence,
  },
  playButtonText: {
    color: colors.white,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.lg,
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
  },
  dedicationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },  dedicaLogo: {
    width: 120,
    height: 120,
    marginBottom: spacing.xl,
    opacity: 0.8,
  },
  dedicationtionLogo: {
    width: 120,
    height: 120,
    marginBottom: spacing.xl,
    opacity: 0.8,
  },  dedicationLogo: {
    width: 120,
    height: 120,
    marginBottom: spacing.xl,
    opacity: 0.8,
  },
  dedicationTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xl,
  },
  dedicationText: {
    color: colors.accent,
    fontSize: typography.fontSizes.lg,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.lg * typography.lineHeights.relaxed,
    marginBottom: spacing.xl,
  },
  completeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    ...shadows.presence,
  },
  completeButtonText: {
    color: colors.white,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  // Meditation playing view styles
  meditationView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  endButtonFloating: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  endButtonText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
  },
  meditationContent: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  meditationTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.lg,
    marginBottom: spacing.md,
  },
  meditationTimer: {
    color: colors.accent,
    fontSize: 72,
    fontWeight: typography.fontWeights.light,
    marginBottom: spacing.xl,
    letterSpacing: 4,
  },
  meditationPrompt: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: 300,
  },
  meditationControls: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pauseButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.ritualSurface,
  },
  pauseButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  resumeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  resumeButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  // Pre-session view styles
  preSessionView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  preSessionPrompt: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.fontSizes.xxl * typography.lineHeights.relaxed,
  },
  preSessionInstruction: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  silentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  toggleIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  silentToggleText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.normal,
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
