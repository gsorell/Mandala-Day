import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useApp } from '../context/AppContext';
import { DEFAULT_SESSIONS } from '../data/sessions';
import { setPendingPractice } from '../services/pendingPractice';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

// Three-screen arc: lead with the idea (the whole day is one practice), then a
// single light-touch setup, then drop the user into experience. Notification
// permission is deferred to the end of the schedule step — after the value has
// landed and the user has opted in via the inline toggle — rather than fired as
// a cold system prompt mid-flow.
type OnboardingStep = 'welcome' | 'schedule' | 'invitation';
const STEP_ORDER: OnboardingStep[] = ['welcome', 'schedule', 'invitation'];

// Time-of-day phase for each of the six sessions (by order). The opening screen
// shows the day turning through these phases — dawn to night — instead of clock
// times, so "comprehensive" reads as a journey, not a timetable. Actual times
// are set on the next screen.
const PHASE_LABELS = ['Dawn', 'Morning', 'Midday', 'Afternoon', 'Evening', 'Night'];

export const OnboardingScreen: React.FC = () => {
  const { updateAppSettings, updateUserSchedule, userSchedule } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [tempHour, setTempHour] = useState(7);
  const [tempMinute, setTempMinute] = useState(0);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  // Fired when leaving the schedule step. If the user left the inline reminders
  // toggle on, request OS permission here (between screens, not at practice
  // start) and record the outcome; otherwise persist that reminders are off.
  const handleScheduleContinue = async () => {
    try {
      if (remindersEnabled) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        await updateAppSettings({ notificationsEnabled: finalStatus === 'granted' });
      } else {
        await updateAppSettings({ notificationsEnabled: false });
      }
    } catch (error) {
      console.error('Error requesting notifications:', error);
      await updateAppSettings({ notificationsEnabled: false });
    }
    setStep('invitation');
  };

  const handleComplete = async () => {
    await updateAppSettings({ hasCompletedOnboarding: true });
  };

  const handleBeginDirectInquiry = async () => {
    // Record the intent before swapping the navigator tree. Once onboarding is
    // marked complete the main stack mounts and the Today screen consumes this,
    // dropping the user straight into the practice.
    setPendingPractice('DirectInquiry');
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

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  const renderProgress = () => {
    const activeIndex = STEP_ORDER.indexOf(step);
    return (
      <View style={styles.progressRow}>
        {step !== 'welcome' && (
          <TouchableOpacity onPress={goBack} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
        )}
        <View style={styles.dotsRow}>
          {STEP_ORDER.map((s, i) => (
            <View
              key={s}
              style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderWelcome = () => (
    <View style={[styles.stepContainer, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      {renderProgress()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.welcomeScrollContent}>
        <Image
          source={require('../../assets/mandala-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.welcomeTitle}>A day, complete.</Text>
        <Text style={styles.reliefText}>
          Not a library of sessions to sort through — the whole arc of a practice day, already built.
        </Text>

        <View style={styles.arc}>
          <View style={styles.arcLine} />
          {DEFAULT_SESSIONS.map((session, i) => (
            <View key={session.id} style={styles.arcRow}>
              <Text style={styles.arcPhase}>{PHASE_LABELS[i]}</Text>
              <View style={styles.arcRail}>
                <View style={styles.arcNode} />
              </View>
              <Text style={styles.arcTitle}>{session.title}</Text>
            </View>
          ))}
        </View>

        <View style={styles.closer}>
          <View style={styles.closerRule} />
          <Text style={styles.closerLine}>No extra hours — the day you already have.</Text>
          <Text style={styles.closerLine}>Complete it once and the day is whole.</Text>
          <Text style={styles.closerLineFinal}>Return to it daily, and it becomes a life.</Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('schedule')}>
        <Text style={styles.primaryButtonText}>Begin</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSchedule = () => (
    <View style={[styles.stepContainer, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      {renderProgress()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scheduleScrollContent}>
        <Text style={styles.stepTitle}>Make it yours</Text>
        <Text style={styles.stepDescription}>
          These six anchor your day. The times below are a gentle default — tap any to adjust, or change them later in Settings.
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

        <TouchableOpacity
          style={styles.reminderRow}
          onPress={() => setRemindersEnabled((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={styles.reminderText}>
            <Text style={styles.reminderTitle}>Gentle reminders</Text>
            <Text style={styles.reminderSubtitle}>
              A soft prompt at each time. No streaks, no pressure — turn off anytime.
            </Text>
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={setRemindersEnabled}
            trackColor={{ false: colors.charcoal, true: colors.accent }}
            thumbColor={colors.white}
          />
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity style={styles.primaryButton} onPress={handleScheduleContinue}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInvitation = () => (
    <View style={[styles.stepContainer, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      {renderProgress()}
      <View style={styles.centerContent}>
        <Text style={styles.stepTitle}>Begin here</Text>

        <View style={styles.welcomeDescription}>
          <Text style={styles.descriptionText}>
            Every practice begins with direct experience.
          </Text>
          <Text style={styles.invitationKeyLine}>Direct Inquiry</Text>
          <Text style={styles.descriptionText}>
            A ten-minute investigation into breath, body, mind, and self.
          </Text>
        </View>

        <Text style={styles.reassuranceLine}>
          No streaks here. Miss a session — simply return. Each return completes the mandala.
        </Text>

        <TouchableOpacity onPress={() => navigation.navigate('TheView')} style={styles.viewLink}>
          <Text style={styles.viewLinkText}>Explore the philosophy →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleBeginDirectInquiry}>
          <Text style={styles.primaryButtonText}>Begin Direct Inquiry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleComplete}>
          <Text style={styles.secondaryButtonText}>Explore on my own</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {step === 'welcome' && renderWelcome()}
      {step === 'schedule' && renderSchedule()}
      {step === 'invitation' && renderInvitation()}

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
  // Progress / back
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    marginBottom: spacing.sm,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 30,
    lineHeight: 30,
    fontWeight: typography.fontWeights.light,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotInactive: {
    backgroundColor: colors.charcoal,
  },
  // Welcome
  welcomeScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  logoImage: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  reliefText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  // Six-session arc — the day turning through its phases, as a vertical timeline.
  arc: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  arcLine: {
    position: 'absolute',
    left: 104,
    top: 22,
    bottom: 22,
    width: 1,
    backgroundColor: colors.charcoal,
  },
  arcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  arcPhase: {
    width: 96,
    textAlign: 'right',
    color: colors.accent,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    letterSpacing: typography.letterSpacing.relaxed,
    textTransform: 'uppercase',
  },
  arcRail: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcNode: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
  },
  arcTitle: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.medium,
  },
  // Closing tercet — the inspirational turn (day -> whole -> a life).
  closer: {
    alignItems: 'center',
  },
  closerRule: {
    width: 40,
    height: 1,
    backgroundColor: colors.charcoal,
    marginBottom: spacing.lg,
  },
  closerLine: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
  },
  closerLineFinal: {
    color: colors.accent,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
    marginTop: spacing.xs,
  },
  // Shared step chrome
  welcomeDescription: {
    gap: spacing.md,
  },
  invitationKeyLine: {
    color: colors.accent,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: spacing.sm,
  },
  descriptionText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
  },
  reassuranceLine: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
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
  // Schedule
  scheduleScrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.md,
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
    flex: 1,
    marginRight: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  timeButton: {
    flexShrink: 0,
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
  // Inline reminders toggle
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  reminderText: {
    flex: 1,
    marginRight: spacing.md,
  },
  reminderTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.hair,
  },
  reminderSubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.normal,
  },
  // Invitation
  viewLink: {
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  viewLinkText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
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
  // Time picker modal
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
