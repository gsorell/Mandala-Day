import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { format } from 'date-fns';
import { DailySessionInstance, SessionStatus, SessionTemplate } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { getSessionById } from '../data/sessions';
import { getPracticeTypeInfo } from '../data/philosophy';

interface SessionCardProps {
  instance: DailySessionInstance;
  isNextSession: boolean;
  onStart: () => void;
  onSkip: () => void;
  onSnooze: (minutes: number) => void;
  onShare?: () => void;
  snoozeOptions: number[];
  maxSnoozeCount: number;
}

const getStatusColor = (status: SessionStatus): string => {
  switch (status) {
    case SessionStatus.UPCOMING:
      return colors.upcoming;
    case SessionStatus.DUE:
      return colors.due;
    case SessionStatus.COMPLETED:
      return colors.completed;
    case SessionStatus.SKIPPED:
      return colors.skipped;
    case SessionStatus.MISSED:
      return colors.missed;
    default:
      return colors.textMuted;
  }
};

const getStatusLabel = (status: SessionStatus): string => {
  switch (status) {
    case SessionStatus.UPCOMING:
      return 'Upcoming';
    case SessionStatus.DUE:
      return 'Ready';
    case SessionStatus.COMPLETED:
      return 'Completed';
    case SessionStatus.SKIPPED:
      return 'Skipped';
    case SessionStatus.MISSED:
      return 'Passed';
    default:
      return '';
  }
};

export const SessionCard: React.FC<SessionCardProps> = React.memo(({
  instance,
  isNextSession,
  onStart,
  onSkip,
  onSnooze,
  onShare,
  snoozeOptions,
  maxSnoozeCount,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const session = getSessionById(instance.templateId);
  if (!session) return null;

  const statusColor = getStatusColor(instance.status);
  const isActive =
    instance.status === SessionStatus.DUE ||
    instance.status === SessionStatus.UPCOMING;
  const canSnooze = instance.snoozeCount < maxSnoozeCount;
  const scheduledTime = format(new Date(instance.scheduledAt), 'h:mm a');
  const practiceInfo = getPracticeTypeInfo(session.practiceType);

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.orderBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.orderText}>{session.order}</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{session.title}</Text>
            <Text style={styles.time}>{scheduledTime}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowInfo(!showInfo)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.infoButtonText, showInfo && styles.infoButtonActive]}>
              {showInfo ? '−' : '○'}
            </Text>
          </TouchableOpacity>
          {instance.status === SessionStatus.COMPLETED && onShare ? (
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
              onPress={onShare}
            >
              <Text style={styles.statusText}>{getStatusLabel(instance.status)}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{getStatusLabel(instance.status)}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.prompt}>{session.shortPrompt}</Text>

      {showInfo && (
        <View style={styles.infoPanel}>
          <Text style={styles.infoPracticeType}>{practiceInfo.name}</Text>
          <Text style={styles.infoEssence}>{practiceInfo.essence}</Text>
          <Text style={styles.infoDescription}>{practiceInfo.description}</Text>
          {practiceInfo.whyThisTime && (
            <Text style={styles.infoWhyTime}>{practiceInfo.whyThisTime}</Text>
          )}
        </View>
      )}

      {isActive && isNextSession && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            {canSnooze && instance.status === SessionStatus.DUE && (
              <View style={styles.snoozeContainer}>
                {snoozeOptions.map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={styles.snoozeButton}
                    onPress={() => onSnooze(minutes)}
                  >
                    <Text style={styles.snoozeText}>+{minutes}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={onStart}
            >
              <Text style={styles.buttonTextPrimary}>Begin</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isActive && !isNextSession && (
        <View style={styles.earlyActions}>
          <TouchableOpacity style={styles.repeatButton} onPress={onStart}>
            <Text style={styles.repeatText}>Practice Early</Text>
          </TouchableOpacity>
        </View>
      )}

      {instance.status === SessionStatus.COMPLETED && (
        <View style={styles.earlyActions}>
          <TouchableOpacity style={styles.repeatButton} onPress={onStart}>
            <Text style={styles.repeatText}>Practice Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {(instance.status === SessionStatus.MISSED || instance.status === SessionStatus.SKIPPED) && (
        <View style={styles.missedActions}>
          <Text style={styles.missedText}>
            {instance.status === SessionStatus.MISSED
              ? 'The window has passed.'
              : 'Skipped for today.'}
          </Text>
          <TouchableOpacity style={styles.repeatButton} onPress={onStart}>
            <Text style={styles.repeatText}>Practice Anyway</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  cardActive: {
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  orderText: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  time: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButtonText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.lg,
  },
  infoButtonActive: {
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  infoPanel: {
    backgroundColor: colors.charcoal,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoPracticeType: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  infoEssence: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  infoDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
    marginBottom: spacing.sm,
  },
  infoWhyTime: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
  },
  prompt: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonPrimary: {
    backgroundColor: colors.buttonPrimary,
  },
  buttonTextPrimary: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  snoozeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  snoozeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.buttonSecondary,
  },
  snoozeText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  skipButton: {
    paddingVertical: spacing.xs,
    marginLeft: spacing.sm,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
  completedActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedText: {
    color: colors.completed,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
  },
  missedActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earlyActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  missedText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
    flex: 1,
  },
  repeatButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  repeatText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
});
