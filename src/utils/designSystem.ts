/**
 * MANDALADAY DESIGN SYSTEM
 * Design Tokens Implementation Guide
 * 
 * This file documents how to use the ritual design tokens
 * to create a contemplative, mandala-based interface.
 */

import { colors, typography, spacing, geometry, motion, shadows } from './theme';
import { sessionSymbols, mandalaStructure, sacredRatios } from './ritualSymbols';

/**
 * =============================================================================
 * 1. COLOR USAGE GUIDE
 * =============================================================================
 */

export const colorGuide = {
  // Backgrounds - layered depth
  screenBackground: colors.ritualNight, // Main background
  cardBackground: colors.ritualSurface, // Session cards
  modalBackground: colors.ritualVoid, // Overlays
  thresholdSpace: colors.ritualThreshold, // Before/after practice
  
  // Text hierarchy
  primaryText: colors.textPrimary, // Session titles, main content
  secondaryText: colors.textSecondary, // Time, metadata
  tertiaryText: colors.textTertiary, // Helper text
  ritualText: colors.textRitual, // Sacred moments (prompts, dedications)
  
  // Interactive elements
  buttonPrimary: colors.agedBrass, // Begin, Start
  buttonSecondary: colors.charcoal, // Skip, secondary actions
  buttonText: colors.ritualNight, // Text on brass buttons
  
  // Accents and emphasis
  accent: colors.agedBrass, // Primary accent
  accentSubtle: colors.saffron, // Secondary emphasis
  accentFaint: colors.geometryFaint, // Background patterns
  
  // Status indicators (non-optimizing)
  passed: colors.passed, // Session has passed
  upcoming: colors.upcoming, // Session upcoming
  complete: colors.complete, // Session completed
  
  // Sacred geometry
  geometryLines: colors.geometryPrimary, // Visible geometry
  geometryFaint: colors.geometryFaint, // Background patterns
  thresholdLine: colors.charcoal, // Dividers
  
  // Overlays
  arrivalScreen: colors.veil, // Semi-transparent overlay for arrival
  modalVeil: colors.threshold, // Modal backgrounds
};

/**
 * =============================================================================
 * 2. TYPOGRAPHY SYSTEM
 * =============================================================================
 */

export const typographyStyles = {
  // Screen headers
  screenTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.medium,
    lineHeight: typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.relaxed,
    color: colors.textPrimary,
  },
  
  // Session cards
  sessionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.medium,
    lineHeight: typography.lineHeights.normal,
    letterSpacing: typography.letterSpacing.relaxed,
    color: colors.textPrimary,
  },
  
  sessionTime: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.normal,
    lineHeight: typography.lineHeights.normal,
    color: colors.textSecondary,
  },
  
  sessionPrompt: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.light,
    lineHeight: typography.lineHeights.relaxed,
    fontStyle: 'italic' as const,
    color: colors.textRitual,
  },
  
  // Timer screen
  timerNumbers: {
    fontSize: typography.fontSizes.ritual,
    fontWeight: typography.fontWeights.bold,
    lineHeight: typography.lineHeights.compressed,
    letterSpacing: typography.letterSpacing.tight,
    color: colors.agedBrass,
  },
  
  // Arrival/threshold screens
  arrivalTitle: {
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.medium,
    lineHeight: typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.normal,
    color: colors.textPrimary,
  },
  
  arrivalPrompt: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.light,
    lineHeight: typography.lineHeights.spacious,
    fontStyle: 'italic' as const,
    color: colors.textRitual,
  },
  
  arrivalInstruction: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.light,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textTertiary,
  },
  
  // Dedication text
  dedication: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.light,
    lineHeight: typography.lineHeights.spacious,
    fontStyle: 'italic' as const,
    letterSpacing: typography.letterSpacing.relaxed,
    color: colors.textRitual,
  },
  
  // Buttons
  buttonPrimary: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    letterSpacing: typography.letterSpacing.relaxed,
    color: colors.ritualNight,
  },
  
  buttonSecondary: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.normal,
    letterSpacing: typography.letterSpacing.normal,
    color: colors.textSecondary,
  },
  
  // Metadata
  metadata: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.normal,
    lineHeight: typography.lineHeights.normal,
    letterSpacing: typography.letterSpacing.spacious,
    textTransform: 'uppercase' as const,
    color: colors.textTertiary,
  },
};

/**
 * =============================================================================
 * 3. SPACING & LAYOUT
 * =============================================================================
 */

export const layoutTokens = {
  // Screen padding
  screenPadding: spacing.lg,
  screenPaddingVertical: spacing.xl,
  
  // Card spacing
  cardPadding: spacing.lg,
  cardMargin: spacing.md,
  cardGap: spacing.sm, // Between cards
  
  // Mandala regions (vertical grouping)
  regionSpacing: spacing.xl, // Space between upper/middle/lower
  sessionSpacing: spacing.md, // Space between sessions in same region
  
  // Threshold spacing
  thresholdTop: spacing.ritual, // Before arrival screen content
  thresholdBottom: spacing.xxl, // After completion
  
  // Button spacing
  buttonPaddingVertical: spacing.md,
  buttonPaddingHorizontal: spacing.xl,
  buttonGap: spacing.sm, // Between stacked buttons
  
  // Sacred geometry spacing (using φ ratio)
  geometricMinor: spacing.md * sacredRatios.phiInverse, // ~10px
  geometricMajor: spacing.md * sacredRatios.phi, // ~26px
};

/**
 * =============================================================================
 * 4. COMPONENT SPECIFICATIONS
 * =============================================================================
 */

// Session card styling
export const sessionCard = {
  container: {
    backgroundColor: colors.ritualSurface,
    borderRadius: geometry.corners.medium,
    borderWidth: geometry.lines.hair,
    borderColor: colors.charcoal,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.whisper,
  },
  
  // Symbol/number circle
  numberCircle: {
    width: 40,
    height: 40,
    borderRadius: geometry.corners.full,
    borderWidth: geometry.lines.thin,
    borderColor: colors.agedBrass,
    backgroundColor: colors.transparent,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  
  // Status badge
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: geometry.corners.round,
    backgroundColor: colors.ritualThreshold,
  },
};

// Button styling
export const buttonStyles = {
  primary: {
    backgroundColor: colors.agedBrass,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: geometry.corners.medium,
    ...shadows.whisper,
  },
  
  secondary: {
    backgroundColor: colors.transparent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: geometry.lines.thin,
    borderColor: colors.charcoal,
    borderRadius: geometry.corners.medium,
  },
  
  text: {
    backgroundColor: colors.transparent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
};

// Timer screen
export const timerScreen = {
  container: {
    backgroundColor: colors.ritualNight,
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  
  timerCircle: {
    width: 240,
    height: 240,
    borderRadius: geometry.corners.full,
    borderWidth: geometry.lines.ritual,
    borderColor: colors.geometryPrimary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    // Add inner ring for nested containment
    position: 'relative' as const,
  },
  
  timerInnerRing: {
    position: 'absolute' as const,
    width: 200,
    height: 200,
    borderRadius: geometry.corners.full,
    borderWidth: geometry.lines.hair,
    borderColor: colors.geometryFaint,
  },
};

// Arrival/threshold screen
export const arrivalScreen = {
  container: {
    backgroundColor: colors.ritualNight,
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.xl,
  },
  
  content: {
    alignItems: 'center' as const,
    maxWidth: 400,
  },
  
  titleSpacing: spacing.xl,
  promptSpacing: spacing.lg,
  instructionSpacing: spacing.xxl,
};

/**
 * =============================================================================
 * 5. ANIMATION TOKENS
 * =============================================================================
 */

export const animations = {
  // Fade in (arrival)
  fadeIn: {
    duration: motion.duration.settle,
    easing: motion.easing.arrive,
  },
  
  // Fade out (departure)
  fadeOut: {
    duration: motion.duration.dissolve,
    easing: motion.easing.depart,
  },
  
  // Press feedback
  press: {
    scale: 0.98,
    duration: motion.duration.breath,
    easing: motion.easing.natural,
  },
  
  // Completion
  complete: {
    duration: motion.duration.ritual,
    easing: motion.easing.natural,
  },
};

/**
 * =============================================================================
 * 6. IMPLEMENTATION NOTES
 * =============================================================================
 */

export const implementationGuide = {
  principles: [
    'Use aged brass sparingly - it should feel precious',
    'Maintain low contrast - no harsh edges',
    'Favor opacity over color changes',
    'All motion should feel organic, never mechanical',
    'Text should breathe - generous line height and spacing',
    'Avoid pure white and pure black',
    'Status indicators should be neutral, not emotional',
    'Sacred geometry should be felt, not seen overtly',
  ],
  
  priorities: [
    '1. Arrival screen - create ritual threshold',
    '2. Timer screen - add inner ring for containment',
    '3. Session cards - integrate symbols and region grouping',
    '4. Color migration - replace old palette systematically',
    '5. Typography - increase letter spacing on titles',
    '6. Motion - slow everything down by 50%',
  ],
};
