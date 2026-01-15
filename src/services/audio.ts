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

  async loadAndPlay(
    audioSource: number | { uri: string },
    options: AudioPlaybackOptions = {}
  ): Promise<void> {
    await this.stop();
    this.options = options;

    try {
      console.log('[AudioService] Starting audio playback, platform:', Platform.OS);
      console.log('[AudioService] Audio source type:', typeof audioSource === 'number' ? 'require' : 'uri');

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

      console.log('[AudioService] Sound created successfully');
      this.sound = sound;
      this.isPlaying = true;
      this.isPaused = false;
    } catch (error) {
      console.error('[AudioService] Error loading audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.options.onError?.(errorMessage);
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
}

export const audioService = new AudioService();
