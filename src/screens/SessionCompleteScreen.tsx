import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Share,
  Image,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { useApp } from '../context/AppContext';
import { RootStackParamList, SessionStatus } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';

type RouteProps = RouteProp<RootStackParamList, 'SessionComplete'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SessionCompleteScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { todayInstances } = useApp();
  const { sessionTitle, dedication, completedAt } = route.params;
  const shareCardRef = useRef<View>(null);

  // Use completedAt if provided (viewing past completion), otherwise use current time
  const isViewingPast = !!completedAt;
  const completionDate = completedAt ? parseISO(completedAt) : new Date();
  const displayDate = format(completionDate, 'MMMM d, yyyy');
  const displayTime = format(completionDate, 'h:mm a');

  // Check if all sessions for today are complete (only for fresh completions)
  const allSessionsComplete = !isViewingPast && todayInstances.length > 0 &&
    todayInstances.every((instance) => instance.status === SessionStatus.COMPLETED);

  const handleShare = async () => {
    const shareText = dedication
      ? `I just completed a ten minute meditation with MandalaDay.\n\n${sessionTitle}\n"${dedication}"\n\nhttps://mandaladay.netlify.app`
      : `I just completed a ten minute meditation with MandalaDay.\n\n${sessionTitle}\n\nhttps://mandaladay.netlify.app`;

    try {
      if (Platform.OS === 'web') {
        // Web: Use Web Share API if available, otherwise copy to clipboard
        if (navigator.share) {
          await navigator.share({
            title: 'MandalaDay',
            text: shareText,
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          alert('Copied to clipboard');
        }
      } else {
        // Native: Capture the card as an image and share with text using react-native-share
        const uri = await captureRef(shareCardRef, {
          format: 'png',
          quality: 1,
        });

        // Dynamically import react-native-share only on native platforms
        const RNShare = await import('react-native-share');
        
        await RNShare.default.open({
          title: 'Share Meditation',
          message: shareText,
          url: uri, // Remove file:// prefix - react-native-share handles it
          type: 'image/png',
          subject: 'MandalaDay Meditation Complete',
        });
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error?.message !== 'User did not share') {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleReturn = () => {
    if (isViewingPast) {
      // Go back to previous screen (History or Today)
      navigation.goBack();
    } else {
      // After completing a meditation, reset to main screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button for viewing past completions */}
      {isViewingPast && (
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        {/* Share Card - The shareable visual */}
        <View style={styles.shareCard} ref={shareCardRef}>
          {/* Subtle mandala watermark */}
          <Image
            source={require('../../assets/mandala-icon-display.png')}
            style={styles.watermark}
          />

          {/* Content overlay */}
          <View style={styles.cardContent}>
            <Text style={styles.completedLabel}>Session Complete</Text>

            <Text style={styles.sessionTitle}>{sessionTitle}</Text>

            {dedication && (
              <Text style={styles.dedication}>"{dedication}"</Text>
            )}

            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{displayDate}</Text>
              <Text style={styles.timeSeparator}>•</Text>
              <Text style={styles.dateText}>{displayTime}</Text>
            </View>

            <Text style={styles.branding}>MandalaDay</Text>
          </View>
        </View>

        {/* Mandala complete message */}
        {allSessionsComplete && (
          <Text style={styles.mandalaCompleteText}>
            Today's mandala is complete.
          </Text>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.returnButton} onPress={handleReturn}>
            <Text style={styles.returnButtonText}>Return</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    zIndex: 10,
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: typography.fontSizes.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  shareCard: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 4 / 5,
    backgroundColor: colors.ritualVoid,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.depth,
  },
  watermark: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    top: '-10%',
    left: '-10%',
    opacity: 0.06,
    resizeMode: 'contain',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 1,
  },
  completedLabel: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    letterSpacing: typography.letterSpacing.spacious,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  sessionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.fontSizes.xxl * typography.lineHeights.tight,
  },
  dedication: {
    color: colors.accent,
    fontSize: typography.fontSizes.lg,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.lg * typography.lineHeights.relaxed,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  timeSeparator: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    marginHorizontal: spacing.sm,
  },
  branding: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    letterSpacing: typography.letterSpacing.relaxed,
    position: 'absolute',
    bottom: spacing.lg,
  },
  mandalaCompleteText: {
    color: colors.accent,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  actions: {
    width: '100%',
    maxWidth: 340,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  shareButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.presence,
  },
  shareButtonText: {
    color: colors.ritualNight,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  returnButton: {
    backgroundColor: colors.ritualSurface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  returnButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
});
