/**
 * Animation Constants and Configuration for Championship-Level Polish
 * 
 * This file centralizes all animation parameters for the BabyTrack app,
 * ensuring consistent delightful micro-interactions across all activity cards.
 */

// Spring configurations for different interaction types
export const springConfigs = {
  // Gentle bounce for card expansions and main interactions
  gentle: {
    damping: 15,
    mass: 1,
    stiffness: 150,
    overshootClamping: false,
  },

  // Bouncy for celebration and positive feedback
  bouncy: {
    damping: 12,
    mass: 0.8,
    stiffness: 200,
    overshootClamping: false,
  },

  // Snappy for quick UI feedback
  snappy: {
    damping: 20,
    mass: 0.5,
    stiffness: 300,
    overshootClamping: false,
  },

  // Soft for sensitive interactions (nursing, comfort ratings)
  soft: {
    damping: 18,
    mass: 1.2,
    stiffness: 120,
    overshootClamping: false,
  },
} as const;

// Timing configurations for different animation types
export const timingConfigs = {
  // Quick feedback for press interactions
  quick: { duration: 150 },
  
  // Medium for state transitions
  medium: { duration: 300 },
  
  // Slow for emphasis and celebration
  slow: { duration: 500 },
  
  // Heartbeat timing for active states
  heartbeat: { duration: 1000 },
  
  // Liquid flow for bottle feeding
  liquidFlow: { duration: 1200 },
  
  // Nurturing pulse for nursing
  nurturingPulse: { duration: 1500 },
  
  // Rhythmic for pumping
  rhythmic: { duration: 800 },
} as const;

// Activity-specific animation characteristics
export const activityAnimations = {
  nursing: {
    // Warm, nurturing animations with gentle pulses
    pulseScale: { from: 1, to: 1.03 },
    glowIntensity: 0.3,
    timing: timingConfigs.nurturingPulse,
    spring: springConfigs.soft,
    celebrationScale: 1.15,
  },

  bottle: {
    // Flowing, liquid-like transitions
    pulseScale: { from: 0.9, to: 1 },
    glowIntensity: 0.4,
    timing: timingConfigs.liquidFlow,
    spring: springConfigs.bouncy,
    celebrationScale: 1.2,
  },

  pumping: {
    // Rhythmic, efficient feeling
    pulseScale: { from: 0.98, to: 1.05 },
    glowIntensity: 0.25,
    timing: timingConfigs.rhythmic,
    spring: springConfigs.snappy,
    celebrationScale: 1.1,
  },

  sleep: {
    // Peaceful, cloud-like softness
    pulseScale: { from: 1, to: 1.02 },
    glowIntensity: 0.2,
    timing: { duration: 2000 },
    spring: springConfigs.gentle,
    celebrationScale: 1.08,
  },

  nappy: {
    // Quick, cheerful bounces
    pulseScale: { from: 0.95, to: 1.05 },
    glowIntensity: 0.35,
    timing: timingConfigs.quick,
    spring: springConfigs.bouncy,
    celebrationScale: 1.25,
  },

  activities: {
    // Playful, energetic movements (tummy time, etc.)
    pulseScale: { from: 0.98, to: 1.04 },
    glowIntensity: 0.3,
    timing: timingConfigs.medium,
    spring: springConfigs.bouncy,
    celebrationScale: 1.15,
  },
} as const;

// Scale values for different interaction states
export const scaleStates = {
  // Button press feedback
  pressIn: 0.95,
  pressOut: 1.02,
  rest: 1,

  // Card interaction feedback  
  cardPressIn: 0.98,
  cardPressOut: 1.01,
  cardExpanded: 1.02,

  // Timer states
  timerStart: 1.15,
  timerRunning: 1.05,
  timerPaused: 0.98,
  timerComplete: 1.2,

  // Star rating feedback
  starPress: 1.3,
  starRest: 1,

  // Volume button liquid fill
  volumePress: 1.1,
  volumeRest: 1,
} as const;

// Color opacity values for glow effects
export const glowOpacities = {
  inactive: 0,
  subtle: 0.1,
  active: 0.3,
  emphasis: 0.5,
  celebration: 0.6,
} as const;

// Shadow configurations for depth
export const shadowConfigs = {
  card: {
    collapsed: {
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    expanded: {
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
  },
  
  button: {
    rest: {
      shadowOpacity: 0.1,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    },
    pressed: {
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
  },

  timer: {
    inactive: {
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
    },
    active: {
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
  },
} as const;

// Sequence patterns for complex animations
export const animationSequences = {
  // Card expansion celebration
  cardExpansion: [
    { scale: 0.98, duration: 100 },
    { scale: 1.05, duration: 200 },
    { scale: 1, duration: 150 },
  ],

  // Button press feedback
  buttonPress: [
    { scale: scaleStates.pressIn, duration: 100 },
    { scale: scaleStates.pressOut, duration: 150 },
    { scale: scaleStates.rest, duration: 100 },
  ],

  // Timer start celebration
  timerStart: [
    { scale: 0.9, duration: 150 },
    { scale: 1.2, duration: 300 },
    { scale: 1.05, duration: 200 },
  ],

  // Session completion fireworks
  sessionComplete: [
    { scale: 1.3, duration: 200 },
    { scale: 0.95, duration: 150 },
    { scale: 1, duration: 250 },
  ],

  // Comfort star celebration
  starCelebration: [
    { scale: 1.4, duration: 150 },
    { scale: 0.95, duration: 100 },
    { scale: 1, duration: 200 },
  ],
} as const;

// Activity type to emoji mapping for consistency
export const activityEmojis = {
  nursing: '🤱',
  bottle: '🍼',
  pumping: '🔄',
  sleep: '😴',
  nappy: '👶',
  activities: '🤸',
} as const;

// Helper function to get activity-specific animation config
export const getActivityAnimation = (activityType: keyof typeof activityAnimations) => {
  return activityAnimations[activityType] || activityAnimations.activities;
};

// Helper function to create spring animation with activity-specific config
export const createActivitySpring = (activityType: keyof typeof activityAnimations, value: number) => {
  const config = getActivityAnimation(activityType);
  return { value, config: config.spring };
};

// Helper function to create timing animation with activity-specific config
export const createActivityTiming = (activityType: keyof typeof activityAnimations, value: number) => {
  const config = getActivityAnimation(activityType);
  return { value, config: config.timing };
};