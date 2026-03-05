import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { observer } from '@legendapp/state/react';
import { cardState$, cardStateActions, ActivityType } from '../../state/cardStateManager';
import { BaseAnimatedCard, HeaderRenderProps } from './BaseAnimatedCard';

export interface AnimatedActivityCardProps {
  activityType: ActivityType;
  title: string;
  subtitle: string;
  emoji: string;
  children: ReactNode;
  expandedHeight?: number;
  isActive?: boolean;
  lastActivity?: string;
  onHeaderPress?: () => void;
  disabled?: boolean;
  forceExpanded?: boolean;  // Force card to always be expanded
}

export const AnimatedActivityCard: React.FC<AnimatedActivityCardProps> = observer(({
  activityType,
  title,
  subtitle,
  emoji,
  children,
  expandedHeight,
  isActive = false,
  lastActivity = 'Never',
  onHeaderPress,
  disabled = false,
  forceExpanded = false,
}) => {
  // Get current card state
  const isExpanded = cardState$.expandedCard.get() === activityType;
  const isAnimating = cardState$.isAnimating.get();
  const activityColor = cardStateActions.getActivityColor(activityType);
  
  // Handle toggle expansion
  const handleToggleExpanded = () => {
    if (!isAnimating) {
      cardStateActions.toggleCard(activityType);
    }
  };
  
  // Handle header press with custom logic
  const handleHeaderPress = () => {
    onHeaderPress?.();
  };
  
  // Render header content using the base card's render prop
  const renderHeader = (props: HeaderRenderProps) => (
    <Animated.View
      style={[props.headerStyle]}
      className="flex-row items-center justify-between p-4 min-h-[80px]"
    >
      {/* Left side - Icon and text */}
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mr-3">
          <Animated.Text style={[props.emojiStyle]} className="text-2xl">
            {emoji}
          </Animated.Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-white">
            {title}
          </Text>
          <Text className="text-sm text-white/80">
            {subtitle}
          </Text>
          <Text className="text-xs text-white/60">
            Last: {lastActivity}
          </Text>
        </View>
      </View>

      {/* Right side - Status and expand icon */}
      <View className="flex-row items-center">
        {isActive && (
          <>
            {/* Active glow background for breathing effect */}
            <Animated.View 
              style={[
                props.activeIndicatorStyle, 
                { 
                  backgroundColor: `${props.baseColor}60`,
                  position: 'absolute',
                  width: 60,
                  height: 24,
                  borderRadius: 12,
                  right: 32, // Position behind the Active text
                }
              ]}
            />
            <Animated.View className="bg-white/20 px-2 py-1 rounded-full mr-3">
              <Text className="text-xs text-white font-medium">
                Active
              </Text>
            </Animated.View>
          </>
        )}
        
        <Animated.View style={[props.expandIconStyle]} className="w-8 h-8 items-center justify-center">
          <Text className="text-white text-2xl font-light">
            +
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
  
  return (
    <BaseAnimatedCard
      isExpanded={isExpanded}
      onToggleExpanded={handleToggleExpanded}
      forceExpanded={forceExpanded}
      expandedHeight={expandedHeight}
      isActive={isActive}
      disabled={disabled}
      baseColor={activityColor}
      className="mx-4 mb-4"
      renderHeader={renderHeader}
      onHeaderPress={handleHeaderPress}
    >
      {children}
    </BaseAnimatedCard>
  );
});

// Add display name for debugging
AnimatedActivityCard.displayName = 'AnimatedActivityCard';