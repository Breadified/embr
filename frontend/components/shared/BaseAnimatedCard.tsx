import React, { useEffect, ReactNode, useState, useRef } from 'react';
import { View, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  interpolateColor,
  SharedValue,
  AnimatedStyleProp,
} from 'react-native-reanimated';

// Enhanced spring animation configuration for championship-level polish
export const springConfig = {
  damping: 25,
  mass: 1,
  stiffness: 250,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

// Smooth expansion spring - less violent but instant
export const bouncySpring = {
  damping: 25,
  mass: 1,
  stiffness: 250,
  overshootClamping: false,
};

// Quick timing for instant feedback
export const quickTiming = {
  duration: 50,
};

// Heartbeat animation for active timers
export const heartbeatConfig = {
  duration: 1000,
};

// Collapsed height is fixed, expanded height is dynamic
const COLLAPSED_HEIGHT = 80;
const MIN_EXPANDED_HEIGHT = 300;
const MAX_EXPANDED_HEIGHT = 800;

export interface BaseAnimatedCardProps {
  // Core expansion state
  isExpanded: boolean;
  onToggleExpanded?: () => void;
  
  // Optional forced expansion state
  forceExpanded?: boolean;
  
  // Animation configs
  collapsedHeight?: number;
  expandedHeight?: number | undefined;
  minExpandedHeight?: number;
  maxExpandedHeight?: number;
  
  // Interaction states
  isActive?: boolean;
  disabled?: boolean;
  
  // Color and styling
  baseColor?: string;
  className?: string;
  
  // Content render props
  renderHeader: (props: HeaderRenderProps) => ReactNode;
  children: ReactNode;
  
  // Animation callbacks
  onExpandStart?: () => void;
  onExpandComplete?: () => void;
  onCollapseStart?: () => void;
  onCollapseComplete?: () => void;
  
  // Press handlers
  onHeaderPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export interface HeaderRenderProps {
  // Animation values for custom styling
  headerStyle: AnimatedStyleProp<ViewStyle>;
  expandIconStyle: AnimatedStyleProp<ViewStyle>;
  emojiStyle: AnimatedStyleProp<ViewStyle>;
  activeIndicatorStyle: AnimatedStyleProp<ViewStyle>;
  
  // State values
  isExpanded: boolean;
  isActive: boolean;
  disabled: boolean;
  
  // Colors
  baseColor: string;
  
  // Press handlers (pre-configured with animations)
  onPressIn: () => void;
  onPressOut: () => void;
}

export interface AnimatedStyleHooks {
  cardStyle: AnimatedStyleProp<ViewStyle>;
  cardBackgroundStyle: AnimatedStyleProp<ViewStyle>;
  headerStyle: AnimatedStyleProp<ViewStyle>;
  expandIconStyle: AnimatedStyleProp<ViewStyle>;
  emojiStyle: AnimatedStyleProp<ViewStyle>;
  contentStyle: AnimatedStyleProp<ViewStyle>;
  activeIndicatorStyle: AnimatedStyleProp<ViewStyle>;
}

export const BaseAnimatedCard: React.FC<BaseAnimatedCardProps> = ({
  isExpanded,
  onToggleExpanded,
  forceExpanded = false,
  collapsedHeight = COLLAPSED_HEIGHT,
  expandedHeight,
  minExpandedHeight = MIN_EXPANDED_HEIGHT,
  maxExpandedHeight = MAX_EXPANDED_HEIGHT,
  isActive = false,
  disabled = false,
  baseColor = '#9CA3AF',
  className = '',
  renderHeader,
  children,
  onExpandStart,
  onExpandComplete,
  onCollapseStart,
  onCollapseComplete,
  onHeaderPress,
  onPressIn,
  onPressOut,
}) => {
  // Dynamic height measurement
  const [measuredHeight, setMeasuredHeight] = useState(expandedHeight || minExpandedHeight);
  const contentRef = useRef<View>(null);
  
  // Core animation values - use direct height animation
  const heightValue = useSharedValue(collapsedHeight);
  const contentOpacity = useSharedValue(0);
  
  // Enhanced micro-interaction animations
  const scaleValue = useSharedValue(1);
  const glowValue = useSharedValue(0);
  const heartbeatValue = useSharedValue(1);
  const emojiRotation = useSharedValue(0);
  const activeGlowOpacity = useSharedValue(0);
  const expandProgress = useSharedValue(0);
  
  // Calculate final expanded state
  const finalIsExpanded = forceExpanded || isExpanded;
  
  // Enhanced expansion animations with delightful polish
  useEffect(() => {
    const targetHeight = expandedHeight || measuredHeight;
    
    if (finalIsExpanded) {
      onExpandStart?.();
      
      // Direct height animation with spring
      heightValue.value = withSpring(targetHeight, bouncySpring);
      
      // Track progress for other animations
      expandProgress.value = withSpring(1, bouncySpring);
      
      // Instant content reveal
      contentOpacity.value = withTiming(1, { duration: 100 });
      
      // Callback after animation
      if (onExpandComplete) {
        setTimeout(onExpandComplete, 300);
      }
    } else {
      onCollapseStart?.();
      
      // Instant collapse
      contentOpacity.value = withTiming(0, { duration: 80 });
      
      // Direct height animation
      heightValue.value = withSpring(collapsedHeight, springConfig);
      
      // Track progress
      expandProgress.value = withSpring(0, springConfig);
      
      // Callback after animation
      if (onCollapseComplete) {
        setTimeout(onCollapseComplete, 300);
      }
    }
  }, [finalIsExpanded, measuredHeight, expandedHeight]);

  // Active state animations - heartbeat + glow for running timers
  useEffect(() => {
    if (isActive && !disabled) {
      // Subtle heartbeat for active timers
      heartbeatValue.value = withRepeat(
        withSequence(
          withTiming(1.01, heartbeatConfig),
          withTiming(1, heartbeatConfig)
        ),
        -1,
        false
      );
      
      // Active glow animation
      activeGlowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 1500 }),
          withTiming(0.1, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      heartbeatValue.value = withTiming(1, { duration: 100 });
      activeGlowOpacity.value = withTiming(0, { duration: 100 });
    }
  }, [isActive, disabled]);

  // Enhanced header press with delightful feedback
  const handleHeaderPress = () => {
    // This is now just a fallback - main logic moved to handlePressIn
    if (disabled || forceExpanded) return;
    onHeaderPress?.();
  };

  // Responsive press feedback - instant expansion on press-in
  const handlePressIn = () => {
    if (disabled) return;
    
    // Immediate visual feedback - no delay
    scaleValue.value = withTiming(0.98, { duration: 50 });
    
    // IMMEDIATE EXPANSION - don't wait for press out!
    if (!forceExpanded) {
      // Call optional external handler first
      onHeaderPress?.();
      
      // Toggle expansion immediately on press-in
      onToggleExpanded?.();
    }
    
    onPressIn?.();
  };

  const handlePressOut = () => {
    if (disabled) return;
    
    // Quick spring back - feels responsive
    scaleValue.value = withSpring(1, { 
      damping: 20,
      stiffness: 300,
      mass: 0.5 
    });
    
    onPressOut?.();
  };

  // Enhanced animated styles with championship polish
  const cardStyle = useAnimatedStyle(() => {
    return {
      height: heightValue.value,
      transform: [{ scale: scaleValue.value * heartbeatValue.value }],
    };
  });

  // Enhanced card background with dynamic coloring
  const cardBackgroundStyle = useAnimatedStyle(() => {
    // Use grey if disabled, otherwise use base color
    const finalColor = disabled ? '#9CA3AF' : baseColor;
    
    // Apply color with slight transparency for content area
    const backgroundOpacity = interpolate(
      expandProgress.value,
      [0, 1],
      [1, 0.95] // Header fully colored, content slightly transparent
    );
    
    return {
      backgroundColor: interpolateColor(
        backgroundOpacity,
        [0.95, 1],
        [`${finalColor}20`, finalColor] // Light tint for expanded content, full color for header
      ),
    };
  });

  // Enhanced header color with proper vibrancy and grey disabled state
  const headerStyle = useAnimatedStyle(() => {
    // Use grey color if disabled, otherwise use vibrant base color
    const finalColor = disabled ? '#9CA3AF' : baseColor;
    
    if (isActive && !disabled) {
      // For active cards, use full vibrant color with subtle glow enhancement
      const glowIntensity = glowValue.value + activeGlowOpacity.value;
      return {
        backgroundColor: interpolateColor(
          glowIntensity,
          [0, 0.4],
          [finalColor, finalColor] // Keep the same vibrant color, just add glow effects
        ),
      };
    } else {
      // For inactive cards, use vibrant color (or grey if disabled)
      return {
        backgroundColor: finalColor,
      };
    }
  });

  const expandIconStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      expandProgress.value,
      [0, 1],
      [0, 45] // Rotate + icon to X when expanded
    );

    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const emojiStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${emojiRotation.value}deg` }],
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    // Subtle staggered entrance for content elements
    const translateY = interpolate(
      contentOpacity.value,
      [0, 1],
      [10, 0]
    );

    return {
      opacity: contentOpacity.value,
      transform: [{ translateY }],
    };
  });

  const activeIndicatorStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      activeGlowOpacity.value,
      [0, 0.3],
      [1, 1.1]
    );
    
    return {
      opacity: activeGlowOpacity.value,
      transform: [{ scale }],
    };
  });

  // Prepare props for header render function
  const headerRenderProps: HeaderRenderProps = {
    headerStyle,
    expandIconStyle,
    emojiStyle,
    activeIndicatorStyle,
    isExpanded: finalIsExpanded,
    isActive,
    disabled,
    baseColor: disabled ? '#9CA3AF' : baseColor,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
  };

  return (
    <Animated.View
      style={[cardStyle]}
      className={`overflow-hidden rounded-2xl border border-gray-100 ${className}`}
    >
      {/* Background overlay for entire card with base color */}
      <Animated.View
        style={[cardBackgroundStyle]}
        className="absolute inset-0 rounded-2xl"
      />

      {/* Header - Always visible, clickable with enhanced interactions */}
      <Pressable
        onPress={handleHeaderPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        className="flex-1 relative z-10"
        style={{ minHeight: collapsedHeight }}
      >
        {renderHeader(headerRenderProps)}
      </Pressable>

      {/* Expanded content with proper background inheritance and dynamic height measurement */}
      <Animated.View 
        style={[contentStyle]} 
        className="px-4 pb-4 relative z-10"
        pointerEvents={finalIsExpanded ? 'auto' : 'none'}
        onLayout={(event) => {
          if (!expandedHeight && finalIsExpanded) {
            // Measure content height dynamically
            const { height: contentHeight } = event.nativeEvent.layout;
            const totalHeight = collapsedHeight + contentHeight + 20; // Add header + padding
            const clampedHeight = Math.min(Math.max(totalHeight, minExpandedHeight), maxExpandedHeight);
            
            if (clampedHeight !== measuredHeight) {
              setMeasuredHeight(clampedHeight);
            }
          }
        }}
        ref={contentRef}
      >
        {/* Content background with subtle base color (or grey if disabled) */}
        <View 
          style={{ backgroundColor: `${disabled ? '#9CA3AF' : baseColor}10` }}
          className="absolute inset-0 rounded-b-2xl"
        />
        <View className="relative z-10">
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// Export the animated style hooks for advanced customization
export const useBaseAnimatedCardStyles = (
  heightValue: SharedValue<number>,
  expandProgress: SharedValue<number>,
  contentOpacity: SharedValue<number>,
  scaleValue: SharedValue<number>,
  heartbeatValue: SharedValue<number>,
  glowValue: SharedValue<number>,
  activeGlowOpacity: SharedValue<number>,
  emojiRotation: SharedValue<number>,
  isActive: boolean,
  disabled: boolean,
  baseColor: string
): AnimatedStyleHooks => {
  const cardStyle = useAnimatedStyle(() => {
    return {
      height: heightValue.value,
      transform: [{ scale: scaleValue.value * heartbeatValue.value }],
    };
  });

  const cardBackgroundStyle = useAnimatedStyle(() => {
    const finalColor = disabled ? '#9CA3AF' : baseColor;
    const backgroundOpacity = interpolate(
      expandProgress.value,
      [0, 1],
      [1, 0.95]
    );
    
    return {
      backgroundColor: interpolateColor(
        backgroundOpacity,
        [0.95, 1],
        [`${finalColor}20`, finalColor]
      ),
    };
  });

  const headerStyle = useAnimatedStyle(() => {
    const finalColor = disabled ? '#9CA3AF' : baseColor;
    
    if (isActive && !disabled) {
      const glowIntensity = glowValue.value + activeGlowOpacity.value;
      return {
        backgroundColor: interpolateColor(
          glowIntensity,
          [0, 0.4],
          [finalColor, finalColor]
        ),
      };
    } else {
      return {
        backgroundColor: finalColor,
      };
    }
  });

  const expandIconStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      expandProgress.value,
      [0, 1],
      [0, 45]
    );

    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const emojiStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${emojiRotation.value}deg` }],
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      contentOpacity.value,
      [0, 1],
      [10, 0]
    );

    return {
      opacity: contentOpacity.value,
      transform: [{ translateY }],
    };
  });

  const activeIndicatorStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      activeGlowOpacity.value,
      [0, 0.3],
      [1, 1.1]
    );
    
    return {
      opacity: activeGlowOpacity.value,
      transform: [{ scale }],
    };
  });

  return {
    cardStyle,
    cardBackgroundStyle,
    headerStyle,
    expandIconStyle,
    emojiStyle,
    contentStyle,
    activeIndicatorStyle,
  };
};

// Add display name for debugging
BaseAnimatedCard.displayName = 'BaseAnimatedCard';