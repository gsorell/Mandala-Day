import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Image,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';

type RouteProps = RouteProp<RootStackParamList, 'MandalaComplete'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * MANDALA COMPLETE SCREEN
 *
 * Displayed when the user completes all six daily meditations.
 * A shareable celebration of their full mandala achievement.
 */

export const MandalaCompleteScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { date } = route.params;
  const shareCardRef = useRef<View>(null);

  const dateObj = parseISO(date);
  const displayDate = format(dateObj, 'MMMM d, yyyy');
  const isToday = format(new Date(), 'yyyy-MM-dd') === date;

  const handleShare = async () => {
    const shareText = `May this merit extend to all 🙏\n\nA day's practice complete.\n\nJoin me: https://mandaladay.netlify.app`;

    try {
      if (Platform.OS === 'web') {
        const html2canvas = (await import('html2canvas')).default;
        const element = shareCardRef.current;

        if (element) {
          const canvas = await html2canvas(element as any);
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], 'mandala-complete.png', { type: 'image/png' });

              if (navigator.share && navigator.canShare?.({ files: [file] })) {
                try {
                  await navigator.share({
                    title: 'Mandala Day',
                    text: shareText,
                    files: [file],
                  });
                  return;
                } catch (err: any) {
                  if (err.name !== 'AbortError') {
                    console.error('Share failed:', err);
                  }
                }
              }

              // Fallback: download image and copy text
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'mandala-complete.png';
              a.click();
              URL.revokeObjectURL(url);

              await navigator.clipboard.writeText(shareText);
              alert('Image downloaded and text copied to clipboard');
            }
          });
        }
      } else {
        // Native: Capture the card as an image and share
        const uri = await captureRef(shareCardRef, {
          format: 'png',
          quality: 1,
        });

        const RNShare = await import('react-native-share');

        await RNShare.default.open({
          message: shareText,
          url: `file://${uri}`,
          type: 'image/png',
        });
      }
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleReturn = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleReturn}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Share Card */}
        <View style={styles.shareCard} ref={shareCardRef}>
          {/* Mandala watermark */}
          <Image
            source={require('../../assets/mandala-icon-display.png')}
            style={styles.watermark}
          />

          <View style={styles.cardContent}>
            {/* Lotus symbol */}
            <Text style={styles.lotusSymbol}>❁</Text>

            <Text style={styles.completedLabel}>Mandala Complete</Text>

            <Text style={styles.mainTitle}>Six Sessions to Honor the Day</Text>

            {/* Decorative divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerOrnament}>✦</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.blessing}>
              "May this merit extend to all."
            </Text>

            <Text style={styles.dateText}>{displayDate}</Text>

            <Text style={styles.branding}>MandalaDay</Text>
          </View>
        </View>

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
    borderWidth: 1,
    borderColor: colors.completeMandala,
    ...shadows.depth,
  },
  watermark: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    top: '-10%',
    left: '-10%',
    opacity: 0.1,
    resizeMode: 'contain',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 1,
  },
  lotusSymbol: {
    fontSize: 40,
    color: colors.completeMandala,
    marginBottom: spacing.md,
  },
  completedLabel: {
    color: colors.completeMandala,
    fontSize: typography.fontSizes.xs,
    letterSpacing: typography.letterSpacing.spacious,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  mainTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
    lineHeight: typography.fontSizes.xxl * typography.lineHeights.tight,
    marginBottom: spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    width: '60%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.completeMandala,
    opacity: 0.4,
  },
  dividerOrnament: {
    color: colors.completeMandala,
    fontSize: typography.fontSizes.xs,
    marginHorizontal: spacing.sm,
    opacity: 0.8,
  },
  blessing: {
    color: colors.accent,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    opacity: 0.9,
  },
  dateText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.lg,
  },
  branding: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    letterSpacing: typography.letterSpacing.relaxed,
    position: 'absolute',
    bottom: spacing.lg,
  },
  actions: {
    width: '100%',
    maxWidth: 340,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  shareButton: {
    backgroundColor: colors.completeMandala,
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
