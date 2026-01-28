import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { SessionCard } from '../components/SessionCard';
import { MandalaComplete } from '../components/MandalaComplete';
import { getSessionById } from '../data/sessions';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { RootStackParamList, SessionStatus } from '../types';
import { MAX_SNOOZE_COUNT, DEFAULT_SNOOZE_OPTIONS } from '../utils/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const TodayScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    todayInstances,
    userSchedule,
    refreshTodayInstances,
    skipSession,
    snoozeSession,
  } = useApp();

  const handleStart = (instanceId: string) => {
    navigation.navigate('SessionPlayer', { instanceId });
  };

  const handleSkip = async (instanceId: string) => {
    await skipSession(instanceId);
  };

  const handleSnooze = async (instanceId: string, minutes: number) => {
    await snoozeSession(instanceId, minutes);
  };

  const handleShare = (instanceId: string, templateId: string, endedAt?: string) => {
    const session = getSessionById(templateId);
    if (session) {
      navigation.navigate('SessionComplete', {
        instanceId,
        sessionTitle: session.title,
        dedication: session.dedication,
        completedAt: endedAt,
      });
    }
  };

  const today = format(new Date(), 'EEEE, MMMM d');

  // Check if all sessions are completed for today
  const allSessionsComplete =
    todayInstances.length > 0 &&
    todayInstances.every((instance) => instance.status === SessionStatus.COMPLETED);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Image
          source={require('../../assets/mandala-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        {allSessionsComplete && (
          <MandalaComplete
            onPress={() => navigation.navigate('MandalaComplete', { date: format(new Date(), 'yyyy-MM-dd') })}
          />
        )}

        <View style={styles.dotsContainer}>
          {todayInstances.map((instance) => (
            <View
              key={instance.id}
              style={[
                styles.dot,
                instance.status === SessionStatus.COMPLETED && styles.dotFilled,
                allSessionsComplete && styles.dotComplete,
              ]}
            />
          ))}
        </View>

        <View style={styles.header}>
          <Text style={styles.greeting}>Today</Text>
          <Text style={styles.date}>{today}</Text>
        </View>

        <View style={styles.sessionsContainer}>
          <Text style={styles.sectionTitle}>Your Mandala</Text>
          {todayInstances.map((instance) => (
            <SessionCard
              key={instance.id}
              instance={instance}
              onStart={() => handleStart(instance.id)}
              onSkip={() => handleSkip(instance.id)}
              onSnooze={(minutes) => handleSnooze(instance.id, minutes)}
              onShare={() => handleShare(instance.id, instance.templateId, instance.endedAt)}
              snoozeOptions={userSchedule?.snoozeOptionsMin || DEFAULT_SNOOZE_OPTIONS}
              maxSnoozeCount={MAX_SNOOZE_COUNT}
            />
          ))}
        </View>

        <View style={styles.gentleReminder}>
          <Text style={styles.reminderText}>
            Practice without edges.
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
  logo: {
    width: 600,
    height: 180,
    alignSelf: 'center',
    marginBottom: spacing.md,
    opacity: 0.9,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
  date: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dotComplete: {
    backgroundColor: colors.completeMandala,
    borderColor: colors.completeMandala,
  },
  nextSessionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  nextSessionLabel: {
    color: colors.white,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  sessionsContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  gentleReminder: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  reminderText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
  },
});
