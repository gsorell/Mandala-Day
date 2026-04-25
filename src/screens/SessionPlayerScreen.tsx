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
import { getSessionAudioFile, getSessionAudioUri } from '../data/audioAssets';
import { trackMeditationStart, trackMeditationComplete, trackMeditationEndEarly } from '../services/analytics';
import { backgroundTimer } from '../services/backgroundTimer';
import { BreathingMandalaButton } from '../components/BreathingMandalaButton';

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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSilentMode, setIsSilentMode] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);
  // Track wall-clock time to handle screen sleep correctly (silent mode only)
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRemainingRef = useRef<number>(session?.durationSec || 600);
  // Track the expected end time for background completion detection
  const endTimeRef = useRef<number | null>(null);
  // Track notification ID for cancellation (silent mode)
  const notificationIdRef = useRef<string | null>(null);
  // Track if completion has been handled (to avoid duplicate handling)
  const completionHandledRef = useRef(false);
  // Track the total audio duration in ms (for audio-position-based timer)
  const audioDurationMsRef = useRef<number>((session?.durationSec || 600) * 1000);

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

  // Single completion path. Called directly from every end-of-session trigger
  // (silent JS tick, Android foreground service, audio onComplete, AppState
  // handler). Idempotent via completionHandledRef so duplicate triggers no-op.
  const handleComplete = () => {
    if (completionHandledRef.current) return;
    if (!session) return;
    completionHandledRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
    endTimeRef.current = null;

    audioService.stop();
    cancelCompletionNotification();
    backgroundTimer.stop();
    Promise.resolve()
      .then(() => deactivateKeepAwake(isSilentMode ? 'silent-meditation' : 'guided-meditation'))
      .catch(() => {
        // Wake lock was never activated, ignore
      });

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try { (navigator as any).mediaSession.playbackState = 'none'; } catch (_e) {}
    }

    trackMeditationComplete(session.title, session.practiceType, session.durationSec);

    navigation.replace('SessionComplete', {
      instanceId,
      sessionTitle: session.title,
      dedication: session.dedication,
      shareMessage: session.shareMessage,
      // Silent practice has no closing chime baked into audio — play a gong
      // on the completion screen so the meditation has an audible ending.
      playEndingGong: isSilentMode,
    });

    // Persist completion in the background; never block the navigation on it.
    completeSession(instanceId).catch((error) => {
      console.error('Failed to persist session completion:', error);
    });
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
      if (nextAppState === 'active' && isPlaying && endTimeRef.current) {
        const now = Date.now();

        if (!isSilentMode) {
          // Guided audio mode: audio position is the source of truth.
          // iOS suspends audio during screen lock, so wall-clock time is unreliable
          // for determining how much of the meditation has actually been heard.
          const actualStatus = await audioService.getActualStatus();
          if (actualStatus) {
            const remaining = Math.max(0, Math.floor((audioDurationMsRef.current - actualStatus.positionMs) / 1000));
            if (remaining === 0) {
              // Audio played to end while in background
              handleComplete();
            } else if (!actualStatus.isPlaying) {
              // Audio was suspended/interrupted — resync timer and resume playback
              pausedTimeRemainingRef.current = remaining;
              startTimeRef.current = Date.now();
              endTimeRef.current = Date.now() + remaining * 1000;
              setTimeRemaining(remaining);
              await audioService.play();
            } else {
              // Audio still playing — just resync timer to audio position
              setTimeRemaining(remaining);
              pausedTimeRemainingRef.current = remaining;
              startTimeRef.current = Date.now();
              endTimeRef.current = Date.now() + remaining * 1000;
            }
          }
          // If no status available, let the timer/onComplete handle it
        } else if (now >= endTimeRef.current) {
          // Silent mode: wall-clock is the source of truth.
          // Gong is played on SessionCompleteScreen via playEndingGong route flag.
          handleComplete();
        }
        // For silent mode with time remaining, timer continues via wall-clock calculation
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

      timerRef.current = setInterval(async () => {
        // startTimeRef is nulled when the session is paused or stopped — skip
        // bogus tick to avoid computing Date.now() - null = ~1.7 trillion ms
        if (startTimeRef.current === null) return;

        if (!isSilentMode) {
          // Guided audio mode: sync timer to actual audio position.
          // This prevents the timer from drifting ahead when iOS suspends audio
          // during screen lock — the timer can never show less time remaining
          // than the audio has left to play.
          const status = await audioService.getActualStatus();
          if (status) {
            const remaining = Math.max(0, Math.floor((audioDurationMsRef.current - status.positionMs) / 1000));
            setTimeRemaining(remaining);
          }
          // If status unavailable, skip this tick (don't fall back to wall-clock)
        } else {
          // Silent mode: use wall-clock time
          const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
          const newTimeRemaining = Math.max(0, pausedTimeRemainingRef.current - elapsed);

          if (newTimeRemaining <= 0) {
            handleComplete();
          } else {
            setTimeRemaining(newTimeRemaining);
          }
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, isSilentMode]);

  // Safety net: if the timer hits 0 in audio mode but onComplete never fires
  // (e.g., phone call interrupts audio while app stays in foreground on iOS),
  // force completion after a 10-second grace period.
  useEffect(() => {
    if (timeRemaining === 0 && isPlaying && !isSilentMode) {
      const timeout = setTimeout(() => {
        handleComplete();
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [timeRemaining, isPlaying, isSilentMode]);

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
    // Recover from the edge case where timer state was left at 0 after a
    // previous failed completion transition.
    const effectiveDuration = timeRemaining > 0 ? timeRemaining : (session?.durationSec || 600);

    // Set the expected end time for background completion detection
    endTimeRef.current = Date.now() + effectiveDuration * 1000;

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
          effectiveDuration,
          (remaining) => {
            setTimeRemaining(remaining);
            if (remaining === 0) handleComplete();
          },
          () => {
            // Fallback if the tick callback never fired remaining=0
            handleComplete();
          }
        );
        console.log('Background timer started:', started);
      }
      setIsPlaying(true);
    } else if (audioService.isLoaded()) {
      setIsPlaying(true);
      // Keep screen awake during guided audio, same as silent mode
      try {
        await activateKeepAwakeAsync('guided-meditation');
      } catch (err) {
        console.log('Keep awake error:', err);
      }
      // Start foreground service on Android to prevent the OS from killing audio in background
      if (Platform.OS === 'android') {
        await backgroundTimer.startKeepAlive(effectiveDuration);
      }
      await audioService.play();
      // Register with browser media session so Chrome treats this as active background audio.
      // Passing null to setActionHandler REMOVES the handler — we need real handlers registered
      // or Chrome won't show lockscreen controls and may throttle the audio session.
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          const ms = (navigator as any).mediaSession;
          ms.metadata = new (window as any).MediaMetadata({
            title: session?.title || 'Guided Meditation',
            artist: 'Mandala Day',
            artwork: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
          });
          ms.playbackState = 'playing';
          ms.setActionHandler('pause', async () => {
            await audioService.pause();
            ms.playbackState = 'paused';
          });
          ms.setActionHandler('play', async () => {
            await audioService.play();
            ms.playbackState = 'playing';
          });
        } catch (_e) { /* MediaSession not supported */ }
      }
    } else {
      setIsPlaying(true);
    }
  };

  const togglePlay = async () => {
    if (!isPlaying) {
      if (timeRemaining <= 0) {
        const resetDuration = session?.durationSec || 600;
        setTimeRemaining(resetDuration);
        pausedTimeRemainingRef.current = resetDuration;
      }

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
            title: session?.title ?? 'Guided Meditation',
            artist: 'Mandala Day',
            onPlaybackStatusUpdate: (status) => {
              // Capture actual audio duration for position-based timer sync
              if (status.isLoaded && status.durationMillis) {
                audioDurationMsRef.current = status.durationMillis;
              }
            },
            onComplete: () => {
              handleComplete();
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
        deactivateKeepAwake('guided-meditation');
        if (Platform.OS === 'android') await backgroundTimer.stop();
        await audioService.pause();
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          try { (navigator as any).mediaSession.playbackState = 'paused'; } catch (_e) {}
        }
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
            if (remaining === 0) handleComplete();
          },
          () => {
            // Fallback if the tick callback never fired remaining=0
            handleComplete();
          }
        );
      }
      setIsPlaying(true);
      setIsPaused(false);
    } else if (audioService.isLoaded()) {
      setIsPlaying(true);
      setIsPaused(false);
      try {
        await activateKeepAwakeAsync('guided-meditation');
      } catch (err) {
        console.log('Keep awake error:', err);
      }
      if (Platform.OS === 'android') {
        await backgroundTimer.startKeepAlive(timeRemaining);
      }
      await audioService.play();
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          (navigator as any).mediaSession.playbackState = 'playing';
        } catch (_e) { /* MediaSession not supported */ }
      }
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
      // Release keep awake. Tag may never have been activated if End was
      // tapped before countdown completed — swallow the async rejection.
      Promise.resolve()
        .then(() => deactivateKeepAwake(isSilentMode ? 'silent-meditation' : 'guided-meditation'))
        .catch(() => {
          // Wake lock was never activated, ignore
        });
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
        scrollEnabled={false}
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
          <BreathingMandalaButton onPress={togglePlay} />
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
    flexGrow: 1,
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
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  playButtonRing1: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(184, 148, 95, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonRing2: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(184, 148, 95, 0.11)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonRing3: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(184, 148, 95, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.agedBrass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonInnerDetail: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 0.5,
    borderColor: 'rgba(11, 8, 23, 0.25)',
  },
  playButtonText: {
    color: colors.ritualNight,
    fontSize: 13,
    fontWeight: typography.fontWeights.medium,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
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
    paddingVertical: spacing.lg,
  },
  preSessionPrompt: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: typography.fontSizes.xxl * typography.lineHeights.relaxed,
  },
  preSessionInstruction: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  silentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
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
