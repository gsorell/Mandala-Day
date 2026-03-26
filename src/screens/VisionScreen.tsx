import React, { useState, useEffect, useRef } from 'react';
import { BreathingMandalaButton } from '../components/BreathingMandalaButton';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AVPlaybackStatus } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { audioService } from '../services/audio';
import { format } from 'date-fns';
import { addExtraPracticeMinutes, appendExtraInstance } from '../services/storage';
import { SessionStatus } from '../types';

const VISION_DURATION_MIN = 10;
const VISION_DURATION_SEC = VISION_DURATION_MIN * 60;

const getVisionAudio = () => require('../../assets/audio/vision.mp3');

export const VisionScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(VISION_DURATION_SEC * 1000);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Audio continues in background
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hasStarted.current) {
        audioService.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
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

  const playAudio = async () => {
    hasStarted.current = true;
    setIsPlaying(true);
    setIsPaused(false);

    if (Platform.OS === 'web' && audioService.isLoaded()) {
      await audioService.play();
    } else {
      await audioService.loadAndPlay(getVisionAudio(), {
        onPlaybackStatusUpdate: handlePlaybackStatus,
        onComplete: () => {
          setIsPlaying(false);
          handleComplete();
        },
        onError: (error) => {
          console.error('Vision playback error:', error);
          setIsPlaying(false);
        },
      });
    }
  };

  const handleStart = async () => {
    if (Platform.OS === 'web') {
      setIsLoading(true);
      try {
        await audioService.preload(getVisionAudio(), {
          onPlaybackStatusUpdate: handlePlaybackStatus,
          onComplete: () => {
            setIsPlaying(false);
            handleComplete();
          },
          onError: (error) => {
            console.error('Vision playback error:', error);
            setIsPlaying(false);
          },
        });
      } catch (error) {
        console.error('Failed to pre-load Vision audio:', error);
      }
      setIsLoading(false);
    }
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
    const completionDate = new Date();
    const today = format(completionDate, 'yyyy-MM-dd');
    await addExtraPracticeMinutes(today, VISION_DURATION_MIN);
    await appendExtraInstance({
      id: `${today}_extra_vision_${Date.now()}`,
      date: today,
      templateId: 'extra_vision',
      scheduledAt: completionDate.toISOString(),
      status: SessionStatus.COMPLETED,
      endedAt: completionDate.toISOString(),
      snoozeCount: 0,
    });
    navigation.navigate('SessionComplete', {
      sessionTitle: 'Clear Seeing',
      dedication: 'Seeing, just as it is.',
      shareMessage: 'I opened my eyes wider today',
    });
  };

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

  if (isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={[styles.endButton, { top: insets.top + spacing.sm }]} onPress={handleEnd}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>

        <View style={styles.meditationView}>
          <Text style={styles.timerLarge}>{formatTime(duration - currentPosition)}</Text>
          <Text style={styles.meditationPrompt}>Wide open vision.</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
            <Text style={styles.pauseButtonText}>Pause</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Clear Seeing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.durationDisplay}>
          <Text style={styles.durationNumber}>10</Text>
          <Text style={styles.durationLabel}>minutes</Text>
        </View>

        <Text style={styles.description}>
          See clearly.{'\n'}Nothing added. Nothing removed.
        </Text>

        <Text style={styles.instruction}>
          Find a comfortable seat and begin when ready.
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
    alignItems: 'center',
  },
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
