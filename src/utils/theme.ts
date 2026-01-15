// RITUAL PALETTE - aged, monastic, contemplative
export const colors = {
  // Primary ritual palette
  ritualNight: '#0f0f1a', // Deep indigo-black (main background)
  ritualVoid: '#1a1a2e', // Void space (secondary background)
  ritualSurface: '#252535', // Raised surfaces
  ritualThreshold: '#2d2d42', // Liminal spaces

  // Sacred metals (aged, not bright)
  agedBrass: '#B8945F', // Primary accent - old brass, desaturated gold
  tarnishedGold: '#9B7D4F', // Darker brass for hover states
  ashWhite: '#E8E6E3', // Bone white, not pure
  moonstone: '#C8C6C3', // Softened white for secondary text

  // Ritual markers
  saffron: '#CC9966', // Muted saffron for emphasis
  lapis: '#3E5A7E', // Deep blue for subtle contrast
  charcoal: '#3a3a4a', // Warm charcoal for borders

  // Text hierarchy
  textPrimary: '#E8E6E3', // Ash white
  textSecondary: '#B8B6B3', // Softened
  textTertiary: '#8B8985', // Muted
  textRitual: '#9B7D4F', // Brass for sacred moments

  // Status colors - non-optimizing, non-alarming
  passed: '#5a5a6a', // Neutral gray-violet
  upcoming: '#4a5a6a', // Soft blue-gray
  complete: '#6a7a6a', // Muted sage (not "success" green)
  
  // Geometry colors (for sacred shapes)
  geometryPrimary: '#B8945F', // Aged brass
  geometrySecondary: '#3a3a4a', // Charcoal
  geometryFaint: 'rgba(184, 148, 95, 0.1)', // Nearly invisible brass

  // Overlays and veils
  veil: 'rgba(15, 15, 26, 0.85)', // Ritual night veil
  threshold: 'rgba(45, 45, 66, 0.6)', // Liminal overlay
  
  // Legacy/compatibility
  primary: '#6B5B95',
  accent: '#B8945F',
  background: '#0f0f1a',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// RITUAL TYPOGRAPHY - slow, deliberate, monumental
export const typography = {
  fontSizes: {
    micro: 10, // Subtle glyphs
    xs: 12, // Metadata
    sm: 14, // Secondary text
    md: 16, // Body
    lg: 18, // Session titles
    xl: 22, // Screen headers
    xxl: 28, // Timer numbers (monumental)
    xxxl: 40, // Arrival screen
    ritual: 56, // Sacred moments
  },
  fontWeights: {
    light: '300' as const, // Prompts, instructions
    normal: '400' as const, // Body text
    medium: '500' as const, // Titles
    semibold: '600' as const, // Emphasis
    bold: '700' as const, // Rare, for timer
  },
  lineHeights: {
    compressed: 1.1, // Timer numbers
    tight: 1.3, // Titles
    normal: 1.5, // Body
    relaxed: 1.75, // Instructions
    spacious: 2.0, // Contemplative text
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    relaxed: 0.5, // Session titles
    spacious: 1.5, // Small caps, ritual text
    wide: 3, // Sparse emphasis
  },
};

// SACRED GEOMETRY - subtle structure, not decoration
export const geometry = {
  // Border radius - moving toward squares and octagons
  corners: {
    none: 0,
    subtle: 2, // Nearly square
    soft: 6, // Softened square
    medium: 12, // Current cards
    round: 24, // Circles, pills
    full: 9999, // Perfect circles
  },
  
  // Mandala proportions (based on √2, φ ratios)
  mandala: {
    center: 1,
    innerRing: 1.414, // √2
    outerRing: 1.618, // Golden ratio φ
  },
  
  // Line weights for thresholds and dividers
  lines: {
    hair: 0.5, // Nearly invisible
    thin: 1, // Subtle divider
    ritual: 2, // Threshold marker
    emphasis: 3, // Rare, for sacred geometry
  },
  
  // Sacred shapes (opacity values for subtle presence)
  opacity: {
    whisper: 0.03, // Background geometry
    presence: 0.08, // Subtle structure
    visible: 0.15, // Clear but not dominant
    emphasis: 0.3, // Active state
  },
};

// Spacing - vertical rhythm for ritual cadence
export const spacing = {
  hair: 2, // Minimal separation
  xs: 4, // Tight
  sm: 8, // Close
  md: 16, // Standard
  lg: 24, // Breathing room
  xl: 40, // Section break
  xxl: 64, // Major threshold
  ritual: 96, // Sacred pause
  
  // Vertical rhythm (multiples of 8 for consistency)
  rhythm: {
    beat: 8,
    measure: 16,
    phrase: 32,
    verse: 64,
  },
};

// RITUAL MOTION - breath, settling, dissolving
export const motion = {
  // Duration - everything slow, deliberate
  duration: {
    instant: 0, // No animation
    breath: 400, // Quick inhale
    settle: 800, // Body settling
    dissolve: 1200, // Fade out
    ritual: 2000, // Sacred transition
  },
  
  // Easing - organic, not mechanical
  easing: {
    natural: 'ease-in-out', // Default
    arrive: 'ease-out', // Fade in
    depart: 'ease-in', // Fade out
    breath: 'cubic-bezier(0.4, 0, 0.2, 1)', // Slight acceleration
  },
};

// Shadows - soft, not elevated (platform-agnostic)
export const shadows = {
  none: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  whisper: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  presence: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  depth: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
};

// Default schedule times
export const DEFAULT_SCHEDULE_TIMES: Record<string, string> = {
  session1_waking_view: '07:00',
  session2_embodying_presence: '10:00',
  session3_compassion_activation: '12:00',
  session4_cutting_through: '15:00',
  session5_integration_motion: '18:00',
  session6_dissolution_rest: '21:00',
};

// Default snooze options in minutes
export const DEFAULT_SNOOZE_OPTIONS = [5, 10, 15];

// Grace window in minutes (how long after scheduled time before marking as missed)
export const DEFAULT_GRACE_WINDOW = 30;

// Maximum snooze count
export const MAX_SNOOZE_COUNT = 3;

// Session duration in seconds
export const SESSION_DURATION_SEC = 600;

// Storage keys
export const STORAGE_KEYS = {
  USER_SCHEDULE: '@mandala_day/user_schedule',
  APP_SETTINGS: '@mandala_day/app_settings',
  DAILY_INSTANCES: '@mandala_day/daily_instances',
  EVENT_LOG: '@mandala_day/event_log',
};

// =============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// =============================================================================
// These maintain compatibility with existing components while we migrate
// to the new ritual design system

export const borderRadius = {
  sm: geometry.corners.subtle,
  md: geometry.corners.soft,
  lg: geometry.corners.medium,
  xl: geometry.corners.round,
  full: geometry.corners.full,
};

// Add legacy color aliases for existing components
colors.cardBackground = colors.ritualSurface;
colors.surface = colors.ritualSurface;
colors.surfaceLight = colors.ritualThreshold;
colors.primaryLight = colors.agedBrass;
colors.textMuted = colors.textTertiary;
colors.buttonPrimary = colors.agedBrass;
colors.buttonSecondary = colors.charcoal;
colors.due = colors.upcoming;
colors.completed = colors.complete;
colors.skipped = colors.passed;
colors.missed = colors.passed;

// Map old shadow names to new ones
shadows.sm = shadows.whisper;
shadows.md = shadows.presence;
shadows.lg = shadows.depth;
