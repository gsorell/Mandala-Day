import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Analytics event tracking.
//
// Web  -> Google Analytics via gtag.js (loaded in public/index.html).
// Native (iOS/Android) -> GA4 Measurement Protocol, an HTTPS POST into the
//   SAME GA4 property, so web + native events land in one set of reports.
//   https://developers.google.com/analytics/devguides/collection/protocol/ga4

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Same property as the web tag in public/index.html.
const MEASUREMENT_ID = 'G-8GMLC4SFXX';
// Create in GA4: Admin -> Data Streams -> (your stream) -> Measurement
// Protocol API secrets -> Create. MP secrets are client-side identifiers
// (like the measurement ID itself), not true secrets, so shipping it in the
// bundle is expected. Prefer EXPO_PUBLIC_GA_API_SECRET if you'd rather not
// inline it.
const API_SECRET = process.env.EXPO_PUBLIC_GA_API_SECRET ?? 'zlbifdmPQhy0muT6o71gaQ';

const MP_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;
const CLIENT_ID_KEY = '@analytics/ga_client_id';

// One session per app launch (in-memory). GA4 needs session_id +
// engagement_time_msec or MP events are counted as "non-engaged" and may not
// surface in standard reports.
const SESSION_ID = String(Date.now());

// RFC-4122-shaped v4 id. Math.random is fine here — this only needs to be
// stable and unique per install, not cryptographically strong.
const uuidv4 = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

let clientIdPromise: Promise<string> | null = null;
const getClientId = (): Promise<string> => {
  if (!clientIdPromise) {
    clientIdPromise = (async () => {
      try {
        const existing = await AsyncStorage.getItem(CLIENT_ID_KEY);
        if (existing) return existing;
        const fresh = uuidv4();
        await AsyncStorage.setItem(CLIENT_ID_KEY, fresh);
        return fresh;
      } catch {
        // Storage unavailable — fall back to an ephemeral id so the event
        // still sends (it just won't tie to prior sessions).
        return uuidv4();
      }
    })();
  }
  return clientIdPromise;
};

type AnalyticsEvent = {
  action: string;
  category: string;
  label?: string;
  value?: number;
};

const sendNative = async ({ action, category, label, value }: AnalyticsEvent) => {
  if (!API_SECRET) return; // not configured
  try {
    const clientId = await getClientId();
    await fetch(MP_ENDPOINT, {
      method: 'POST',
      // GA4 MP wants the raw JSON body; no preflight-triggering headers.
      body: JSON.stringify({
        client_id: clientId,
        events: [
          {
            name: action,
            params: {
              event_category: category,
              event_label: label,
              value,
              session_id: SESSION_ID,
              engagement_time_msec: 100,
            },
          },
        ],
      }),
    });
  } catch {
    // Network/analytics failures must never affect the user's session.
  }
};

export const trackEvent = ({ action, category, label, value }: AnalyticsEvent) => {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.gtag) return;
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
    return;
  }

  // Native: fire-and-forget MP POST.
  void sendNative({ action, category, label, value });
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
