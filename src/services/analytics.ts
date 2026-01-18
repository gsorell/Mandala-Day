import { Platform } from 'react-native';

// Google Analytics event tracking
// Only works on web platform where gtag is available

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

type AnalyticsEvent = {
  action: string;
  category: string;
  label?: string;
  value?: number;
};

export const trackEvent = ({ action, category, label, value }: AnalyticsEvent) => {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Meditation tracking events
export const trackMeditationStart = (meditationName: string, practiceType: string) => {
  trackEvent({
    action: 'start_meditation',
    category: 'Meditation',
    label: `${meditationName} (${practiceType})`,
  });
};

export const trackMeditationComplete = (meditationName: string, practiceType: string, durationSeconds: number) => {
  trackEvent({
    action: 'complete_meditation',
    category: 'Meditation',
    label: `${meditationName} (${practiceType})`,
    value: Math.round(durationSeconds / 60), // duration in minutes
  });
};

export const trackMeditationSkip = (meditationName: string, practiceType: string) => {
  trackEvent({
    action: 'skip_meditation',
    category: 'Meditation',
    label: `${meditationName} (${practiceType})`,
  });
};

export const trackMeditationEndEarly = (meditationName: string, practiceType: string, elapsedSeconds: number) => {
  trackEvent({
    action: 'end_early_meditation',
    category: 'Meditation',
    label: `${meditationName} (${practiceType})`,
    value: Math.round(elapsedSeconds / 60), // elapsed time in minutes
  });
};

export const trackSimpleTimerStart = (durationMinutes: number) => {
  trackEvent({
    action: 'start_simple_timer',
    category: 'Simple Timer',
    value: durationMinutes,
  });
};

export const trackSimpleTimerComplete = (durationMinutes: number) => {
  trackEvent({
    action: 'complete_simple_timer',
    category: 'Simple Timer',
    value: durationMinutes,
  });
};

export const trackOnboardingComplete = () => {
  trackEvent({
    action: 'complete_onboarding',
    category: 'Onboarding',
  });
};
