import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useApp } from '../context/AppContext';
import { DEFAULT_SESSIONS } from '../data/sessions';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

type OnboardingStep = 'welcome' | 'schedule' | 'notifications' | 'framing';

export const OnboardingScreen: React.FC = () => {
  const { updateAppSettings, updateUserSchedule, userSchedule } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [tempHour, setTempHour] = useState(7);
  const [tempMinute, setTempMinute] = useState(0);

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

  const handleTimePress = (sessionId: string) => {
    const currentTime = userSchedule?.sessionTimes[sessionId] ||
      DEFAULT_SESSIONS.find(s => s.id === sessionId)?.defaultTime || '07:00';
    const [hours, minutes] = currentTime.split(':').map(Number);
    setTempHour(hours);
    setTempMinute(minutes);
    setSelectedSession(sessionId);
  };

  const handleTimeSave = async () => {
    if (!selectedSession || !userSchedule) return;

    const timeString = `${tempHour.toString().padStart(2, '0')}:${tempMinute
      .toString()
      .padStart(2, '0')}`;

    await updateUserSchedule({
      sessionTimes: {
        ...userSchedule.sessionTimes,
        [selectedSession]: timeString,
      },
    });

    setSelectedSession(null);
  };

  const getSessionTime = (sessionId: string, defaultTime: string): string => {
    return userSchedule?.sessionTimes[sessionId] || defaultTime;
  };

  const renderWelcome = () => (
    <View style={[styles.stepContainer, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.centerContent}>
        <Image
          source={require('../../assets/mandala-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
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
    <View style={[styles.stepContainer, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.topContent}>
        <Text style={styles.stepTitle}>Your Daily Mandala</Text>
        <Text style={styles.stepDescription}>
          Tap any time to adjust it. You can also change these later in Settings.
        </Text>

        <View style={styles.sessionsPreview}>
          {DEFAULT_SESSIONS.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={styles.sessionRow}
              onPress={() => handleTimePress(session.id)}
              activeOpacity={0.7}
            >
              <View style={styles.sessionOrderBadge}>
                <Text style={styles.sessionOrderText}>{session.order}</Text>
              </View>
              <View style={styles.sessionDetails}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <View style={styles.timeButton}>
                  <Text style={styles.sessionTimeEditable}>
                    {formatTime(getSessionTime(session.id, session.defaultTime))}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('notifications')}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNotifications = () => (
    <View style={[styles.stepContainer, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
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
    <View style={[styles.stepContainer, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.centerContent}>
        <Text style={styles.framingTitle}>Practice as Life</Text>

        <Text style={styles.framingParagraph}>
          Six invitations throughout the day to recognize what's already present. This is practice woven into life itself, not separate from it. Each moment becomes a doorway to presence.
        </Text>

        <Text style={styles.framingQuote}>
          "Practice without edges."
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleComplete}>
        <Text style={styles.primaryButtonText}>Begin Practice</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {step === 'welcome' && renderWelcome()}
      {step === 'schedule' && renderSchedule()}
      {step === 'notifications' && renderNotifications()}
      {step === 'framing' && renderFraming()}

      {/* Time Picker Modal */}
      <Modal
        visible={selectedSession !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSession(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Time</Text>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <TouchableOpacity
                  onPress={() => setTempHour((h) => (h + 1) % 24)}
                  style={styles.pickerButton}
                >
                  <Text style={styles.pickerButtonText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.pickerValue}>
                  {tempHour.toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  onPress={() => setTempHour((h) => (h - 1 + 24) % 24)}
                  style={styles.pickerButton}
                >
                  <Text style={styles.pickerButtonText}>▼</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.pickerSeparator}>:</Text>

              <View style={styles.pickerColumn}>
                <TouchableOpacity
                  onPress={() => setTempMinute((m) => (m + 5) % 60)}
                  style={styles.pickerButton}
                >
                  <Text style={styles.pickerButtonText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.pickerValue}>
                  {tempMinute.toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  onPress={() => setTempMinute((m) => (m - 5 + 60) % 60)}
                  style={styles.pickerButton}
                >
                  <Text style={styles.pickerButtonText}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setSelectedSession(null)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleTimeSave}
              >
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  logoImage: {
    width: 280,
    height: 280,
    alignSelf: 'center',
    marginBottom: spacing.md,
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
  framingParagraph: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.lg,
    lineHeight: typography.fontSizes.lg * typography.lineHeights.relaxed,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
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
  timeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.sm,
  },
  sessionTimeEditable: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pickerColumn: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerButton: {
    padding: spacing.sm,
  },
  pickerButtonText: {
    color: colors.primary,
    fontSize: typography.fontSizes.xl,
  },
  pickerValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    minWidth: 50,
    textAlign: 'center',
  },
  pickerSeparator: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    marginHorizontal: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  modalButtonCancelText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  modalButtonSaveText: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
});
