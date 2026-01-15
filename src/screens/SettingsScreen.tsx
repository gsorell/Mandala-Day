import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { RootStackParamList } from '../types';
import { clearAllData } from '../services/storage';
import { debugNotifications } from '../utils/notificationDebug';
import { scheduleAllSessionNotifications } from '../services/notifications';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { appSettings, updateAppSettings, userSchedule, todayInstances } = useApp();

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'This will clear all your data and return to the initial setup. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            // Force reload to reset in-memory state and show onboarding
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          },
        },
      ]
    );
  };

  const handleDebugNotifications = async () => {
    const result = await debugNotifications();
    
    Alert.alert(
      'Notification Debug Info',
      `Permission: ${result.permissionStatus}\nScheduled: ${result.scheduledCount} notifications\n\nCheck console for details.`,
      [{ text: 'OK' }]
    );
  };

  const handleRescheduleNotifications = async () => {
    if (!userSchedule || !todayInstances.length) {
      Alert.alert(
        'Cannot Reschedule',
        'No sessions available to schedule notifications for.',
        [{ text: 'OK' }]
      );
      return;
    }

    await scheduleAllSessionNotifications(todayInstances, userSchedule);
    const result = await debugNotifications();
    
    Alert.alert(
      'Notifications Rescheduled',
      `Successfully scheduled ${result.scheduledCount} notifications for today's sessions.`,
      [{ text: 'OK' }]
    );
  };

  if (!appSettings) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ScheduleSettings')}
          >
            <Text style={styles.menuItemText}>Session Times</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Switch
              value={appSettings.notificationsEnabled}
              onValueChange={(value) =>
                updateAppSettings({ notificationsEnabled: value })
              }
              trackColor={{ false: colors.ritualSurface, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          {Platform.OS !== 'web' && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleRescheduleNotifications}
              >
                <Text style={styles.menuItemText}>Reschedule Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDebugNotifications}
              >
                <Text style={styles.menuItemText}>Debug Notifications</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.menuItemText}>History</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleResetApp}>
            <Text style={[styles.menuItemText, styles.destructive]}>
              Reset App
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>Mandala Day</Text>
          <Text style={styles.aboutText}>
            Six daily sessions for awareness and compassion.
          </Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
        </View>

        <View style={styles.gentleMessage}>
          <Text style={styles.gentleText}>
            "No streaks. No guilt. Just return."
          </Text>
        </View>
      </ScrollView>
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
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.ritualSurface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  menuItemText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  menuItemArrow: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xl,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.ritualSurface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  destructive: {
    color: colors.missed,
  },
  aboutSection: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  aboutTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  aboutText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
  },
  aboutVersion: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.sm,
  },
  gentleMessage: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  gentleText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
  },
});
