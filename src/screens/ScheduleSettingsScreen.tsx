import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { DEFAULT_SESSIONS } from '../data/sessions';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

export const ScheduleSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { userSchedule, updateUserSchedule } = useApp();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [tempHour, setTempHour] = useState(7);
  const [tempMinute, setTempMinute] = useState(0);

  if (!userSchedule) return null;

  const handleSessionToggle = async (sessionId: string) => {
    await updateUserSchedule({
      enabledSessions: {
        ...userSchedule.enabledSessions,
        [sessionId]: !userSchedule.enabledSessions[sessionId],
      },
    });
  };

  const handleTimePress = (sessionId: string) => {
    const currentTime = userSchedule.sessionTimes[sessionId] || '07:00';
    const [hours, minutes] = currentTime.split(':').map(Number);
    setTempHour(hours);
    setTempMinute(minutes);
    setSelectedSession(sessionId);
  };

  const handleTimeSave = async () => {
    if (!selectedSession) return;

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

  const handleQuietHoursToggle = async () => {
    await updateUserSchedule({
      quietHours: {
        ...userSchedule.quietHours,
        enabled: !userSchedule.quietHours.enabled,
      },
    });
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Schedule</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Times</Text>
          <Text style={styles.sectionDescription}>
            Adjust when each session is scheduled. Times can be customized to fit
            your daily rhythm.
          </Text>

          {DEFAULT_SESSIONS.map((session) => {
            const isEnabled = userSchedule.enabledSessions[session.id] !== false;
            const time = userSchedule.sessionTimes[session.id] || session.defaultTime;

            return (
              <View key={session.id} style={styles.sessionItem}>
                <View style={styles.sessionInfo}>
                  <View style={styles.sessionHeader}>
                    <Text style={[styles.sessionOrder, { opacity: isEnabled ? 1 : 0.5 }]}>
                      {session.order}
                    </Text>
                    <Text
                      style={[styles.sessionTitle, { opacity: isEnabled ? 1 : 0.5 }]}
                    >
                      {session.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.timeButton, !isEnabled && styles.timeButtonDisabled]}
                    onPress={() => isEnabled && handleTimePress(session.id)}
                    disabled={!isEnabled}
                  >
                    <Text style={styles.timeText}>{formatTime(time)}</Text>
                  </TouchableOpacity>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => handleSessionToggle(session.id)}
                  trackColor={{ false: colors.surface, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <Text style={styles.sectionDescription}>
            Notifications will be suppressed during quiet hours.
          </Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
            <Switch
              value={userSchedule.quietHours.enabled}
              onValueChange={handleQuietHoursToggle}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {userSchedule.quietHours.enabled && (
            <View style={styles.quietHoursRange}>
              <Text style={styles.quietHoursText}>
                {formatTime(userSchedule.quietHours.start)} -{' '}
                {formatTime(userSchedule.quietHours.end)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  backButton: {
    color: colors.primary,
    fontSize: typography.fontSizes.md,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.md,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  sessionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sessionOrder: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginRight: spacing.sm,
  },
  sessionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  timeButton: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  timeButtonDisabled: {
    opacity: 0.5,
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  quietHoursRange: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  quietHoursText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
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
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
    marginVertical: spacing.sm,
  },
  pickerSeparator: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
    marginHorizontal: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonSaveText: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});
