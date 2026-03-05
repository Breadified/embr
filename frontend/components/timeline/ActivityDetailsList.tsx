/**
 * Activity Details List Component
 * 
 * Detailed breakdown of activities shown in expanded daily cards.
 * Displays chronological list with times, types, and durations.
 */

import { View, Text, Pressable, ScrollView } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useMemo } from 'react';
import type { ActivitySession } from '../../services/supabase';
import type { DayStats } from '../../modules/activities/timelineLogic';
import { 
  getActivityEmoji, 
  getActivityName,
  getActivityColor
} from '../../utils/activityUtils';

interface ActivityDetailsListProps {
  sessions: ActivitySession[];
  dayStats: DayStats | null;
}

// Format time for display
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    // Let device locale determine 12/24 hour format
  });
};

// Format duration
const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
};


// Get session status
const getSessionStatus = (session: ActivitySession): { 
  label: string; 
  color: string; 
  isActive: boolean;
} => {
  if (!session.ended_at) {
    return {
      label: 'Active',
      color: 'text-green-600 bg-green-100',
      isActive: true,
    };
  }
  
  return {
    label: 'Completed',
    color: 'text-gray-600 bg-gray-100',
    isActive: false,
  };
};

export const ActivityDetailsList = observer(({ 
  sessions, 
  dayStats 
}: ActivityDetailsListProps) => {
  // Check if data is ready to prevent flicker
  const isDataReady = sessions && sessions.every(session => 
    session.started_at && 
    session.activity_type &&
    session.id
  );

  // Sort sessions by start time - LATEST FIRST
  // Memoize to prevent re-sorting on every render
  const sortedSessions = useMemo(
    () => isDataReady ? [...sessions].sort((a, b) => 
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    ) : [],
    [sessions, isDataReady]
  );

  // Show loading state until data is ready
  if (!isDataReady && sessions.length > 0) {
    return (
      <View className="mt-4">
        <View className="flex-row justify-between items-center mb-3">
          <View className="h-4 w-24 bg-gray-200 rounded" />
          <View className="h-3 w-16 bg-gray-200 rounded" />
        </View>
        <View className="space-y-3">
          {[1, 2, 3].map((i) => (
            <View key={i} className="p-3 rounded-xl border border-gray-200 bg-gray-50">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="mr-3">
                    <View className="h-4 w-12 bg-gray-200 rounded mb-1" />
                    <View className="h-3 w-16 bg-gray-200 rounded" />
                  </View>
                  <View className="flex-row items-center flex-1">
                    <View className="h-6 w-6 bg-gray-200 rounded mr-2" />
                    <View className="flex-1">
                      <View className="h-4 w-20 bg-gray-200 rounded" />
                    </View>
                  </View>
                </View>
                <View className="items-end">
                  <View className="h-4 w-12 bg-gray-200 rounded mb-1" />
                  <View className="h-6 w-16 bg-gray-200 rounded-full" />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }
  
  // If no sessions, show empty state
  if (sortedSessions.length === 0) {
    return (
      <View className="py-6 items-center">
        <Text className="text-gray-400 text-sm mb-2">
          No activities recorded
        </Text>
        <Text className="text-xs text-gray-500 text-center">
          Activities will appear here once they are tracked
        </Text>
      </View>
    );
  }
  
  return (
    <View className="mt-4" style={{ flex: 1 }}>
      {/* Section Header */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-sm font-semibold text-gray-700">
          Activity Details
        </Text>
        <Text className="text-xs text-gray-500">
          {sortedSessions.length} activities
        </Text>
      </View>
      
      {/* Activities List - ScrollView with higher scroll priority */}
      <ScrollView
        showsVerticalScrollIndicator={true}
        style={{ maxHeight: 300 }}
        nestedScrollEnabled={true}
        scrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
        scrollEventThrottle={16}
        directionalLockEnabled={true}
        disableScrollViewPanResponder={false}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
      >
        {sortedSessions.map((session) => {
          const startTime = new Date(session.started_at);
          const endTime = session.ended_at ? new Date(session.ended_at) : null;
          const duration = session.total_duration_seconds || 0;
          const status = getSessionStatus(session);
          
          // Use day-specific ID if available (for cross-day sessions), otherwise use regular ID
          const uniqueKey = (session as ActivitySession & { daySpecificId?: string }).daySpecificId || session.id;
          
          
          return (
            <View
              key={uniqueKey}
              className="mb-3"
            >
              <Pressable
                className="p-3 rounded-xl border active:scale-95"
                style={{
                  backgroundColor: getActivityColor(session.activity_type) + '20', // 20 = 12.5% opacity for light background
                  borderColor: getActivityColor(session.activity_type),
                }}
              >
                <View className="flex-row items-center justify-between">
                  {/* Left: Time and Activity */}
                  <View className="flex-row items-center flex-1">
                    {/* Time */}
                    <View className="mr-3">
                      <Text className="text-sm font-medium text-gray-800">
                        {formatTime(startTime)}
                      </Text>
                      {endTime && (
                        <Text className="text-xs text-gray-500">
                          to {formatTime(endTime)}
                        </Text>
                      )}
                    </View>
                    
                    {/* Activity Icon and Name */}
                    <View className="flex-row items-center flex-1">
                      <Text className="text-lg mr-2">
                        {getActivityEmoji(session.activity_type)}
                      </Text>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-800">
                          {getActivityName(session.activity_type)}
                        </Text>
                        {session.notes && (
                          <Text className="text-xs text-gray-600 mt-1" numberOfLines={1}>
                            {session.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  {/* Right: Duration and Status */}
                  <View className="items-end">
                    <Text className="text-sm font-medium text-gray-800 mb-1">
                      {duration > 0 ? formatDuration(duration) : '---'}
                    </Text>
                    <View className={`px-2 py-1 rounded-full ${status.color}`}>
                      <Text className="text-xs font-medium">
                        {status.label}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Additional Session Info */}
                {session.metadata && (
                  <View className="mt-2 pt-2 border-t border-gray-200">
                    <View className="flex-row flex-wrap">
                      {session.metadata && typeof session.metadata === 'object' && (
                        Object.entries(session.metadata as Record<string, unknown>).map(([key, value]) => (
                          <View key={key} className="bg-gray-100 px-2 py-1 rounded-full mr-2 mb-1">
                            <Text className="text-xs text-gray-600">
                              {key}: {String(value)}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      
      {/* Day Summary */}
      {dayStats && (
        <View className="mt-4 pt-3 border-t border-gray-200">
          <Text className="text-xs font-medium text-gray-600 mb-2">
            Day Summary
          </Text>
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-500">
              Total Time: {formatDuration(dayStats.totalDuration)}
            </Text>
            <Text className="text-xs text-gray-500">
              Peak Hour: {dayStats.peakHour === 0 ? '12 AM' : 
                         dayStats.peakHour < 12 ? `${dayStats.peakHour} AM` : 
                         dayStats.peakHour === 12 ? '12 PM' : 
                         `${dayStats.peakHour - 12} PM`}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});