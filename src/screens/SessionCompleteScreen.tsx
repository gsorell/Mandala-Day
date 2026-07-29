import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Share,
  Image,
  Linking,
  TextInput,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { useApp } from '../context/AppContext';
import { RootStackParamList, SessionStatus } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { sessionSymbols } from '../utils/ritualSymbols';
import { audioService } from '../services/audio';
import { getGongSound, getGongUri } from '../data/audioAssets';
import { addJournalEntry } from '../services/storage';

type RouteProps = RouteProp<RootStackParamList, 'SessionComplete'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SessionCompleteScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { todayInstances } = useApp();
  const { instanceId, sessionTitle, dedication, shareMessage, completedAt, duration, playEndingGong } = route.params;
  const shareCardRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [noteText, setNoteText] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // The share card is a fixed 4:5 box, so its HEIGHT shrinks with the screen
  // while the type inside it would not — on a 344px-wide device that left the
  // content ~45px taller than the card, and the date row printed on top of the
  // branding line. Scaling the card's type and vertical rhythm by its own width
  // keeps the composition proportional at any size, which is also what you want
  // from something rendered out as a share image.
  const CARD_DESIGN_WIDTH = 340;
  const [cardWidth, setCardWidth] = useState(CARD_DESIGN_WIDTH);
  const cardScale = Math.min(1, cardWidth / CARD_DESIGN_WIDTH);
  const sc = (n: number) => Math.round(n * cardScale);

  // The note input sits below the share card, so the keyboard covers it on open.
  // Scroll it into view once the keyboard has finished animating up.
  useEffect(() => {
    if (!noteOpen) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      const scroll = () => scrollRef.current?.scrollToEnd({ animated: true });
      requestAnimationFrame(scroll);
      // On Android the KeyboardAvoidingView resizes over a couple of frames, so a
      // single rAF can fire before the layout settles — scroll again once it lands.
      if (Platform.OS === 'android') {
        setTimeout(scroll, 150);
      }
    });
    return () => sub.remove();
  }, [noteOpen]);

  const handleSaveNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    Keyboard.dismiss();
    await addJournalEntry({ text, instanceId, sessionTitle });
    setNoteText('');
    setNoteSaved(true);
  };

  // Use completedAt if provided (viewing past completion), otherwise use current time
  const isViewingPast = !!completedAt;
  const completionDate = completedAt ? parseISO(completedAt) : new Date();
  const displayDate = format(completionDate, 'MMMM d, yyyy');
  const displayTime = format(completionDate, 'h:mm a');

  // Get the session symbol from the templateId (instanceId format: "YYYY-MM-DD_templateId")
  const sessionSymbol = instanceId
    ? sessionSymbols[instanceId.split('_').slice(1).join('_') as keyof typeof sessionSymbols]?.glyph || '◯'
    : '◯';

  // Check if all sessions for today are complete (only for fresh completions)
  const allSessionsComplete = !isViewingPast && todayInstances.length > 0 &&
    todayInstances.every((instance) => instance.status === SessionStatus.COMPLETED);

  // Sound the closing gong when arriving from Silent Practice. The PlayerScreen
  // can't play it itself — its unmount cleanup tears down audioService — so we
  // wait until this screen has mounted before starting playback.
  useEffect(() => {
    if (!playEndingGong) return;
    let cancelled = false;
    (async () => {
      try {
        let gongSource: number | { uri: string } = getGongSound();
        if (Platform.OS === 'web') {
          const uri = await getGongUri();
          if (uri) {
            gongSource = { uri };
          }
        }
        if (cancelled) return;
        await audioService.loadAndPlay(gongSource);
      } catch (error) {
        console.error('Failed to play ending gong:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playEndingGong]);

  // Stop any playing audio (e.g., gong) when this screen unmounts
  useEffect(() => {
    return () => {
      audioService.stop();
    };
  }, []);

  const handleShare = async () => {
    // Stop any playing audio (e.g., gong) when user interacts
    audioService.stop();
    const message = shareMessage || 'Thinking of you';
    const shareText = dedication
      ? `${message} 🙏\n\n${sessionTitle}\n"${dedication}"\n\nJoin me: https://mandaladay.netlify.app`
      : `${message} 🙏\n\n${sessionTitle}\n\nJoin me: https://mandaladay.netlify.app`;

    try {
      if (Platform.OS === 'web') {
        // Web/PWA: Capture card as image and share using Web Share API
        const html2canvas = (await import('html2canvas')).default;
        const element = shareCardRef.current;
        
        if (element) {
          const canvas = await html2canvas(element as any);
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], 'meditation-complete.png', { type: 'image/png' });
              
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
              a.download = 'meditation-complete.png';
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

  const handleReturn = () => {
    // Stop any playing audio (e.g., gong) when user navigates away
    audioService.stop();
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
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
              {/* Session symbol */}
              <Text style={[styles.sessionSymbol, { fontSize: sc(28), marginBottom: sc(spacing.sm) }]}>{sessionSymbol}</Text>

              <Text style={[styles.completedLabel, { fontSize: sc(typography.fontSizes.xs), marginBottom: sc(spacing.md) }]}>Session Complete</Text>

              <Text
                style={[styles.sessionTitle, {
                  fontSize: sc(typography.fontSizes.xxl),
                  lineHeight: sc(typography.fontSizes.xxl * typography.lineHeights.tight),
                  marginBottom: sc(spacing.md),
                }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {sessionTitle}
              </Text>

              {duration && (
                <Text style={[styles.durationText, { fontSize: sc(typography.fontSizes.sm), marginBottom: sc(spacing.md), marginTop: -sc(spacing.sm) }]}>{duration} min</Text>
              )}

              {/* Decorative divider */}
              <View style={[styles.divider, { marginBottom: sc(spacing.md) }]}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerOrnament}>✦</Text>
                <View style={styles.dividerLine} />
              </View>

              {dedication && (
                <Text
                  style={[styles.dedication, {
                    fontSize: sc(typography.fontSizes.md),
                    lineHeight: sc(typography.fontSizes.md * typography.lineHeights.normal),
                    marginBottom: sc(spacing.md),
                  }]}
                  numberOfLines={3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  "{dedication}"
                </Text>
              )}

              <View style={styles.dateContainer}>
                <Text style={[styles.dateText, { fontSize: sc(typography.fontSizes.xs) }]}>{displayDate}</Text>
                <Text style={[styles.timeSeparator, { fontSize: sc(typography.fontSizes.xs) }]}>•</Text>
                <Text style={[styles.dateText, { fontSize: sc(typography.fontSizes.xs) }]}>{displayTime}</Text>
              </View>
            </View>

            <Text style={[styles.branding, { fontSize: sc(typography.fontSizes.xs), marginTop: sc(spacing.md) }]}>mandaladay.netlify.app</Text>
          </View>
        </View>

        {/* Mandala complete message */}
        {allSessionsComplete && (
          <Text style={styles.mandalaCompleteText}>
            Today's mandala is complete.
          </Text>
        )}

        {/* Sit longer — keep sitting with a silent timer (fresh completions only) */}
        {!isViewingPast && (
          <View style={styles.sitLonger}>
            <Text style={styles.sitLongerLabel}>Sit longer</Text>
            <View style={styles.sitLongerRow}>
              {[5, 10, 20].map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={styles.sitLongerChip}
                  onPress={() => {
                    audioService.stop();
                    // This screen is a fullScreenModal. Pushing a card-presentation
                    // screen on top of it via navigate() presents *under* the modal
                    // on iOS (react-native-screens), so the tap appeared to do
                    // nothing. Reset the stack instead — the completion modal has
                    // served its purpose, so drop it and land on the timer over Main.
                    navigation.reset({
                      index: 1,
                      routes: [
                        { name: 'Main' },
                        {
                          name: 'SimpleTimer',
                          params: { initialDuration: minutes, autoStart: true },
                        },
                      ],
                    });
                  }}
                >
                  <Text style={styles.sitLongerChipText}>{minutes} min</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Post-sitting note — saved to the running journal (fresh completions only) */}
        {!isViewingPast && (
          <View style={styles.noteBlock}>
            {noteSaved ? (
              <Text style={styles.noteSavedText}>Saved to your journal ✓</Text>
            ) : noteOpen ? (
              <>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Note this sitting…"
                  placeholderTextColor={colors.textTertiary}
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
                {noteText.trim().length > 0 && (
                  <TouchableOpacity style={styles.noteSaveButton} onPress={handleSaveNote}>
                    <Text style={styles.noteSaveButtonText}>Save note</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={styles.noteLink}
                onPress={() => setNoteOpen(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.noteLinkText}>+ Note this sitting</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.returnButton} onPress={handleReturn}>
            <Text style={styles.returnButtonText}>Return</Text>
          </TouchableOpacity>
          {Platform.OS !== 'ios' && (
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.paypal.com/donate/?business=KEY6EUVRF3SPY&no_recurring=0&item_name=If+MandalaDay+has+been+useful+to+you%2C+your+donation+keeps+the+server+lights+on+and+the+development+going.+Thank+you.&currency_code=USD')}
            >
              <Text style={styles.donateLink}>Support this app ↗</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
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
    // The card is a fixed 4:5 box, so this stack can outgrow it on narrow
    // screens (a two-line title at 344px was enough). minHeight lets it
    // actually shrink instead of spilling, and overflow keeps any residual
    // spill clipped inside its own box rather than painted over the branding
    // line below — clipped is recoverable, overlapped is unreadable.
    minHeight: 0,
    overflow: 'hidden',
  },
  sessionSymbol: {
    fontSize: 28,
    color: colors.accent,
    marginBottom: spacing.sm,
    opacity: 0.9,
  },
  completedLabel: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    letterSpacing: typography.letterSpacing.spacious,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  sessionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: typography.fontSizes.xxl * typography.lineHeights.tight,
  },
  durationText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    letterSpacing: typography.letterSpacing.spacious,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
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
  dedication: {
    color: colors.accent,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.md * typography.lineHeights.normal,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    opacity: 0.9,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
  },
  timeSeparator: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    marginHorizontal: spacing.sm,
    opacity: 0.5,
  },
  branding: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    letterSpacing: typography.letterSpacing.relaxed,
    marginTop: spacing.md,
    flexShrink: 0,
  },
  mandalaCompleteText: {
    color: colors.accent,
    fontSize: typography.fontSizes.md,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  sitLonger: {
    width: '100%',
    maxWidth: 340,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  sitLongerLabel: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    letterSpacing: typography.letterSpacing.spacious,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  sitLongerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sitLongerChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.charcoal,
    backgroundColor: colors.ritualSurface,
  },
  sitLongerChipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  noteBlock: {
    width: '100%',
    maxWidth: 340,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  noteLink: {
    paddingVertical: spacing.xs,
  },
  noteLinkText: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
  },
  noteInput: {
    width: '100%',
    minHeight: 72,
    backgroundColor: colors.ritualSurface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.charcoal,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  noteSaveButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.ritualSurface,
    borderWidth: 1,
    borderColor: colors.charcoal,
  },
  noteSaveButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  noteSavedText: {
    color: colors.accent,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
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
  donateLink: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: spacing.xs,
  },
});
