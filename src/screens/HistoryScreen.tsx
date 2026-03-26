import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
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
  }, []);

  // Reload history data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

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

  const EXTRA_SESSION_META: Record<string, { title: string; dedication: string; shareMessage: string; abbr: string }> = {
    extra_simple_timer: {
      title: 'Simple Timer',
      dedication: 'May your practice bring benefit to all beings.',
      shareMessage: 'I completed a silent meditation',
      abbr: 'ST',
    },
    extra_pranayama: {
      title: 'Pranayama',
      dedication: 'May your breath carry peace to all beings.',
      shareMessage: 'I completed a pranayama breathing meditation',
      abbr: 'P',
    },
    extra_square_breathing: {
      title: 'Square Breathing',
      dedication: 'May your steady breath bring balance to all beings.',
      shareMessage: 'I completed a square breathing meditation',
      abbr: 'SB',
    },
    extra_sea_voyage: {
      title: 'Sea Voyage',
      dedication: 'May this voyage bring peaceful dreams to all little ones.',
      shareMessage: 'A bedtime voyage for the little ones',
      abbr: 'SV',
    },
    extra_vipassana: {
      title: 'Body Scan',
      dedication: 'May this practice bring clarity and peace to all beings.',
      shareMessage: 'I completed a Body Scan meditation',
      abbr: 'BS',
    },
    extra_vision: {
      title: 'Clear Seeing',
      dedication: 'Seeing, just as it is.',
      shareMessage: 'I opened my eyes wider today',
      abbr: 'CS',
    },
  };

  const handleShareSession = (instance: DailySessionInstance) => {
    if (instance.templateId.startsWith('extra_')) {
      const meta = EXTRA_SESSION_META[instance.templateId];
      if (meta) {
        navigation.navigate('SessionComplete', {
          instanceId: instance.id,
          sessionTitle: meta.title,
          dedication: meta.dedication,
          shareMessage: meta.shareMessage,
          completedAt: instance.endedAt,
          duration: instance.duration,
        });
      }
      return;
    }
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} pinchGestureEnabled={false} maximumZoomScale={1} minimumZoomScale={1}>
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Days</Text>
          <Text style={styles.sectionHint}>Tap session numbers or ❁ to share</Text>
        </View>

        {historyData.map((day) => {
          const dateObj = parseISO(day.date);
          const isToday = format(new Date(), 'yyyy-MM-dd') === day.date;
          const dayLabel = isToday ? 'Today' : format(dateObj, 'EEEE, MMM d');

          const coreInstances = day.instances.filter((i) => !i.templateId.startsWith('extra_'));
          const extraInstances = day.instances.filter(
            (i) => i.templateId.startsWith('extra_') && i.status === SessionStatus.COMPLETED
          );
          const coreCompleted = coreInstances.filter((i) => i.status === SessionStatus.COMPLETED).length;
          const isFullMandala = coreCompleted === FULL_MANDALA_COUNT && coreInstances.length === FULL_MANDALA_COUNT;

          return (
            <View key={day.date} style={[styles.dayCard, isFullMandala && styles.dayCardComplete]}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{dayLabel}</Text>
                {isFullMandala && (
                  <TouchableOpacity
                    style={styles.charmBadge}
                    onPress={() => navigation.navigate('MandalaComplete', { date: day.date })}
                  >
                    <Text style={styles.charmSymbol}>❁</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.sessionsRow}>
                <View style={styles.sessionDots}>
                  {coreInstances.map((instance) => {
                    const session = getSessionById(instance.templateId);
                    const isCompleted = instance.status === SessionStatus.COMPLETED;

                    if (isCompleted) {
                      return (
                        <TouchableOpacity
                          key={instance.id}
                          style={[styles.sessionDot, { backgroundColor: getStatusColor(instance.status) }]}
                          onPress={() => handleShareSession(instance)}
                        >
                          <Text style={styles.sessionDotText}>{session?.order || '?'}</Text>
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <View
                        key={instance.id}
                        style={[styles.sessionDot, { backgroundColor: getStatusColor(instance.status) }]}
                      >
                        <Text style={styles.sessionDotText}>{session?.order || '?'}</Text>
                      </View>
                    );
                  })}

                  {extraInstances.map((instance) => {
                    const abbr = EXTRA_SESSION_META[instance.templateId]?.abbr ?? '+';
                    return (
                      <TouchableOpacity
                        key={instance.id}
                        style={[styles.sessionDot, { backgroundColor: getStatusColor(instance.status) }]}
                        onPress={() => handleShareSession(instance)}
                      >
                        <Text style={[styles.sessionDotText, abbr.length > 1 && styles.sessionDotTextSmall]}>
                          {abbr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.dayCount, isFullMandala && styles.dayCountComplete]}>
                  {coreCompleted} / {coreInstances.length}
                  {extraInstances.length > 0 ? ` +${extraInstances.length}` : ''}
                </Text>
              </View>
            </View>
          );
        })}

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
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
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
  sessionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charmBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  charmSymbol: {
    fontSize: 14,
    color: colors.completeMandala,
  },
  sessionDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
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
    lineHeight: typography.fontSizes.xs,
    includeFontPadding: false,
  },
  sessionDotTextSmall: {
    fontSize: typography.fontSizes.micro,
    lineHeight: typography.fontSizes.micro,
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
  gentleReminder: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  reminderText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
});
