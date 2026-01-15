import * as Speech from 'expo-speech';

export interface TTSSegment {
  type: 'text' | 'pause';
  content: string;
  duration?: number; // seconds for pause
}

export interface TTSOptions {
  rate?: number; // 0.1 to 2.0, default 1.0
  pitch?: number; // 0.5 to 2.0, default 1.0
  voice?: string;
  onSegmentStart?: (index: number, segment: TTSSegment) => void;
  onSegmentEnd?: (index: number, segment: TTSSegment) => void;
  onComplete?: () => void;
  onStop?: () => void;
}

class TTSService {
  private isPlaying = false;
  private isPaused = false;
  private currentSegmentIndex = 0;
  private segments: TTSSegment[] = [];
  private options: TTSOptions = {};
  private pauseTimeout: ReturnType<typeof setTimeout> | null = null;
  private resolveCurrentSegment: (() => void) | null = null;

  /**
   * Parse script text into segments of text and pauses
   */
  parseScript(scriptText: string): TTSSegment[] {
    const segments: TTSSegment[] = [];
    const pauseRegex = /\[pause\s+(\d+)\s*(s|sec|min|m|minutes?)\]/gi;
    let lastIndex = 0;
    let match;

    while ((match = pauseRegex.exec(scriptText)) !== null) {
      // Add text before pause
      if (match.index > lastIndex) {
        const text = scriptText.slice(lastIndex, match.index).trim();
        if (text) {
          segments.push({
            type: 'text',
            content: text,
          });
        }
      }

      // Parse pause duration
      const value = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      const durationSec =
        unit.startsWith('m') && !unit.startsWith('mi')
          ? value * 60
          : unit.startsWith('min')
          ? value * 60
          : value;

      segments.push({
        type: 'pause',
        content: `Pause for ${
          durationSec >= 60
            ? `${Math.floor(durationSec / 60)} minute${durationSec >= 120 ? 's' : ''}`
            : `${durationSec} seconds`
        }`,
        duration: durationSec,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < scriptText.length) {
      const text = scriptText.slice(lastIndex).trim();
      if (text) {
        segments.push({
          type: 'text',
          content: text,
        });
      }
    }

    return segments;
  }

  /**
   * Calculate total duration of script including speech and pauses
   */
  estimateDuration(segments: TTSSegment[], wordsPerMinute = 130): number {
    let totalSeconds = 0;

    for (const segment of segments) {
      if (segment.type === 'pause') {
        totalSeconds += segment.duration || 0;
      } else {
        // Estimate speech duration: ~130 words per minute for calm meditation pace
        const wordCount = segment.content.split(/\s+/).length;
        totalSeconds += (wordCount / wordsPerMinute) * 60;
      }
    }

    return totalSeconds;
  }

  /**
   * Adjust pause durations to hit target duration
   */
  adjustPausesForDuration(
    segments: TTSSegment[],
    targetDurationSec: number,
    wordsPerMinute = 130
  ): TTSSegment[] {
    const adjustedSegments = segments.map((s) => ({ ...s }));

    // Calculate current duration
    let speechDuration = 0;
    let totalPauseDuration = 0;
    const pauseIndices: number[] = [];

    adjustedSegments.forEach((segment, index) => {
      if (segment.type === 'pause') {
        totalPauseDuration += segment.duration || 0;
        pauseIndices.push(index);
      } else {
        const wordCount = segment.content.split(/\s+/).length;
        speechDuration += (wordCount / wordsPerMinute) * 60;
      }
    });

    const currentTotal = speechDuration + totalPauseDuration;
    const difference = targetDurationSec - currentTotal;

    if (pauseIndices.length > 0 && Math.abs(difference) > 5) {
      // Distribute the difference across all pauses proportionally
      const scaleFactor = (totalPauseDuration + difference) / totalPauseDuration;

      pauseIndices.forEach((index) => {
        const segment = adjustedSegments[index];
        if (segment.duration) {
          segment.duration = Math.max(5, Math.round(segment.duration * scaleFactor));
        }
      });
    }

    return adjustedSegments;
  }

  /**
   * Start speaking the script
   */
  async speak(scriptText: string, options: TTSOptions = {}): Promise<void> {
    await this.stop();

    this.segments = this.parseScript(scriptText);
    this.options = options;
    this.currentSegmentIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;

    await this.playFromCurrentSegment();
  }

  /**
   * Start speaking pre-parsed segments (useful for adjusted pauses)
   */
  async speakSegments(segments: TTSSegment[], options: TTSOptions = {}): Promise<void> {
    await this.stop();

    this.segments = segments;
    this.options = options;
    this.currentSegmentIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;

    await this.playFromCurrentSegment();
  }

  private async playFromCurrentSegment(): Promise<void> {
    while (this.currentSegmentIndex < this.segments.length && this.isPlaying) {
      if (this.isPaused) {
        await new Promise<void>((resolve) => {
          this.resolveCurrentSegment = resolve;
        });
        if (!this.isPlaying) break;
      }

      const segment = this.segments[this.currentSegmentIndex];
      this.options.onSegmentStart?.(this.currentSegmentIndex, segment);

      if (segment.type === 'text') {
        await this.speakText(segment.content);
      } else if (segment.type === 'pause') {
        await this.waitForPause(segment.duration || 10);
      }

      if (this.isPlaying && !this.isPaused) {
        this.options.onSegmentEnd?.(this.currentSegmentIndex, segment);
        this.currentSegmentIndex++;
      }
    }

    if (this.isPlaying && this.currentSegmentIndex >= this.segments.length) {
      this.isPlaying = false;
      this.options.onComplete?.();
    }
  }

  private speakText(text: string): Promise<void> {
    return new Promise((resolve) => {
      Speech.speak(text, {
        rate: this.options.rate ?? 0.85, // Slightly slower for meditation
        pitch: this.options.pitch ?? 1.0,
        voice: this.options.voice,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    });
  }

  private waitForPause(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      this.pauseTimeout = setTimeout(() => {
        this.pauseTimeout = null;
        resolve();
      }, seconds * 1000);
    });
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying || this.isPaused) return;

    this.isPaused = true;
    Speech.stop();

    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (!this.isPlaying || !this.isPaused) return;

    this.isPaused = false;
    if (this.resolveCurrentSegment) {
      this.resolveCurrentSegment();
      this.resolveCurrentSegment = null;
    }
  }

  /**
   * Stop playback completely
   */
  async stop(): Promise<void> {
    this.isPlaying = false;
    this.isPaused = false;

    await Speech.stop();

    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }

    if (this.resolveCurrentSegment) {
      this.resolveCurrentSegment();
      this.resolveCurrentSegment = null;
    }

    this.options.onStop?.();
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get current segment index
   */
  getCurrentSegmentIndex(): number {
    return this.currentSegmentIndex;
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<Speech.Voice[]> {
    return Speech.getAvailableVoicesAsync();
  }
}

export const ttsService = new TTSService();
