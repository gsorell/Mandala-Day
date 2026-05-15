import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { colors, typography, spacing, geometry } from '../utils/theme';

const STORAGE_KEY = '@mandala_day/web_app_prompt_dismissed_at';
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const IOS_URL = 'https://apps.apple.com/us/app/mandala-day/id6763063799';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.mandaladay.app';

type DevicePref = 'ios' | 'android' | 'other';

const detectDevice = (): DevicePref => {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
};

const safeGetDismissed = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
};

const safeSetDismissed = () => {
  try {
    window.localStorage?.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
};

export const WebAppPromptModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [device, setDevice] = useState<DevicePref>('other');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (safeGetDismissed()) return;
    setDevice(detectDevice());
    setVisible(true);
  }, []);

  if (Platform.OS !== 'web' || !visible) return null;

  const dismiss = () => {
    safeSetDismissed();
    setVisible(false);
  };

  const open = (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const iosButton = (
    <TouchableOpacity
      key="ios"
      style={[styles.button, styles.iosButton]}
      onPress={() => open(IOS_URL)}
      activeOpacity={0.85}
    >
      <Text style={styles.buttonText}>Download for iPhone</Text>
    </TouchableOpacity>
  );

  const androidButton = (
    <TouchableOpacity
      key="android"
      style={[styles.button, styles.androidButton]}
      onPress={() => open(ANDROID_URL)}
      activeOpacity={0.85}
    >
      <Text style={styles.buttonText}>Download for Android</Text>
    </TouchableOpacity>
  );

  const buttons = device === 'android' ? [androidButton, iosButton] : [iosButton, androidButton];

  return (
    <View style={styles.backdrop} pointerEvents="auto">
      <View style={styles.card}>
        <Image source={require('../../assets/icon.png')} style={styles.icon} resizeMode="contain" />
        <Text style={styles.title}>Get the Mobile App!</Text>
        <Text style={styles.subtitle}>
          Get the native app for iPhone or Android for the best experience and to support continued development.
        </Text>

        <View style={styles.buttonStack}>{buttons}</View>

        <TouchableOpacity onPress={dismiss} activeOpacity={0.7} style={styles.continueLink}>
          <Text style={styles.continueText}>Continue with Web Version</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 8, 23, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 9999,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', position: 'fixed' } as any)
      : null),
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.ritualSurface,
    borderRadius: geometry.corners.medium,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.charcoal,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.normal,
    marginBottom: spacing.lg,
  },
  buttonStack: {
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: geometry.corners.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosButton: {
    backgroundColor: '#2F80ED',
  },
  androidButton: {
    backgroundColor: '#27AE60',
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  continueLink: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  continueText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
});
