import { Audio, AVPlaybackStatus } from 'expo-av';

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
      // Configure audio mode for meditation playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: true },
        this.handlePlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      this.isPlaying = true;
      this.isPaused = false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.options.onError?.(errorMessage);
    }
  }

  private handlePlaybackStatusUpdate(status: AVPlaybackStatus): void {
    this.options.onPlaybackStatusUpdate?.(status);

    if (status.isLoaded) {
      if (status.didJustFinish) {
        this.isPlaying = false;
        this.isPaused = false;
        this.options.onComplete?.();
      }
    } else if (status.error) {
      this.options.onError?.(status.error);
    }
  }

  async pause(): Promise<void> {
    if (this.sound && this.isPlaying && !this.isPaused) {
      await this.sound.pauseAsync();
      this.isPaused = true;
    }
  }

  async resume(): Promise<void> {
    if (this.sound && this.isPaused) {
      await this.sound.playAsync();
      this.isPaused = false;
    }
  }

  async stop(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
  }

  async seekTo(positionMs: number): Promise<void> {
    if (this.sound) {
      await this.sound.setPositionAsync(positionMs);
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
