/**
 * Daily Timeline Card Component - Ultra-Compact Mobile Design
 * 
 * Minimalist timeline card optimized for maximum information density.
 * Features ultra-thin collapsed state and full 24-hour coverage.
 * Uses lightweight animations for better performance.
 */

import { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { observer } from '@legendapp/state/react';
import Animated, { 
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Layout,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { ActivityTimelineBar } from './ActivityTimelineBar';
import { ActivityDetailsList } from './ActivityDetailsList';
import { getActivityEmoji } from '../../state/cardStateManager';
import { formatDuration, formatDateHeader } from '../../utils';
import type { DayStats, TimelineData } from '../../modules/activities/timelineLogic';

// Lightweight spring config for timeline cards
const timelineSpring = {
  damping: 15,
  mass: 0.8,
  stiffness: 150,
};

// Press animation config - snappy and responsive
const pressConfig = {
  damping: 10,
  stiffness: 400,
};

interface DailyTimelineCardProps {
  date: Date;
  dayStats: DayStats | null;
  timelineData: TimelineData | null;
  isToday: boolean;
}

// Create AnimatedPressable component
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const DailyTimelineCard = observer(({ 
  date, 
  dayStats, 
  timelineData, 
  isToday 
}: DailyTimelineCardProps) => {
  // Timeline cards use local state for expand/collapse (allows multiple expanded)
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Animation values
  const arrowRotation = useSharedValue(isExpanded ? 180 : 0);
  const cardScale = useSharedValue(1);
  
  // Press handlers for tactile feedback
  const handlePressIn = useCallback(() => {
    'worklet';
    // Immediate press-in effect for tactile feedback
    cardScale.value = withTiming(0.98, { duration: 50 });
  }, [cardScale]);
  
  const handlePressOut = useCallback(() => {
    'worklet';
    // Spring back to normal size
    cardScale.value = withSpring(1, pressConfig);
  }, [cardScale]);
  
  const toggleExpanded = useCallback(() => {
    'worklet';
    // Animate arrow rotation
    arrowRotation.value = withSpring(arrowRotation.value === 0 ? 180 : 0, timelineSpring);
    
    // Spring back scale if still pressed
    cardScale.value = withSpring(1, pressConfig);
    
    // Update React state on JS thread
    runOnJS(setIsExpanded)(!isExpanded);
  }, [isExpanded, arrowRotation, cardScale]);
  
  // Get all sessions that have any activity on this day (including cross-midnight sessions)
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  // 🔧 CROSS-DAY SESSION HANDLING: Include sessions that overlap with this day
  // This includes sessions that start before this day but end during it (cross-midnight)
  // AND sessions that start during this day but end after it
  const allSessions = timelineData?.segments?.flatMap(segment => segment.activities) || [];
  
  const daySessions = allSessions
    .filter((session, index) => {
      // Remove exact duplicates first
      if (allSessions.findIndex(s => s.id === session.id) !== index) {
        return false;
      }
      
      const sessionStart = new Date(session.started_at);
      const sessionEnd = session.ended_at ? new Date(session.ended_at) : new Date();
      
      // Include if session overlaps with this day at all
      return (
        (sessionStart >= dayStart && sessionStart <= dayEnd) || // Starts during day
        (sessionEnd >= dayStart && sessionEnd <= dayEnd) ||     // Ends during day  
        (sessionStart < dayStart && sessionEnd > dayEnd)        // Spans entire day
      );
    })
    .map(session => {
      // Create date-specific ID using YYYYMMDD format for cross-day sessions
      const dateKey = date.getFullYear().toString() + 
                     (date.getMonth() + 1).toString().padStart(2, '0') + 
                     date.getDate().toString().padStart(2, '0');
      
      return {
        ...session,
        // Extend session with date-specific key for cross-day rendering
        daySpecificId: `${session.id}_${dateKey}`,
        renderDate: date, // Track which day this session is being rendered for
        dateKey, // Store the date key for debugging
      };
    });
  
  
  // Data availability check
  const hasStatsData = dayStats && (dayStats.sessionCount || 0) > 0;
  const hasSegmentData = daySessions.length > 0;
  const hasData = hasStatsData || hasSegmentData;
  
  
  // Only render if there's actual data - no empty state cards
  if (!hasData) {
    return null;
  }

  // Arrow rotation animation
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arrowRotation.value}deg` }],
  }));
  
  // Card scale animation for press feedback
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  
  return (
    <Animated.View
      layout={Layout.springify()}
      entering={FadeIn}
      exiting={FadeOut}
      style={cardStyle}
      className={`bg-white rounded-md mb-1 ${
        isToday 
          ? 'border-l-2 border-l-purple-500 bg-purple-25' 
          : 'border border-gray-100'
      }`}
    >
      {/* Card Header - Always visible with press animations */}
      <AnimatedPressable
        onPress={toggleExpanded}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="px-3 py-2"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-2">
          {/* Date and Quick Stats */}
          <View className="flex-1 flex-row items-center">
            <Text className={`font-medium ${
              isToday 
                ? 'text-purple-900 text-sm' 
                : 'text-gray-800 text-xs'
            } mr-3`}>
              {formatDateHeader(date, isToday)}
            </Text>
            
            {/* Activity Summary */}
            <View className="flex-row items-center">
              <Text className="text-xs text-gray-600 mr-2">
                {dayStats?.sessionCount || daySessions.length || 0} • {dayStats ? formatDuration(dayStats.totalDuration) : '0m'}
              </Text>
              
              {/* Activity Icons */}
              {dayStats && Object.keys(dayStats.activityCounts).length > 0 && (
                <View className="flex-row">
                  {Object.entries(dayStats.activityCounts).slice(0, 3).map(([type]) => (
                    <Text key={type} className="text-xs mr-1">
                      {getActivityEmoji(type)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
          
          {/* Expand Arrow */}
          <Animated.View style={arrowStyle}>
            <Text className="text-xs text-gray-400">
              ▼
            </Text>
          </Animated.View>
        </View>
        
        {/* Timeline Bar - Always visible, tappable to expand/collapse */}
        <ActivityTimelineBar
          date={date}
          sessions={daySessions.length > 0 ? daySessions : []}
          compact={false}
        />
      </AnimatedPressable>
      
      {/* Activity Details - Only visible when expanded */}
      {isExpanded && (
        <View className="px-3 pb-3 border-t border-gray-100">
          <ActivityDetailsList
            sessions={daySessions}
            dayStats={dayStats}
          />
        </View>
      )}
    </Animated.View>
  );
});