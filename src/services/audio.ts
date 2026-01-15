import { Audio, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';

export interface AudioPlaybackOptions {
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

class AudioService {
  private sound: Audio.Sound | null = null;
  private isPlaying = false;
  private isPaused = false;
  private options: AudioPlaybackOptions = {};

  /**
   * Load audio and start playing immediately.
   * For iOS Safari, this must be called directly from a user gesture.
   */
  async loadAndPlay(
    audioSource: number | { uri: string },
    options: AudioPlaybackOptions = {}
  ): Promise<void> {
    await this.stop();
    this.options = options;

    try {
      console.log('[AudioService] Starting audio playback, platform:', Platform.OS);
      console.log('[AudioService] Audio source:', typeof audioSource === 'number' ? 'require()' : audioSource);

      // Configure audio mode for meditation playback
      // Note: setAudioModeAsync may not be fully supported on web
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      }

      console.log('[AudioService] Creating sound object...');
      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: true },
        this.handlePlaybackStatusUpdate.bind(this)
      );

      console.log('[AudioService] Sound created successfully, playback starting');
      this.sound = sound;
      this.isPlaying = true;
      this.isPaused = false;
    } catch (error) {
      console.error('[AudioService] Error loading audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.options.onError?.(errorMessage);
    }
  }

  /**
   * Pre-load audio without playing. Used to prepare audio during user gesture
   * so it can be played later (works around iOS Safari autoplay restrictions).
   */
  async preload(
    audioSource: number | { uri: string },
    options: AudioPlaybackOptions = {}
  ): Promise<boolean> {
    await this.stop();
    this.options = options;

    try {
      console.log('[AudioService] Pre-loading audio, platform:', Platform.OS);

      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      }

      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: false }, // Don't auto-play
        this.handlePlaybackStatusUpdate.bind(this)
      );

      console.log('[AudioService] Audio pre-loaded successfully');
      this.sound = sound;
      this.isPlaying = false;
      this.isPaused = true; // Treat as paused until play() is called
      return true;
    } catch (error) {
      console.error('[AudioService] Error pre-loading audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.options.onError?.(errorMessage);
      return false;
    }
  }

  /**
   * Start playing pre-loaded audio
   */
  async play(): Promise<void> {
    if (this.sound) {
      try {
        console.log('[AudioService] Starting playback of pre-loaded audio');
        await this.sound.playAsync();
        this.isPlaying = true;
        this.isPaused = false;
      } catch (error) {
        console.error('[AudioService] Error starting playback:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.options.onError?.(errorMessage);
      }
    } else {
      console.warn('[AudioService] No audio loaded to play');
    }
  }

  private handlePlaybackStatusUpdate(status: AVPlaybackStatus): void {
    this.options.onPlaybackStatusUpdate?.(status);

    if (status.isLoaded) {
      if (status.didJustFinish) {
        console.log('[AudioService] Playback finished');
        this.isPlaying = false;
        this.isPaused = false;
        this.options.onComplete?.();
      }
    } else if (status.error) {
      console.error('[AudioService] Playback error:', status.error);
      this.options.onError?.(status.error);
    }
  }

  async pause(): Promise<void> {
    if (this.sound && this.isPlaying && !this.isPaused) {
      try {
        await this.sound.pauseAsync();
        this.isPaused = true;
      } catch (error) {
        console.error('[AudioService] Error pausing:', error);
      }
    }
  }

  async resume(): Promise<void> {
    if (this.sound && this.isPaused) {
      try {
        await this.sound.playAsync();
        this.isPaused = false;
      } catch (error) {
        console.error('[AudioService] Error resuming:', error);
      }
    }
  }

  async stop(): Promise<void> {
    if (this.sound) {
      try {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          await this.sound.stopAsync();
        }
        await this.sound.unloadAsync();
      } catch (error) {
        console.error('[AudioService] Error stopping:', error);
      }
      this.sound = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
  }

  async seekTo(positionMs: number): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.setPositionAsync(positionMs);
      } catch (error) {
        console.error('[AudioService] Error seeking:', error);
      }
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  isLoaded(): boolean {
    return this.sound !== null;
  }
}

export const audioService = new AudioService();
