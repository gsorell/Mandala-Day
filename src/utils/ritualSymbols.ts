/**
 * RITUAL SYMBOLS & SACRED GEOMETRY
 * 
 * Symbol system for the six daily sessions.
 * These are not "icons" - they are visual dharma markers.
 * Each symbol points to the quality of practice.
 */

import { PracticeType } from '../types';

// Symbol definitions (for use with custom glyphs or SVG paths)
export const sessionSymbols = {
  session1_waking_view: {
    name: 'View',
    glyph: '◯', // Open circle - awareness without center
    description: 'Emptiness, openness, the view before form',
    geometry: 'circle',
    practiceType: PracticeType.SHAMATHA,
  },
  session2_embodying_presence: {
    name: 'Body',
    glyph: '▽', // Downward triangle - descent into form
    description: 'Grounding, embodiment, earth element',
    geometry: 'triangle-down',
    practiceType: PracticeType.BODY_AWARENESS,
  },
  session3_compassion_activation: {
    name: 'Heart',
    glyph: '⬡', // Hexagon with center dot - radiating presence
    description: 'Opening, compassion, the heart center',
    geometry: 'hexagon',
    practiceType: PracticeType.COMPASSION,
  },
  session4_cutting_through: {
    name: 'Recognition',
    glyph: '●', // Solid dot - direct pointing, the bindhu
    description: 'Awareness recognizing itself, the point',
    geometry: 'dot',
    practiceType: PracticeType.DIRECT_AWARENESS,
  },
  session5_integration_motion: {
    name: 'Movement',
    glyph: '⊚', // Circle with horizontal line - axis in motion
    description: 'Integration, awareness in activity',
    geometry: 'circle-line',
    practiceType: PracticeType.MOVEMENT,
  },
  session6_dissolution_rest: {
    name: 'Dissolution',
    glyph: '◌', // Broken circle - form dissolving
    description: 'Release, rest, returning to space',
    geometry: 'circle-open',
    practiceType: PracticeType.DISSOLUTION,
  },
} as const;

// Mandala structure - triadic grouping
export const mandalaStructure = {
  upper: {
    name: 'View & Insight',
    description: 'Recognition of awareness',
    sessions: ['session1_waking_view', 'session4_cutting_through'],
    symbolism: 'Sky, space, primordial awareness',
  },
  middle: {
    name: 'Embodiment & Heart',
    description: 'Presence in form',
    sessions: ['session2_embodying_presence', 'session3_compassion_activation'],
    symbolism: 'Earth, body, compassionate engagement',
  },
  lower: {
    name: 'Integration & Rest',
    description: 'Activity and dissolution',
    sessions: ['session5_integration_motion', 'session6_dissolution_rest'],
    symbolism: 'Movement, rest, completion',
  },
} as const;

// Visual markers for different states
export const stateMarkers = {
  current: {
    symbol: '◉', // Filled circle with outer ring
    meaning: 'Present moment, now',
  },
  threshold: {
    symbol: '│', // Vertical line
    meaning: 'Liminal space, before/after',
  },
  completion: {
    symbol: '⋯', // Horizontal ellipsis
    meaning: 'Continuity, practice continues',
  },
  pause: {
    symbol: '॰', // Sanskrit pause mark (dandas)
    meaning: 'Rest, silence, space',
  },
} as const;

// Sacred geometry ratios (for sizing and spacing)
export const sacredRatios = {
  phi: 1.618, // Golden ratio (φ)
  sqrt2: 1.414, // Silver ratio (√2)
  sqrt3: 1.732, // Vesica piscis (√3)
  phiInverse: 0.618, // 1/φ
  
  // Use these for proportional spacing
  // e.g., if base unit is 16px:
  // major: 16 * 1.618 = ~26px
  // minor: 16 * 0.618 = ~10px
} as const;

// Yantra-inspired layout values
export const yantraLayout = {
  // Nested squares progression (each slightly larger)
  innerSquare: 1.0,
  middleSquare: 1.2,
  outerSquare: 1.44, // (1.2)²
  
  // Mandala containment rings
  centerPoint: 0.1, // Bindhu
  innerCircle: 0.4, // Core practice
  middleCircle: 0.7, // Daily mandala
  outerCircle: 1.0, // Full container
} as const;

// Helper to get symbol for a session
export const getSessionSymbol = (sessionId: string) => {
  return sessionSymbols[sessionId as keyof typeof sessionSymbols] || null;
};

// Helper to get mandala region for a session
export const getMandalaRegion = (sessionId: string) => {
  if (mandalaStructure.upper.sessions.includes(sessionId as any)) return 'upper';
  if (mandalaStructure.middle.sessions.includes(sessionId as any)) return 'middle';
  if (mandalaStructure.lower.sessions.includes(sessionId as any)) return 'lower';
  return null;
};

// Color assignments per region (using theme colors)
export const regionColors = {
  upper: 'lapis', // Deep blue for view/insight
  middle: 'agedBrass', // Brass for embodiment/heart
  lower: 'saffron', // Muted saffron for integration/rest
} as const;
