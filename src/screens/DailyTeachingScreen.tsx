import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { RootStackParamList } from '../types';
import {
  TEACHINGS,
  TEACHINGS_ATTRIBUTION_NOTE,
  teachingForDate,
} from '../data/teachings';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';

// Opened either from the daily notification (which passes the index it was built
// with, so the screen shows the teaching the user actually read) or from the app,
// in which case it falls back to today's.
export const DailyTeachingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'DailyTeaching'>>();
  const shareCardRef = useRef<View>(null);

  const index = route.params?.index;
  const teaching =
    index !== undefined && index >= 0 && index < TEACHINGS.length
      ? TEACHINGS[index]
      : teachingForDate();

  // Same share card as SessionCompleteScreen: a fixed 4:5 box whose type scales
  // with its own width, so the composition holds on narrow devices and in the
  // rendered share image.
  const CARD_DESIGN_WIDTH = 340;
  const [cardWidth, setCardWidth] = useState(CARD_DESIGN_WIDTH);
  const cardScale = Math.min(1, cardWidth / CARD_DESIGN_WIDTH);
  const sc = (n: number) => Math.round(n * cardScale);

  const displayDate = format(new Date(), 'MMMM d, yyyy');

  // Mirrors SessionCompleteScreen's handleShare. The teaching goes out without
  // quotation marks — these are renderings rather than verbatim quotes (see
  // TEACHINGS_ATTRIBUTION_NOTE).
  const handleShare = async () => {
    const shareText = `Thinking of you 🙏\n\n${teaching.teaching}\n— ${teaching.source}\n\nJoin me: https://mandaladay.netlify.app`;

    try {
      if (Platform.OS === 'web') {
        // Web/PWA: Capture card as image and share using Web Share API
        const html2canvas = (await import('html2canvas')).default;
        const element = shareCardRef.current;

        if (element) {
          const canvas = await html2canvas(element as any);
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], 'daily-teaching.png', { type: 'image/png' });

              // Check if Web Share API with files is supported
              if (navigator.share && navigator.canShare?.({ files: [file] })) {
                try {
                  await navigator.share({
                    title: 'MandalaDay',
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
              a.download = 'daily-teaching.png';
              a.click();
              URL.revokeObjectURL(url);

              await navigator.clipboard.writeText(shareText);
              alert('Image downloaded and text copied to clipboard');
            }
          });
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
          message: shareText,
          url: `file://${uri}`,
          type: 'image/png',
        });
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error?.message !== 'User did not share') {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        pinchGestureEnabled={false}
        maximumZoomScale={1}
        minimumZoomScale={1}
      >
        {/* Share Card - The shareable visual */}
        <View
          style={styles.shareCard}
          ref={shareCardRef}
          onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
        >
          {/* Subtle mandala watermark */}
          <Image
            source={require('../../assets/mandala-icon-display.png')}
            style={styles.watermark}
            resizeMode="contain"
          />

          {/* Content overlay */}
          <View style={[styles.cardContent, { paddingHorizontal: sc(spacing.xl), paddingTop: sc(spacing.lg), paddingBottom: sc(spacing.lg) }]}>
            <View style={styles.cardContentInner}>
              <Text style={[styles.cardLabel, { fontSize: sc(typography.fontSizes.xs), marginBottom: sc(spacing.lg) }]}>Daily Teaching</Text>

              <Text
                style={[styles.teaching, {
                  fontSize: sc(typography.fontSizes.xl),
                  lineHeight: sc(typography.fontSizes.xl * typography.lineHeights.normal),
                  marginBottom: sc(spacing.lg),
                }]}
                numberOfLines={7}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {teaching.teaching}
              </Text>

              {/* Decorative divider */}
              <View style={[styles.divider, { marginBottom: sc(spacing.md) }]}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerOrnament}>✦</Text>
                <View style={styles.dividerLine} />
              </View>

              <Text
                style={[styles.source, {
                  fontSize: sc(typography.fontSizes.md),
                  lineHeight: sc(typography.fontSizes.md * typography.lineHeights.normal),
                  marginBottom: sc(spacing.md),
                }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {teaching.source}
              </Text>

              <Text style={[styles.dateText, { fontSize: sc(typography.fontSizes.xs) }]}>{displayDate}</Text>
            </View>

            <Text style={[styles.branding, { fontSize: sc(typography.fontSizes.xs), marginTop: sc(spacing.md) }]}>mandaladay.netlify.app</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sitButton}
            onPress={() => navigation.navigate('SimpleTimer', {})}
          >
            <Text style={styles.sitButtonText}>Sit with this</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.attribution}>{TEACHINGS_ATTRIBUTION_NOTE}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: typography.fontSizes.md,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
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
    opacity: 0.08,
    resizeMode: 'contain',
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    zIndex: 1,
  },
  cardContentInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    // See SessionCompleteScreen: lets the stack shrink inside the fixed 4:5 box
    // and clips any residual spill rather than painting over the branding line.
    minHeight: 0,
    overflow: 'hidden',
  },
  cardLabel: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    letterSpacing: typography.letterSpacing.spacious,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  teaching: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.light,
    textAlign: 'center',
    lineHeight: typography.fontSizes.xl * typography.lineHeights.normal,
    marginBottom: spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '60%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.charcoal,
  },
  dividerOrnament: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    marginHorizontal: spacing.sm,
    opacity: 0.6,
  },
  source: {
    color: colors.accent,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.md * typography.lineHeights.normal,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    opacity: 0.9,
  },
  dateText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
  },
  branding: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    letterSpacing: typography.letterSpacing.relaxed,
    marginTop: spacing.md,
    flexShrink: 0,
  },
  actions: {
    width: '100%',
    maxWidth: 340,
    marginTop: spacing.lg,
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
  sitButton: {
    backgroundColor: colors.ritualSurface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  sitButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
  },
  attribution: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    lineHeight: typography.fontSizes.xs * typography.lineHeights.normal,
    textAlign: 'center',
    maxWidth: 340,
    marginTop: spacing.lg,
  },
});
