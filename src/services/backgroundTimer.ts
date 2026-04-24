import { Platform } from 'react-native';
import BackgroundActions from 'react-native-background-actions';

// Callback type for timer updates
type TimerCallback = (remainingSeconds: number) => void;
type CompletionCallback = () => void;

// Store callbacks
let onTickCallback: TimerCallback | null = null;
let onCompleteCallback: CompletionCallback | null = null;
let shouldStop = false;

// Sleep helper
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Keepalive task for guided audio — just holds the foreground service open.
// No timer, no gong. Exits when shouldStop is set.
const keepAliveTask = async () => {
  shouldStop = false;
  while (!shouldStop) {
    await sleep(1000);
  }
};

// Pure timer task — fires onTickCallback every second, then onCompleteCallback
// when the duration elapses. Gong playback is handled by the JS side via
// audioService (track-player), NOT here, so we only have one audio backend
// active and there's no race between this task being torn down and the gong
// finishing.
const timerTask = async (taskData?: { durationSeconds: number }) => {
  const durationSeconds = taskData?.durationSeconds ?? 600;
  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;

  shouldStop = false;

  while (!shouldStop) {
    const now = Date.now();
    const remainingMs = endTime - now;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    if (onTickCallback) {
      onTickCallback(remainingSeconds);
    }

    if (remainingMs <= 0) {
      if (onCompleteCallback) {
        onCompleteCallback();
      }
      break;
    }

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
   * Start a foreground service keepalive for guided audio on Android.
   * No timer logic, no gong — just prevents Android from killing background audio.
   * Call stop() when audio completes or is paused.
   */
  startKeepAlive: async (durationSeconds: number): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    onTickCallback = null;
    onCompleteCallback = null;
    shouldStop = false;

    try {
      if (BackgroundActions.isRunning()) {
        await BackgroundActions.stop();
      }
      await BackgroundActions.start(keepAliveTask, getBackgroundOptions(durationSeconds));
      return true;
    } catch (error) {
      console.error('Error starting background keepalive:', error);
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
};
