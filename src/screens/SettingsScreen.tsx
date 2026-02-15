import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { RootStackParamList, SessionStatus } from '../types';
import { clearAllData, getExtraPracticeMinutes } from '../services/storage';
import { debugNotifications } from '../utils/notificationDebug';
import { scheduleAllSessionNotifications } from '../services/notifications';
import { getSessionById } from '../data/sessions';
import {
  areWebNotificationsSupported,
  requestWebNotificationPermission,
  getNotificationPermission,
  getPendingWebNotificationsCount,
  clearWebNotifications,
} from '../services/webNotifications';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { appSettings, updateAppSettings, userSchedule, todayInstances } = useApp();
  const [extraMinutes, setExtraMinutes] = useState(0);

  // Load extra practice minutes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadExtraMinutes = async () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const minutes = await getExtraPracticeMinutes(today);
        setExtraMinutes(minutes);
      };
      loadExtraMinutes();
    }, [])
  );

  // Calculate today's meditation minutes from completed mandala sessions
  // Using Math.ceil so any partial minute counts (e.g., 30 sec = 1 min)
  const mandalaMinutes = useMemo(() => {
    return todayInstances
      .filter((instance) => instance.status === SessionStatus.COMPLETED)
      .reduce((total, instance) => {
        const session = getSessionById(instance.templateId);
        return total + (session ? Math.ceil(session.durationSec / 60) : 0);
      }, 0);
  }, [todayInstances]);

  // Total minutes = mandala sessions + extra practice (Simple Timer, Vipassana)
  const todayMinutes = mandalaMinutes + extraMinutes;

  const handleNotificationToggle = async (value: boolean) => {
    if (value && Platform.OS === 'web') {
      // Request permission on web
      const granted = await requestWebNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please allow notifications in your browser settings to receive session reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    if (!value && Platform.OS === 'web') {
      // Clear scheduled notifications when disabling
      void clearWebNotifications();
    }
    
    updateAppSettings({ notificationsEnabled: value });
  };

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
            // Force hard reload to reset in-memory state and show onboarding
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.href = window.location.href;
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} pinchGestureEnabled={false} maximumZoomScale={1} minimumZoomScale={1}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.todayCard}>
          <Text style={styles.todayMinutes}>{todayMinutes}</Text>
          <Text style={styles.todayLabel}>minutes today</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practice</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('SimpleTimer')}
          >
            <Text style={styles.menuItemText}>Simple Timer</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Vipassana')}
          >
            <Text style={styles.menuItemText}>Vipassana</Text>
            <Text style={styles.menuItemSubtext}>10 min guided</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ChildrensSleep')}
          >
            <Text style={styles.menuItemText}>Children's Sleep Meditation</Text>
            <Text style={styles.menuItemSubtext}>9 min guided</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

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
              onValueChange={handleNotificationToggle}
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('TheView')}
          >
            <Text style={styles.menuItemText}>The View</Text>
            <Text style={styles.menuItemSubtext}>Philosophy & practice roots</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.aboutSection}>
          <Image
            source={require('../../assets/mandala-logo.png')}
            style={styles.aboutLogo}
            resizeMode="contain"
          />
          <Text style={styles.aboutText}>
            Six daily sessions for awareness and compassion.
          </Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
        </View>

        <View style={styles.gentleMessage}>
          <Text style={styles.gentleText}>
            "Practice without edges."
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
  todayCard: {
    backgroundColor: colors.ritualSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  todayMinutes: {
    color: colors.accent,
    fontSize: 48,
    fontWeight: typography.fontWeights.light,
  },
  todayLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
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
  menuItemSubtext: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    flex: 1,
    marginLeft: spacing.sm,
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
  aboutLogo: {
    width: 500,
    height: 150,
    marginBottom: spacing.md,
    opacity: 0.9,
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
