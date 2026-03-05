/**
 * Animation Helper Utilities for Championship Polish
 * 
 * This file provides reusable animation utilities that make it easy to add
 * delightful micro-interactions across the BabyTrack app consistently.
 */

import {
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  SharedValue,
  interpolateColor,
} from 'react-native-reanimated';
import {
  springConfigs,
  timingConfigs,
  activityAnimations,
  scaleStates,
} from '../constants/animations';

// Activity types for type safety
export type ActivityType = 'nursing' | 'bottle' | 'pumping' | 'sleep' | 'nappy' | 'activities';

/**
 * Creates a delightful button press animation
 */
export const createButtonPressAnimation = (
  scaleValue: SharedValue<number>,
  onComplete?: () => void
) => {
  scaleValue.value = withSequence(
    withTiming(scaleStates.pressIn, timingConfigs.quick),
    withTiming(scaleStates.pressOut, timingConfigs.quick),
    withTiming(scaleStates.rest, timingConfigs.quick, () => {
      if (onComplete) {
        onComplete();
      }
    })
  );
};

/**
 * Creates an activity-specific celebration animation
 */
export const createCelebrationAnimation = (
  scaleValue: SharedValue<number>,
  activityType: ActivityType,
  onComplete?: () => void
) => {
  const config = activityAnimations[activityType];
  
  scaleValue.value = withSequence(
    withSpring(config.celebrationScale, config.spring),
    withSpring(scaleStates.rest, config.spring, () => {
      if (onComplete) {
        onComplete();
      }
    })
  );
};

/**
 * Creates a continuous pulse animation for active timers
 */
export const createPulseAnimation = (
  pulseValue: SharedValue<number>,
  activityType: ActivityType
) => {
  const config = activityAnimations[activityType];
  
  pulseValue.value = withRepeat(
    withSequence(
      withTiming(config.pulseScale.to, config.timing),
      withTiming(config.pulseScale.from, config.timing)
    ),
    -1,
    true
  );
};

/**
 * Creates a gentle glow animation
 */
export const createGlowAnimation = (
  glowValue: SharedValue<number>,
  activityType: ActivityType,
  intensity: 'subtle' | 'active' | 'emphasis' | 'celebration' = 'active'
) => {
  const config = activityAnimations[activityType];
  let targetIntensity = config.glowIntensity;
  
  switch (intensity) {
    case 'subtle':
      targetIntensity = config.glowIntensity * 0.3;
      break;
    case 'emphasis':
      targetIntensity = config.glowIntensity * 1.5;
      break;
    case 'celebration':
      targetIntensity = config.glowIntensity * 2;
      break;
  }
  
  glowValue.value = withTiming(targetIntensity, config.timing);
};

/**
 * Creates a heartbeat animation for active states
 */
export const createHeartbeatAnimation = (
  heartbeatValue: SharedValue<number>
  // activityType parameter removed as it's not used in implementation
) => {
  heartbeatValue.value = withRepeat(
    withSequence(
      withTiming(1.03, timingConfigs.heartbeat),
      withTiming(1, timingConfigs.heartbeat)
    ),
    -1,
    true
  );
};

/**
 * Creates a liquid fill animation for volume buttons
 */
export const createLiquidFillAnimation = (
  fillValue: SharedValue<number>,
  onComplete?: () => void
) => {
  fillValue.value = withSequence(
    withTiming(1, timingConfigs.medium),
    withTiming(0, timingConfigs.slow, () => {
      if (onComplete) {
        onComplete();
      }
    })
  );
};

/**
 * Creates a star rating celebration animation
 */
export const createStarCelebrationAnimation = (
  scaleValue: SharedValue<number>,
  delay: number = 0
) => {
  scaleValue.value = withSequence(
    withTiming(1, { duration: delay }), // Initial delay
    withSpring(scaleStates.starPress, springConfigs.bouncy),
    withSpring(scaleStates.rest, springConfigs.gentle)
  );
};

/**
 * Creates a card expansion animation with emoji wiggle
 */
export const createCardExpansionAnimation = (
  expansionValue: SharedValue<number>,
  emojiValue: SharedValue<number>,
  onComplete?: () => void
) => {
  // Emoji wiggle for celebration
  emojiValue.value = withSequence(
    withTiming(-5, timingConfigs.quick),
    withTiming(5, timingConfigs.quick),
    withTiming(0, timingConfigs.quick)
  );
  
  // Card expansion with bounce
  expansionValue.value = withSpring(1, springConfigs.bouncy, () => {
    if (onComplete) {
      onComplete();
    }
  });
};

/**
 * Creates a session completion animation with fireworks effect
 */
export const createSessionCompleteAnimation = (
  celebrationValue: SharedValue<number>,
  glowValue: SharedValue<number>,
  _activityType: ActivityType,
  onComplete?: () => void
) => {
  // Fireworks celebration
  celebrationValue.value = withSequence(
    withSpring(1.3, { damping: 6, stiffness: 300 }),
    withSpring(0.95, { damping: 8 }),
    withSpring(1, { damping: 12 }, () => {
      if (onComplete) {
        onComplete();
      }
    })
  );
  
  // Glow burst
  glowValue.value = withSequence(
    withTiming(0.6, timingConfigs.quick),
    withTiming(0, timingConfigs.slow)
  );
};

/**
 * Creates a gentle fade-in animation for content
 */
export const createFadeInAnimation = (
  opacityValue: SharedValue<number>,
  translateValue: SharedValue<number>,
  delay: number = 0
) => {
  opacityValue.value = withSequence(
    withTiming(0, { duration: delay }),
    withSpring(1, springConfigs.gentle)
  );
  
  translateValue.value = withSequence(
    withTiming(10, { duration: delay }),
    withSpring(0, springConfigs.gentle)
  );
};

/**
 * Creates a breathing animation for peaceful states (sleep)
 */
export const createBreathingAnimation = (breathValue: SharedValue<number>) => {
  breathValue.value = withRepeat(
    withSequence(
      withTiming(1.02, { duration: 2000 }),
      withTiming(1, { duration: 2000 })
    ),
    -1,
    true
  );
};

/**
 * Creates a side switching animation for nursing
 */
export const createSideSwitchAnimation = (
  switchValue: SharedValue<number>,
  onComplete?: () => void
) => {
  switchValue.value = withSequence(
    withTiming(0.95, timingConfigs.quick),
    withSpring(1, springConfigs.bouncy, () => {
      if (onComplete) {
        onComplete();
      }
    })
  );
};

/**
 * Helper to create interpolated glow colors
 */
export const createGlowColorInterpolation = (
  glowValue: SharedValue<number>,
  baseColor: string,
  glowColor: string
) => {
  'worklet';
  return interpolateColor(
    glowValue.value,
    [0, 1],
    [baseColor, glowColor]
  );
};

/**
 * Helper to stop all animations on a shared value
 */
export const stopAnimation = (animatedValue: SharedValue<number>) => {
  animatedValue.value = withTiming(animatedValue.value, { duration: 0 });
};

/**
 * Helper to reset all shared values to their default states
 */
export const resetAnimationValues = (values: { [key: string]: SharedValue<number> }) => {
  Object.values(values).forEach(value => {
    value.value = withSpring(1, springConfigs.gentle);
  });
};

/**
 * Creates a comprehensive timer animation set based on activity type
 */
export const createTimerAnimationSet = (activityType: ActivityType) => {
  return {
    // Use these in your component
    createStart: (scaleValue: SharedValue<number>, glowValue: SharedValue<number>, pulseValue: SharedValue<number>) => {
      createCelebrationAnimation(scaleValue, activityType);
      createGlowAnimation(glowValue, activityType, 'active');
      createPulseAnimation(pulseValue, activityType);
    },
    
    createPause: (scaleValue: SharedValue<number>, glowValue: SharedValue<number>, pulseValue: SharedValue<number>) => {
      scaleValue.value = withSequence(
        withTiming(0.95, timingConfigs.quick),
        withTiming(1, timingConfigs.medium)
      );
      glowValue.value = withTiming(0.1, timingConfigs.medium);
      stopAnimation(pulseValue);
    },
    
    createComplete: (celebrationValue: SharedValue<number>, glowValue: SharedValue<number>, pulseValue: SharedValue<number>) => {
      createSessionCompleteAnimation(celebrationValue, glowValue, activityType);
      stopAnimation(pulseValue);
    },
  };
};