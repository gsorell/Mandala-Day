import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { getSessionById } from '../data/sessions';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { RootStackParamList } from '../types';
import { audioService } from '../services/audio';
import { getSessionAudioFile, getSessionAudioUri } from '../data/audioAssets';

type RouteProps = RouteProp<RootStackParamList, 'SessionPlayer'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SessionPlayerScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { instanceId } = route.params;
  const { todayInstances, startSession, completeSession } = useApp();

  const instance = todayInstances.find((i) => i.id === instanceId);
  const session = instance ? getSessionById(instance.templateId) : null;

  // Check if this session has a pre-recorded audio file
  const sessionAudioFile = instance ? getSessionAudioFile(instance.templateId) : undefined;
  const hasAudioFile = sessionAudioFile !== undefined;

  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(session?.durationSec || 600);
  const [showDedication, setShowDedication] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSilentMode, setIsSilentMode] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!hasStartedRef.current && instance) {
      startSession(instanceId);
      hasStartedRef.current = true;
    }
  }, [instanceId, instance, startSession]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioService.stop();
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
      // Countdown finished, start playing the pre-loaded audio
      setCountdown(null);
      playPreloadedAudio();
    }
  }, [countdown]);

  useEffect(() => {
    if (isPlaying && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsPlaying(false);
            setShowDedication(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, timeRemaining]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Play the pre-loaded audio after countdown finishes
  const playPreloadedAudio = async () => {
    setIsPlaying(true);
    if (!isSilentMode && audioService.isLoaded()) {
      await audioService.play();
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
    } else {
      // Pausing playback
      setIsPlaying(false);
      if (!isSilentMode) {
        await audioService.pause();
      }
    }
  };

  const handleComplete = async () => {
    await completeSession(instanceId);
    navigation.goBack();
  };

  const handleEndEarly = async () => {
    await audioService.stop();
    setIsPlaying(false);
    navigation.goBack();
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

  if (showDedication) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.dedicationContainer}>
          <Text style={styles.dedicationTitle}>Session Complete</Text>
          {session.dedication && (
            <Text style={styles.dedicationText}>{session.dedication}</Text>
          )}
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>Return</Text>
          </TouchableOpacity>
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
            style={styles.endButtonFloating}
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
