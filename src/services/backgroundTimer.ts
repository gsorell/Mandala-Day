import { Platform } from 'react-native';
import BackgroundActions from 'react-native-background-actions';
import { Audio } from 'expo-av';
import { getGongSound } from '../data/audioAssets';

// Callback type for timer updates
type TimerCallback = (remainingSeconds: number) => void;
type CompletionCallback = () => void;

// Store callbacks
let onTickCallback: TimerCallback | null = null;
let onCompleteCallback: CompletionCallback | null = null;
let shouldStop = false;

// Store reference to gong sound so it can be stopped
let currentGongSound: Audio.Sound | null = null;

// Sleep helper
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// The background task that runs the timer
const timerTask = async (taskData?: { durationSeconds: number }) => {
  const durationSeconds = taskData?.durationSeconds ?? 600; // Default to 10 minutes
  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;

  shouldStop = false;

  // Loop until timer completes or is stopped
  while (!shouldStop) {
    const now = Date.now();
    const remainingMs = endTime - now;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    // Notify the UI of the current time
    if (onTickCallback) {
      onTickCallback(remainingSeconds);
    }

    // Check if timer completed
    if (remainingMs <= 0) {
      // Play the gong sound
      try {
        const gongSource = getGongSound();
        const { sound } = await Audio.Sound.createAsync(gongSource);
        currentGongSound = sound;
        await sound.playAsync();
        // Wait for gong to finish (roughly 3 seconds), but can be stopped early
        await sleep(3000);
        // Only unload if not already stopped
        if (currentGongSound === sound) {
          await sound.unloadAsync();
          currentGongSound = null;
        }
      } catch (error) {
        console.error('Error playing gong in background:', error);
      }

      // Notify completion
      if (onCompleteCallback) {
        onCompleteCallback();
      }
      break;
    }

    // Wait before next tick (update every second)
    await sleep(1000);
  }
};

// Configuration for the background task
const getBackgroundOptions = (durationSeconds: number) => ({
  taskName: 'MeditationTimer',
  taskTitle: 'Meditation in Progress',
  taskDesc: formatTime(durationSeconds) + ' remaining',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#6B5B95',
  linkingURI: 'mandaladay://',
  parameters: {
    durationSeconds,
  },
  // Keep notification visible
  progressBar: {
    max: durationSeconds,
    value: 0,
    indeterminate: false,
  },
});

// Format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Public API
export const backgroundTimer = {
  /**
   * Start the background timer with foreground service
   */
  start: async (
    durationSeconds: number,
    onTick: TimerCallback,
    onComplete: CompletionCallback
  ): Promise<boolean> => {
    // Only use foreground service on Android
    if (Platform.OS !== 'android') {
      return false;
    }

    // Store callbacks
    onTickCallback = onTick;
    onCompleteCallback = onComplete;
    shouldStop = false;

    try {
      // Check if already running
      if (BackgroundActions.isRunning()) {
        await BackgroundActions.stop();
      }

      // Start the background task
      await BackgroundActions.start(
        timerTask,
        getBackgroundOptions(durationSeconds)
      );

      return true;
    } catch (error) {
      console.error('Error starting background timer:', error);
      return false;
    }
  },

  /**
   * Stop the background timer
   */
  stop: async (): Promise<void> => {
    shouldStop = true;
    onTickCallback = null;
    onCompleteCallback = null;

    if (Platform.OS === 'android') {
      try {
        if (BackgroundActions.isRunning()) {
          await BackgroundActions.stop();
        }
      } catch (error) {
        console.error('Error stopping background timer:', error);
      }
    }
  },

  /**
   * Update the notification with new time remaining
   */
  updateNotification: async (remainingSeconds: number, totalSeconds: number): Promise<void> => {
    if (Platform.OS !== 'android') return;

    try {
      if (BackgroundActions.isRunning()) {
        await BackgroundActions.updateNotification({
          taskDesc: formatTime(remainingSeconds) + ' remaining',
          progressBar: {
            max: totalSeconds,
            value: totalSeconds - remainingSeconds,
            indeterminate: false,
          },
        });
      }
    } catch (error) {
      // Silently fail - notification update is not critical
    }
  },

  /**
   * Check if the background timer is running
   */
  isRunning: (): boolean => {
    if (Platform.OS !== 'android') return false;
    return BackgroundActions.isRunning();
  },

  /**
   * Stop the gong sound if it's currently playing
   */
  stopGong: async (): Promise<void> => {
    if (currentGongSound) {
      try {
        await currentGongSound.stopAsync();
        await currentGongSound.unloadAsync();
        currentGongSound = null;
      } catch (error) {
        // Sound may have already finished, ignore errors
        currentGongSound = null;
      }
    }
  },
};
