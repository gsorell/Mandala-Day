import { Audio, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';

// Track-player is native-only. Gated require keeps the web bundle clean and
// avoids touching it during SSR/metro-web transforms.
let TP: any = null;
let TP_Event: any = null;
let TP_State: any = null;
let TP_Capability: any = null;
if (Platform.OS !== 'web') {
  const mod = require('react-native-track-player');
  TP = mod.default;
  TP_Event = mod.Event;
  TP_State = mod.State;
  TP_Capability = mod.Capability;
}

// Default artwork shown on the iOS Now Playing card / Android media notification
// when a caller doesn't provide its own.
const DEFAULT_ARTWORK = Platform.OS !== 'web' ? require('../../assets/icon.png') : undefined;

export interface AudioPlaybackOptions {
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  // Now Playing metadata — native only. Ignored on web (MediaSession handlers
  // are registered separately in SessionPlayerScreen).
  title?: string;
  artist?: string;
  artwork?: number | string;
  // Fired whenever playback starts/stops from outside the app — the iOS lock
  // screen / Control Center, the Android media notification, headphone buttons,
  // or an OS interruption. Native only. Screens use it to keep their own
  // play/pause UI in sync with what the OS actually did.
  onRemoteStateChange?: (state: { isPlaying: boolean; isPaused: boolean }) => void;
}

class AudioService {
  private isPlaying = false;
  private isPaused = false;
  private options: AudioPlaybackOptions = {};

  // Web (expo-av) state
  private sound: Audio.Sound | null = null;
  private keepAliveContext: AudioContext | null = null;

  // Native (track-player) state
  private tpInitialized = false;
  private tpLoaded = false;
  private tpDurationMs = 0;
  private tpProgressTimer: ReturnType<typeof setInterval> | null = null;
  private tpStateSub: { remove: () => void } | null = null;
  private tpEndSub: { remove: () => void } | null = null;
  private tpErrorSub: { remove: () => void } | null = null;
  private tpDuckSub: { remove: () => void } | null = null;
  private tpSuppressEnd = false;
  private tpEnded = false;

  private isNative(): boolean {
    return Platform.OS !== 'web';
  }

  // ---------- Web: AudioContext keepalive (unchanged) ----------

  private startWebAudioKeepalive(): void {
    if (Platform.OS !== 'web') return;
    if (this.keepAliveContext) return;
    const AC: typeof AudioContext | undefined =
      typeof AudioContext !== 'undefined' ? AudioContext :
      (typeof (window as any).webkitAudioContext !== 'undefined' ? (window as any).webkitAudioContext : undefined);
    if (!AC) return;
    try {
      const ctx = new AC();
      const oscillator = ctx.createOscillator();
      oscillator.frequency.value = 20000;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.005;
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      ctx.addEventListener('statechange', () => {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      });
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          if (this.sound && this.isPlaying && !this.isPaused) {
            this.sound.getStatusAsync().then((status) => {
              if (status.isLoaded && !status.isPlaying) {
                this.sound?.playAsync().catch(() => {});
              }
            }).catch(() => {});
          }
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      (ctx as any).__visHandler = onVisibilityChange;
      this.keepAliveContext = ctx;
    } catch (_e) {}
  }

  private stopWebAudioKeepalive(): void {
    if (this.keepAliveContext) {
      const handler = (this.keepAliveContext as any).__visHandler;
      if (handler) {
        document.removeEventListener('visibilitychange', handler);
      }
      try { this.keepAliveContext.close(); } catch (_e) {}
      this.keepAliveContext = null;
    }
  }

  // ---------- Native: track-player setup + status shim ----------

  private async tpEnsureSetup(): Promise<void> {
    if (this.tpInitialized) return;
    await TP.setupPlayer({ autoHandleInterruptions: true });
    await TP.updateOptions({
      capabilities: [TP_Capability.Play, TP_Capability.Pause, TP_Capability.Stop],
      compactCapabilities: [TP_Capability.Play, TP_Capability.Pause],
    });
    this.tpInitialized = true;
  }

  // Emit an AVPlaybackStatus-shaped object so existing callers
  // (SessionPlayerScreen, ChildrensSleep, BodySeaVoyage, StarryNight,
  // Vipassana, Vision) continue to work unchanged.
  private tpEmitStatus(positionMs: number, playing: boolean, didJustFinish = false): void {
    const shape: any = {
      isLoaded: true,
      durationMillis: this.tpDurationMs || undefined,
      positionMillis: positionMs,
      isPlaying: playing,
      didJustFinish,
      isBuffering: false,
      shouldPlay: playing,
      rate: 1,
      shouldCorrectPitch: false,
      volume: 1,
      isMuted: false,
      isLooping: false,
    };
    this.options.onPlaybackStatusUpdate?.(shape as AVPlaybackStatus);
  }

  private tpStartProgressPoll(): void {
    if (this.tpProgressTimer) return;
    this.tpProgressTimer = setInterval(async () => {
      try {
        const progress = await TP.getProgress();
        if (progress.duration > 0 && !this.tpDurationMs) {
          this.tpDurationMs = Math.round(progress.duration * 1000);
        }
        this.tpEmitStatus(Math.round(progress.position * 1000), this.isPlaying && !this.isPaused);
      } catch (_e) {}
    }, 500);
  }

  private tpStopProgressPoll(): void {
    if (this.tpProgressTimer) {
      clearInterval(this.tpProgressTimer);
      this.tpProgressTimer = null;
    }
  }

  // Adopt a playback change the app did not initiate: OS transport controls, or
  // an interruption the player handled itself. Both are no-ops when they only
  // confirm what we already believe, so our own play()/pause() never echo back.
  private tpSyncPlaying(): void {
    if (this.tpEnded || !this.tpLoaded) return;
    if (this.isPlaying && !this.isPaused) return;
    this.isPlaying = true;
    this.isPaused = false;
    this.tpStartProgressPoll();
    this.options.onRemoteStateChange?.({ isPlaying: true, isPaused: false });
  }

  private tpSyncPaused(): void {
    if (this.tpEnded || !this.tpLoaded) return;
    if (this.isPaused) return;
    this.isPaused = true;
    this.isPlaying = true; // still loaded mid-session, just not advancing
    this.tpStopProgressPoll();
    // One last status at the true paused position so the UI settles there.
    TP.getProgress()
      .then((p: any) => this.tpEmitStatus(Math.round(p.position * 1000), false))
      .catch(() => {});
    this.options.onRemoteStateChange?.({ isPlaying: false, isPaused: true });
  }

  private tpAttachListeners(): void {
    this.tpDetachListeners();
    // The native player is the single source of truth for play/pause. The
    // lock screen and Control Center route through the headless service
    // (src/services/playback-service.js), which calls TrackPlayer directly and
    // never touches this class — without this listener our isPlaying/isPaused
    // flags silently drift out of sync with reality, which is what made a
    // lock-screen pause fail to stick (SessionPlayerScreen would treat the
    // paused player as an iOS suspension and force-resume it) and made the
    // in-app play button need two taps afterwards.
    this.tpStateSub = TP.addEventListener(TP_Event.PlaybackState, (e: any) => {
      // Ignore the tail states emitted while a track finishes or is torn down;
      // those are handled by PlaybackQueueEnded / stop().
      const state = e?.state;
      if (state === TP_State.Playing) {
        this.tpSyncPlaying();
      } else if (state === TP_State.Paused) {
        this.tpSyncPaused();
      }
    });
    // Interruptions: a call, another app taking audio focus. The player is set
    // up with autoHandleInterruptions, so it decides what to do and reports it
    // here — the same desync as the lock screen, reached a different way. Belt
    // and braces with PlaybackState above: on Android a permanent focus loss
    // can stop rather than pause the player, so the state we get is not always
    // Paused, but this event fires either way. Purely observational — it only
    // records a pause the player already made. An interruption it chose to duck
    // under (paused: false) is still playing, so it is left alone.
    this.tpDuckSub = TP.addEventListener(TP_Event.RemoteDuck, (e: any) => {
      if (e?.paused || e?.permanent) this.tpSyncPaused();
    });
    this.tpEndSub = TP.addEventListener(TP_Event.PlaybackQueueEnded, async () => {
      if (this.tpSuppressEnd) { this.tpSuppressEnd = false; return; }
      this.tpEnded = true;
      this.isPlaying = false;
      this.isPaused = false;
      this.tpStopProgressPoll();
      this.tpEmitStatus(this.tpDurationMs, false, true);
      this.options.onComplete?.();
    });
    this.tpErrorSub = TP.addEventListener(TP_Event.PlaybackError, (e: any) => {
      const message = e?.message || 'Unknown playback error';
      console.error('[AudioService] track-player error:', message);
      this.options.onError?.(message);
    });
  }

  private tpDetachListeners(): void {
    try { this.tpEndSub?.remove(); } catch (_e) {}
    try { this.tpErrorSub?.remove(); } catch (_e) {}
    try { this.tpStateSub?.remove(); } catch (_e) {}
    try { this.tpDuckSub?.remove(); } catch (_e) {}
    this.tpEndSub = null;
    this.tpErrorSub = null;
    this.tpStateSub = null;
    this.tpDuckSub = null;
  }

  private async tpAddTrack(audioSource: number | { uri: string }): Promise<void> {
    const url = typeof audioSource === 'number' ? audioSource : audioSource.uri;
    const artwork = this.options.artwork ?? DEFAULT_ARTWORK;
    // reset() both clears any prior track and allows loading a fresh one.
    // tpSuppressEnd prevents the QueueEnded event from firing onComplete when
    // a new track replaces a finished/stopped one. Clear it immediately after
    // reset resolves — otherwise, on a fresh load with no prior track, the
    // reset emits no event, the flag stays set, and the new track's natural
    // end is silently swallowed.
    this.tpSuppressEnd = true;
    await TP.reset();
    this.tpSuppressEnd = false;
    await TP.add({
      id: String(Date.now()),
      url,
      title: this.options.title ?? 'Meditation',
      artist: this.options.artist ?? 'Mandala Day',
      artwork,
    });
    this.tpDurationMs = 0;
    this.tpEnded = false;
  }

  // ---------- Public API ----------

  async loadAndPlay(
    audioSource: number | { uri: string },
    options: AudioPlaybackOptions = {}
  ): Promise<void> {
    await this.stop();
    this.options = options;

    try {
      console.log('[AudioService] Starting audio playback, platform:', Platform.OS);

      if (this.isNative()) {
        await this.tpEnsureSetup();
        this.tpAttachListeners();
        await this.tpAddTrack(audioSource);
        await TP.play();
        this.isPlaying = true;
        this.isPaused = false;
        this.tpLoaded = true;
        this.tpStartProgressPoll();
        return;
      }

      // Web: expo-av path, unchanged
      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: true },
        this.handleWebStatus.bind(this)
      );
      this.sound = sound;
      this.isPlaying = true;
      this.isPaused = false;
    } catch (error) {
      console.error('[AudioService] Error loading audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.options.onError?.(errorMessage);
    }
  }

  async preload(
    audioSource: number | { uri: string },
    options: AudioPlaybackOptions = {}
  ): Promise<boolean> {
    await this.stop();
    this.options = options;

    try {
      console.log('[AudioService] Pre-loading audio, platform:', Platform.OS);

      if (this.isNative()) {
        await this.tpEnsureSetup();
        this.tpAttachListeners();
        await this.tpAddTrack(audioSource);
        this.isPlaying = false;
        this.isPaused = true; // Mirror web semantics: "loaded but not playing"
        this.tpLoaded = true;
        // Fire one status update so callers that capture durationMillis get it.
        try {
          const progress = await TP.getProgress();
          if (progress.duration > 0) {
            this.tpDurationMs = Math.round(progress.duration * 1000);
          }
        } catch (_e) {}
        this.tpEmitStatus(0, false);
        return true;
      }

      // Web: expo-av path, unchanged
      if (Platform.OS === 'web') {
        // setAudioModeAsync is native-only; expo-av web ignores it anyway.
      }
      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: false },
        this.handleWebStatus.bind(this)
      );
      this.sound = sound;
      this.isPlaying = false;
      this.isPaused = true;
      return true;
    } catch (error) {
      console.error('[AudioService] Error pre-loading audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.options.onError?.(errorMessage);
      return false;
    }
  }

  async play(): Promise<void> {
    try {
      if (this.isNative()) {
        if (!this.tpLoaded) return;
        // Set flags before the call, like pause() does, so the PlaybackState
        // listener recognises this as our own change and stays quiet.
        this.isPlaying = true;
        this.isPaused = false;
        await TP.play();
        this.tpStartProgressPoll();
        return;
      }
      if (this.sound) {
        this.startWebAudioKeepalive();
        await this.sound.playAsync();
        this.isPlaying = true;
        this.isPaused = false;
      }
    } catch (error) {
      console.error('[AudioService] Error starting playback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.options.onError?.(errorMessage);
    }
  }

  async pause(): Promise<void> {
    if (!this.isPlaying || this.isPaused) return;
    this.isPaused = true;
    try {
      if (this.isNative()) {
        await TP.pause();
        this.tpStopProgressPoll();
        return;
      }
      if (this.sound) {
        await this.sound.pauseAsync();
        this.stopWebAudioKeepalive();
      }
    } catch (error) {
      this.isPaused = false;
      console.error('[AudioService] Error pausing:', error);
    }
  }

  async resume(): Promise<void> {
    try {
      if (this.isNative()) {
        if (!this.tpLoaded || this.tpEnded) return;
        // Don't gate this on our own isPaused flag alone. If a state event was
        // ever missed, the player can be sitting paused while we still think
        // it is playing — the old early-return then swallowed the tap, which is
        // why resuming after an interruption took two presses. Ask the player.
        if (!this.isPaused) {
          const state = await TP.getPlaybackState();
          if (state?.state === TP_State.Playing) return;
        }
        this.isPaused = false;
        this.isPlaying = true;
        await TP.play();
        this.tpStartProgressPoll();
        return;
      }
      if (!this.isPaused) return;
      if (this.sound) {
        this.startWebAudioKeepalive();
        await this.sound.playAsync();
        this.isPaused = false;
      }
    } catch (error) {
      console.error('[AudioService] Error resuming:', error);
    }
  }

  async stop(): Promise<void> {
    this.isPlaying = false;
    this.isPaused = false;
    this.stopWebAudioKeepalive();
    this.tpStopProgressPoll();

    if (this.isNative()) {
      if (this.tpLoaded) {
        try {
          this.tpSuppressEnd = true;
          await TP.reset();
        } catch (error) {
          console.error('[AudioService] Error stopping track-player:', error);
        }
      }
      this.tpDetachListeners();
      this.tpLoaded = false;
      this.tpDurationMs = 0;
      this.tpEnded = false;
      return;
    }

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
    try {
      if (this.isNative()) {
        await TP.seekTo(positionMs / 1000);
        return;
      }
      if (this.sound) {
        await this.sound.setPositionAsync(positionMs);
      }
    } catch (error) {
      console.error('[AudioService] Error seeking:', error);
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  isLoaded(): boolean {
    return this.isNative() ? this.tpLoaded : this.sound !== null;
  }

  async getActualStatus(): Promise<{ isPlaying: boolean; positionMs: number } | null> {
    try {
      if (this.isNative()) {
        if (!this.tpLoaded) return null;
        const [progress, state] = await Promise.all([TP.getProgress(), TP.getPlaybackState()]);
        if (progress.duration > 0 && !this.tpDurationMs) {
          this.tpDurationMs = Math.round(progress.duration * 1000);
        }
        const playing = state?.state === TP_State.Playing;
        return {
          isPlaying: playing,
          positionMs: Math.round(progress.position * 1000),
        };
      }
      if (!this.sound) return null;
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

  // ---------- Web: expo-av status handler ----------

  private handleWebStatus(status: AVPlaybackStatus): void {
    this.options.onPlaybackStatusUpdate?.(status);
    if (status.isLoaded) {
      if (status.didJustFinish) {
        this.isPlaying = false;
        this.isPaused = false;
        this.options.onComplete?.();
      }
    } else if ((status as any).error) {
      console.error('[AudioService] Playback error:', (status as any).error);
      this.options.onError?.((status as any).error);
    }
  }
}

export const audioService = new AudioService();
