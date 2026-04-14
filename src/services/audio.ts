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
  // Web-only: AudioContext kept alive during playback to prevent Chrome from
  // suspending background audio when the screen locks.
  private keepAliveContext: AudioContext | null = null;

  /**
   * Start a silent looping AudioContext on web. Chrome suspends AudioContexts
   * when a PWA is backgrounded (screen lock), but allows resume() calls from
   * background pages that were already unlocked by a user gesture. The
   * statechange listener fights the suspension, keeping Chrome's audio session
   * active so the main meditation audio isn't paused.
   */
  private startWebAudioKeepalive(): void {
    if (Platform.OS !== 'web') return;
    if (this.keepAliveContext) return;
    const AC: typeof AudioContext | undefined =
      typeof AudioContext !== 'undefined' ? AudioContext :
      (typeof (window as any).webkitAudioContext !== 'undefined' ? (window as any).webkitAudioContext : undefined);
    if (!AC) return;
    try {
      const ctx = new AC();
      // 20kHz oscillator at -46dB: above Chrome's silence-detection threshold
      // (~-60dBFS) but inaudible — 20kHz is at/above the human hearing limit
      // and -46dB at that frequency is imperceptible even through headphones.
      // A zero-gain (truly silent) node would still trigger Chrome's silence
      // detector; non-zero frames keep the audio session classified as active.
      const oscillator = ctx.createOscillator();
      oscillator.frequency.value = 20000;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.005; // -46dBFS
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      // If Chrome suspends the context on screen lock, immediately resume.
      ctx.addEventListener('statechange', () => {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      });
      this.keepAliveContext = ctx;
    } catch (_e) {
      // AudioContext unavailable — no keepalive
    }
  }

  private stopWebAudioKeepalive(): void {
    if (this.keepAliveContext) {
      try { this.keepAliveContext.close(); } catch (_e) {}
      this.keepAliveContext = null;
    }
  }

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
          interruptionModeAndroid: 1, // INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
          interruptionModeIOS: 0, // INTERRUPTION_MODE_IOS_DO_NOT_MIX
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
          interruptionModeAndroid: 1, // INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
          interruptionModeIOS: 0, // INTERRUPTION_MODE_IOS_DO_NOT_MIX
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
        this.startWebAudioKeepalive();
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
      this.isPaused = true; // Set before pauseAsync so status callback sees correct state
      try {
        await this.sound.pauseAsync();
        this.stopWebAudioKeepalive();
      } catch (error) {
        this.isPaused = false;
        console.error('[AudioService] Error pausing:', error);
      }
    }
  }

  async resume(): Promise<void> {
    if (this.sound && this.isPaused) {
      try {
        this.startWebAudioKeepalive();
        await this.sound.playAsync();
        this.isPaused = false;
      } catch (error) {
        console.error('[AudioService] Error resuming:', error);
      }
    }
  }

  async stop(): Promise<void> {
    this.isPlaying = false; // Set before stopAsync to prevent spurious onInterrupt
    this.isPaused = false;
    this.stopWebAudioKeepalive();
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

  /**
   * Get the actual playback status from the underlying Sound object.
   * This queries the real OS state, useful for detecting if audio was
   * interrupted by a phone call while app was in background.
   */
  async getActualStatus(): Promise<{ isPlaying: boolean; positionMs: number } | null> {
    if (!this.sound) {
      return null;
    }
    try {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        return {
          isPlaying: status.isPlaying,
          positionMs: status.positionMillis,
        };
      }
      return null;
    } catch (error) {
      console.error('[AudioService] Error getting status:', error);
      return null;
    }
  }
}

export const audioService = new AudioService();
