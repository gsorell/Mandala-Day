import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useApp } from '../context/AppContext';
import { DEFAULT_SESSIONS } from '../data/sessions';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

type OnboardingStep = 'welcome' | 'schedule' | 'notifications' | 'framing';

export const OnboardingScreen: React.FC = () => {
  const { updateAppSettings, updateUserSchedule, userSchedule } = useApp();
  const [step, setStep] = useState<OnboardingStep>('welcome');

  const handleRequestNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notifications',
          'You can enable notifications later in Settings. The app will still work, but won\'t remind you of sessions.',
          [{ text: 'OK' }]
        );
      }

      await updateAppSettings({ notificationsEnabled: finalStatus === 'granted' });
      setStep('framing');
    } catch (error) {
      console.error('Error requesting notifications:', error);
      setStep('framing');
    }
  };

  const handleSkipNotifications = async () => {
    await updateAppSettings({ notificationsEnabled: false });
    setStep('framing');
  };

  const handleComplete = async () => {
    await updateAppSettings({ hasCompletedOnboarding: true });
  };

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.centerContent}>
        <Text style={styles.welcomeTitle}>Mandala Day</Text>
        <Text style={styles.welcomeSubtitle}>
          Six daily moments of recognition
        </Text>

        <View style={styles.welcomeDescription}>
          <Text style={styles.descriptionText}>
            This app offers a gentle structure for awareness practice throughout your day.
          </Text>
          <Text style={styles.descriptionText}>
            Six short sessions, from waking to rest, each inviting a return to presence.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('schedule')}>
        <Text style={styles.primaryButtonText}>Begin</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSchedule = () => (
    <View style={styles.stepContainer}>
      <View style={styles.topContent}>
        <Text style={styles.stepTitle}>Your Daily Mandala</Text>
        <Text style={styles.stepDescription}>
          Here are your six sessions with suggested times. You can adjust these anytime in Settings.
        </Text>

        <View style={styles.sessionsPreview}>
          {DEFAULT_SESSIONS.map((session) => (
            <View key={session.id} style={styles.sessionRow}>
              <View style={styles.sessionOrderBadge}>
                <Text style={styles.sessionOrderText}>{session.order}</Text>
              </View>
              <View style={styles.sessionDetails}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionTime}>{formatTime(session.defaultTime)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('notifications')}
      >
        <Text style={styles.primaryButtonText}>Use These Times</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNotifications = () => (
    <View style={styles.stepContainer}>
      <View style={styles.centerContent}>
        <Text style={styles.stepTitle}>Gentle Reminders</Text>
        <Text style={styles.stepDescription}>
          Would you like to receive notifications when it's time for each session?
        </Text>
        <Text style={styles.noteText}>
          Notifications are gentle prompts, not demands. You can always snooze, skip, or turn them off.
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRequestNotifications}
        >
          <Text style={styles.primaryButtonText}>Enable Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSkipNotifications}
        >
          <Text style={styles.secondaryButtonText}>Not Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFraming = () => (
    <View style={styles.stepContainer}>
      <View style={styles.centerContent}>
        <Text style={styles.framingTitle}>A Gentle Approach</Text>

        <View style={styles.framingPoints}>
          <View style={styles.framingPoint}>
            <Text style={styles.framingBullet}>•</Text>
            <Text style={styles.framingText}>
              There are no streaks to maintain.
            </Text>
          </View>
          <View style={styles.framingPoint}>
            <Text style={styles.framingBullet}>•</Text>
            <Text style={styles.framingText}>
              Missing a session is not failure.
            </Text>
          </View>
          <View style={styles.framingPoint}>
            <Text style={styles.framingBullet}>•</Text>
            <Text style={styles.framingText}>
              Each return is complete in itself.
            </Text>
          </View>
        </View>

        <Text style={styles.framingQuote}>
          "No streaks. No guilt. Just return."
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleComplete}>
        <Text style={styles.primaryButtonText}>Begin Practice</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {step === 'welcome' && renderWelcome()}
      {step === 'schedule' && renderSchedule()}
      {step === 'notifications' && renderNotifications()}
      {step === 'framing' && renderFraming()}
    </SafeAreaView>
  );
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stepContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  topContent: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  welcomeTitle: {
    color: colors.textPrimary,
    fontSize: 42,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    color: colors.accent,
    fontSize: typography.fontSizes.lg,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.xxl,
  },
  welcomeDescription: {
    gap: spacing.md,
  },
  descriptionText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  stepDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
    marginBottom: spacing.lg,
  },
  noteText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
  sessionsPreview: {
    gap: spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  sessionOrderBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sessionOrderText: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  sessionDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  sessionTime: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  framingTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  framingPoints: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  framingPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  framingBullet: {
    color: colors.accent,
    fontSize: typography.fontSizes.lg,
    marginRight: spacing.sm,
    marginTop: -2,
  },
  framingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.lg,
    flex: 1,
    lineHeight: typography.fontSizes.lg * typography.lineHeights.relaxed,
  },
  framingQuote: {
    color: colors.accent,
    fontSize: typography.fontSizes.lg,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.lg,
  },
  buttonGroup: {
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
});
