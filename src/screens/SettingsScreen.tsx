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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { RootStackParamList, SessionStatus } from '../types';
import {
  clearAllData,
  getExtraPracticeMinutes,
  getSelectedPracticeGroup,
  saveSelectedPracticeGroup,
} from '../services/storage';
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

// Routes reachable with no params — the only ones these rows can link to,
// since they navigate on a bare name. A screen that needs params (SessionPlayer,
// MandalaComplete) is excluded at compile time rather than failing on tap.
type ParamlessRoute = {
  [K in keyof RootStackParamList]: undefined extends RootStackParamList[K] ? K : never;
}[keyof RootStackParamList];

// A row in one of the practice lists. `route` is keyed to RootStackParamList,
// so a typo'd or removed screen fails typecheck instead of dead-ending at a
// tap. Adding a meditation is one entry here — no JSX to clone.
type PracticeRow = {
  route: ParamlessRoute;
  title: string;
  subtitle?: string;
};

const TIMERS: PracticeRow[] = [
  { route: 'SimpleTimer', title: 'Simple Timer' },
  { route: 'SittingWalking', title: 'Sitting & Walking', subtitle: 'zazen & kinhin timer' },
  { route: 'VipassanaTimer', title: 'Vipassana', subtitle: 'silent sit · 60 min' },
];

const BREATHWORK: PracticeRow[] = [
  { route: 'Pranayama', title: 'Pranayama', subtitle: '7 · 4 · 7 · 4 breath' },
  { route: 'SquareBreathing', title: 'Square Breathing', subtitle: '4 · 4 · 4 · 4 breath' },
];

const GUIDED: PracticeRow[] = [
  { route: 'Vipassana', title: 'Body Scan', subtitle: '10 min guided' },
  { route: 'CrownToSole', title: 'Crown to Sole', subtitle: '10 min guided' },
  { route: 'Vision', title: 'Clear Seeing', subtitle: '10 min guided' },
  { route: 'DirectInquiry', title: 'Direct Inquiry', subtitle: '10 min guided' },
  { route: 'ChakraCenters', title: 'The Chakra Centers', subtitle: '11 min guided' },
  { route: 'GeometryOfAttention', title: 'The Geometry of Attention', subtitle: '10 min guided' },
  { route: 'RecognizingThought', title: 'Recognizing Thought', subtitle: '10 min guided' },
];

const KIDS: PracticeRow[] = [
  { route: 'ChildrensSleep', title: 'Jungle Safari', subtitle: '9 min guided' },
  { route: 'BodySeaVoyage', title: 'Sea Voyage', subtitle: '7 min guided' },
  { route: 'StarryNight', title: 'Starry Night', subtitle: '8 min guided' },
  { route: 'MarshCreek', title: 'Marsh Creek', subtitle: '7 min guided' },
  { route: 'QuietCove', title: 'The Quiet Cove', subtitle: '7 min guided' },
  { route: 'PrairieWind', title: 'Prairie Wind', subtitle: '9 min guided' },
  { route: 'WhereTheStarsTurn', title: 'Where the Stars Turn', subtitle: '8 min guided' },
  { route: 'TheFirstSnow', title: 'The First Snow', subtitle: '10 min guided' },
  { route: 'PlayFort', title: 'The Play Fort', subtitle: '7 min guided' },
  { route: 'FireflyMeadow', title: 'The Firefly Meadow', subtitle: '7 min guided' },
  { route: 'SleepyZoo', title: 'The Sleepy Zoo', subtitle: '8 min guided' },
  { route: 'CityOfLights', title: 'The City of Lights', subtitle: '8 min guided' },
  { route: 'RainOnTheRoof', title: 'Rain on the Roof', subtitle: '8 min guided' },
  { route: 'TheQuietHall', title: 'The Quiet Hall', subtitle: '7 min guided' },
];

type PracticeGroup = {
  id: string;
  title: string;
  description: string;
  rows: PracticeRow[];
};

// Order here is chip order, and the first entry is what a new user lands on:
// Guided leads because it's what most people open this tab for. Descriptions
// are rendered after the row count ("7 narrated practices…"), so they read as
// a continuation of it — lowercase, plural, no leading article.
const PRACTICE_GROUPS: PracticeGroup[] = [
  {
    id: 'guided',
    title: 'Guided',
    description: 'narrated practices, 10–11 minutes each',
    rows: GUIDED,
  },
  {
    id: 'timers',
    title: 'Timers',
    description: 'silent sits — bells, intervals, walking',
    rows: TIMERS,
  },
  {
    id: 'breathwork',
    title: 'Breathwork',
    description: 'counted breath patterns, self-paced',
    rows: BREATHWORK,
  },
  {
    id: 'kids',
    title: 'Kids',
    description: 'bedtime meditations for children, 7–10 minutes',
    rows: KIDS,
  },
];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { appSettings, updateAppSettings, userSchedule, todayInstances } = useApp();
  const [extraMinutes, setExtraMinutes] = useState(0);

  // One practice group is shown at a time, chosen by the strip above the list.
  // Remembered across launches, so a parent who lives in Kids doesn't re-pick
  // it every visit.
  const [groupId, setGroupId] = useState<string>(PRACTICE_GROUPS[0].id);

  useEffect(() => {
    getSelectedPracticeGroup().then((saved) => {
      // Ignore a stored id whose group has since been renamed or removed.
      if (saved && PRACTICE_GROUPS.some((g) => g.id === saved)) setGroupId(saved);
    });
  }, []);

  const selectGroup = (id: string) => {
    setGroupId(id);
    void saveSelectedPracticeGroup(id);
  };

  const activeGroup =
    PRACTICE_GROUPS.find((g) => g.id === groupId) ?? PRACTICE_GROUPS[0];

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
              window.location.reload();
            }
          },
        },
      ]
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

  const renderPracticeRow = (row: PracticeRow) => (
    <TouchableOpacity
      key={row.route}
      style={styles.menuItem}
      onPress={() => navigation.navigate(row.route as never)}
    >
      <Text style={styles.menuItemText}>{row.title}</Text>
      {!!row.subtitle && <Text style={styles.menuItemSubtext}>{row.subtitle}</Text>}
      <Text style={styles.menuItemArrow}>›</Text>
    </TouchableOpacity>
  );

  // Selector for the practice list below it. Nothing nests and nothing pushes:
  // switching groups swaps the rows in place, so the list always begins at the
  // same spot and the sections below it barely move.
  const renderGroupChip = (group: PracticeGroup) => {
    const isActive = group.id === activeGroup.id;
    return (
      <TouchableOpacity
        key={group.id}
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => selectGroup(group.id)}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${group.title}, ${group.rows.length} items`}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{group.title}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} pinchGestureEnabled={false} maximumZoomScale={1} minimumZoomScale={1}>
        <Text style={styles.title}>Extras</Text>

        <View style={styles.todayCard}>
          <Text style={styles.todayMinutes}>{todayMinutes}</Text>
          <Text style={styles.todayLabel}>minutes today</Text>
        </View>

        {/* Ordered by what brings someone to this tab: a practice to do, then
            the record of practices done, then settings that are set once. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practice</Text>
          <View style={styles.chipRow}>{PRACTICE_GROUPS.map(renderGroupChip)}</View>
          <Text style={styles.groupDescription}>
            {activeGroup.rows.length} {activeGroup.description}
          </Text>
          {activeGroup.rows.map(renderPracticeRow)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Practice</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Journal')}
          >
            <Text style={styles.menuItemText}>Journal</Text>
            <Text style={styles.menuItemSubtext}>Notes from your sittings</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.menuItemText}>History</Text>
            <Text style={styles.menuItemSubtext}>Every session you've completed</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ScheduleSettings')}
          >
            <Text style={styles.menuItemText}>Session Times</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
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
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRescheduleNotifications}
            >
              <Text style={styles.menuItemText}>Reschedule Notifications</Text>
            </TouchableOpacity>
          )}
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
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Onboarding')}
          >
            <Text style={styles.menuItemText}>Revisit Orientation</Text>
            <Text style={styles.menuItemSubtext}>The opening walkthrough and times</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleResetApp}>
            <Text style={[styles.menuItemText, styles.destructive]}>Reset App</Text>
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
          {Platform.OS !== 'ios' && (
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.paypal.com/donate/?business=KEY6EUVRF3SPY&no_recurring=0&item_name=If+MandalaDay+has+been+useful+to+you%2C+your+donation+keeps+the+server+lights+on+and+the+development+going.+Thank+you.&currency_code=USD')}
            >
              <Text style={styles.donateLink}>Support MandalaDay ↗</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.gentleMessage}>
          <Text style={styles.gentleText}>
            "Practice without edges."
          </Text>
        </View>

        {/* Sound attribution. keisu-bell.mp3 (Sitting & Walking) is CC BY 4.0,
            which requires crediting the author wherever the work is
            distributed — so it stays in the app, but as the last line of the
            scroll rather than inside the branding block. */}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://freesound.org/people/milivolt/sounds/367128/')}
        >
          <Text style={styles.creditText}>
            Keisu bell: "Keisu temple bell" by milivolt, CC BY 4.0 ↗
          </Text>
        </TouchableOpacity>
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
  // Practice group selector, drawn as a segmented control: the shared track is
  // what makes these read as controls for the list below rather than as tags on
  // it. Wraps rather than scrolling horizontally so no group sits off-screen.
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.ritualSurface,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Grow to divide the track between them rather than bunching at the left.
    // flexBasis stays auto so a long label keeps its intrinsic width — equal
    // segments (flexBasis: 0) would clip "Breathwork" on a narrow phone.
    flexGrow: 1,
    flexBasis: 'auto',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
  },
  chipTextActive: {
    color: colors.white,
  },
  // Sits between the strip and the list, naming what the active chip selected.
  // Leads with the count so it reads as a result summary — the line that tells
  // you the strip above filtered the rows below.
  groupDescription: {
    marginBottom: spacing.sm,
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.normal,
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
    width: 180,
    height: 180,
    marginBottom: spacing.md,
    opacity: 0.9,
  },
  aboutText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
  },
  donateLink: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.md,
    opacity: 0.7,
  },
  // Deliberately the quietest thing on the screen: micro type, low opacity,
  // below the closing line. Present for the licence, not for the reader.
  creditText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.micro,
    textAlign: 'center',
    marginTop: spacing.lg,
    opacity: 0.4,
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
