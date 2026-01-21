import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, subDays, parseISO } from 'date-fns';
import { getDailyInstances } from '../services/storage';
import { DailySessionInstance, SessionStatus, RootStackParamList } from '../types';
import { getSessionById } from '../data/sessions';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

// Number of sessions that constitute a full mandala
const FULL_MANDALA_COUNT = 6;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DayData {
  date: string;
  instances: DailySessionInstance[];
  completedCount: number;
  totalCount: number;
}

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [historyData, setHistoryData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      const days: DayData[] = [];
      const today = new Date();

      for (let i = 0; i < 14; i++) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');

        try {
          const instances = await getDailyInstances(dateStr);
          const completedCount = instances.filter(
            (inst) => inst.status === SessionStatus.COMPLETED
          ).length;

          days.push({
            date: dateStr,
            instances,
            completedCount,
            totalCount: instances.length,
          });
        } catch (error) {
          console.error(`Error loading history for ${dateStr}:`, error);
        }
      }

      setHistoryData(days);
      setIsLoading(false);
    };

    loadHistory();
  }, []);

  const getStatusColor = (status: SessionStatus): string => {
    switch (status) {
      case SessionStatus.COMPLETED:
        return colors.completed;
      case SessionStatus.SKIPPED:
        return colors.skipped;
      case SessionStatus.MISSED:
        return colors.missed;
      default:
        return colors.upcoming;
    }
  };

  const totalCompleted = historyData.reduce(
    (sum, day) => sum + day.completedCount,
    0
  );

  const handleShareSession = (instance: DailySessionInstance) => {
    const session = getSessionById(instance.templateId);
    if (session) {
      navigation.navigate('SessionComplete', {
        instanceId: instance.id,
        sessionTitle: session.title,
        dedication: session.dedication,
        completedAt: instance.endedAt,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>History</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{totalCompleted}</Text>
          <Text style={styles.summaryLabel}>sessions in the past 14 days</Text>
          <Text style={styles.summaryNote}>
            Each return is a fresh beginning.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Days</Text>

        {historyData.map((day) => {
          const dateObj = parseISO(day.date);
          const isToday = format(new Date(), 'yyyy-MM-dd') === day.date;
          const dayLabel = isToday ? 'Today' : format(dateObj, 'EEEE, MMM d');
          const isFullMandala = day.completedCount === FULL_MANDALA_COUNT && day.totalCount === FULL_MANDALA_COUNT;

          return (
            <View key={day.date} style={[styles.dayCard, isFullMandala && styles.dayCardComplete]}>
              <View style={styles.dayHeader}>
                <View style={styles.dayLabelRow}>
                  <Text style={styles.dayLabel}>{dayLabel}</Text>
                  {isFullMandala && (
                    <View style={styles.charmBadge}>
                      <Text style={styles.charmSymbol}>❁</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.dayCount, isFullMandala && styles.dayCountComplete]}>
                  {day.completedCount} / {day.totalCount}
                </Text>
              </View>

              <View style={styles.sessionDots}>
                {day.instances.map((instance) => {
                  const session = getSessionById(instance.templateId);
                  const isCompleted = instance.status === SessionStatus.COMPLETED;

                  if (isCompleted) {
                    return (
                      <TouchableOpacity
                        key={instance.id}
                        style={[
                          styles.sessionDot,
                          { backgroundColor: getStatusColor(instance.status) },
                        ]}
                        onPress={() => handleShareSession(instance)}
                      >
                        <Text style={styles.sessionDotText}>{session?.order || '?'}</Text>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <View
                      key={instance.id}
                      style={[
                        styles.sessionDot,
                        { backgroundColor: getStatusColor(instance.status) },
                      ]}
                    >
                      <Text style={styles.sessionDotText}>{session?.order || '?'}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.gentleReminder}>
          <Text style={styles.reminderText}>
            Numbers are just marks on the path.{'\n'}
            What matters is the recognition itself.
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  summaryNumber: {
    color: colors.accent,
    fontSize: 48,
    fontWeight: typography.fontWeights.bold,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginTop: spacing.xs,
  },
  summaryNote: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dayCardComplete: {
    borderWidth: 1,
    borderColor: colors.completeMandala,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayLabel: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  dayCount: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  dayCountComplete: {
    color: colors.completeMandala,
  },
  charmBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  charmSymbol: {
    fontSize: 12,
    color: colors.completeMandala,
  },
  sessionDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sessionDot: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionDotText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  gentleReminder: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  reminderText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
});
