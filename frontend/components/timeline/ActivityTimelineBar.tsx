/**
 * Activity Timeline Bar Component
 *
 * Visual 24-hour timeline bar showing activity distribution.
 * Supports both compact and detailed views.
 */

import { View, Text } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useMemo } from 'react';
import type { ActivitySession } from '../../services/supabase';
import { getActivityColor, getActivityName } from '../../utils/activityUtils';

interface ActivityTimelineBarProps {
  date: Date;
  sessions: ActivitySession[];
  compact?: boolean;
}


// Create hour slots for the full 24-hour timeline (12AM-11:59PM)
const createHourSlots = (sessions: ActivitySession[], date: Date) => {
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours (full day)
  const hourData: Record<
    number,
    {
      activities: ActivitySession[];
      intensity: number;
      primaryType: string | null;
      durationMinutes: number;
    }
  > = {};

  // Initialize all hours
  hours.forEach((hour) => {
    hourData[hour] = {
      activities: [],
      intensity: 0,
      primaryType: null,
      durationMinutes: 0,
    };
  });

  // Map sessions to hours - include cross-day sessions
  sessions.forEach((session) => {
    const sessionStart = new Date(session.started_at);
    const sessionEnd = session.ended_at
      ? new Date(session.ended_at)
      : new Date();

    // Ensure we have valid session data
    if (!sessionStart || !sessionEnd) {
      return;
    }

    // Calculate which hours this session spans on THIS specific date
    let startHour: number;
    let endHour: number;

    // If session starts on target date
    if (sessionStart.toDateString() === date.toDateString()) {
      startHour = sessionStart.getHours();
      // If session ends on different date, show until end of day
      if (sessionEnd.toDateString() !== date.toDateString()) {
        endHour = 23; // Show until 11PM on this date
      } else {
        endHour = sessionEnd.getHours();
      }
    }
    // If session starts before target date but ends on target date
    else if (sessionEnd.toDateString() === date.toDateString()) {
      startHour = 0; // Show from midnight
      endHour = sessionEnd.getHours();
    }
    // If session spans through target date (starts before, ends after)
    else if (sessionStart < date && sessionEnd > date) {
      startHour = 0; // Show full day
      endHour = 23;
    }
    // Session doesn't touch this date at all
    else {
      return;
    }

    // Add to each affected hour
    for (let hour = startHour; hour <= endHour && hour < 24; hour++) {
      const hourSlot = hourData[hour];
      if (hourSlot) {
        hourSlot.activities.push(session);
        hourSlot.intensity += 1;

        // Calculate duration for this specific hour
        const hourStart = new Date(date);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(date);
        hourEnd.setHours(hour, 59, 59, 999);

        const activityStart =
          sessionStart > hourStart ? sessionStart : hourStart;
        const activityEnd = sessionEnd < hourEnd ? sessionEnd : hourEnd;

        const durationMs = activityEnd.getTime() - activityStart.getTime();
        const durationMinutes = Math.max(
          0,
          Math.floor(durationMs / (1000 * 60))
        );

        hourSlot.durationMinutes += durationMinutes;

        // Set primary type (most recent activity type for that hour)
        if (!hourSlot.primaryType) {
          hourSlot.primaryType = session.activity_type;
        }
      }
    }
  });

  // Sort activities within each hour chronologically
  // First created activity will be at bottom of stack (index 0)
  Object.values(hourData).forEach((hourSlot) => {
    if (hourSlot.activities.length > 1) {
      hourSlot.activities.sort((a, b) => 
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );
    }
  });

  return hourData;
};

// Format hour label using device locale
const formatHourLabel = (hour: number, compact: boolean): string => {
  if (compact) {
    // Only show every 4 hours in compact mode
    if (hour % 4 !== 0) return '';
  }

  // Create a date object for the specific hour
  const date = new Date();
  date.setHours(hour, 0, 0, 0);

  // Use device locale for formatting
  return date
    .toLocaleTimeString(undefined, {
      hour: 'numeric',
      // Don't include minutes for timeline labels
    })
    .replace(':00', ''); // Remove :00 if present
};

export const ActivityTimelineBar = observer(
  ({ date, sessions, compact = false }: ActivityTimelineBarProps) => {
    // Don't render until we have actual session data
    // This prevents the flicker from empty state to populated state
    const hasValidSessions = sessions && sessions.length >= 0;
    const isDataReady = hasValidSessions && sessions.every(session => 
      session.started_at && 
      (session.ended_at || !session.ended_at) && // Allow both ended and ongoing sessions
      session.activity_type
    );

    // Memoize hour data calculation to prevent recalculation on every render
    const hourData = useMemo(
      () => isDataReady ? createHourSlots(sessions, date) : {},
      [sessions, date, isDataReady]
    );

    // Show loading placeholder until data is ready
    if (!isDataReady) {
      return (
        <View
          className={`rounded-lg ${
            compact ? 'bg-gray-100 p-2' : 'bg-gray-50 p-3'
          }`}
        >
          <View
            className={`flex-row items-end ${
              compact ? 'h-6 overflow-hidden rounded-sm' : 'h-8'
            }`}
          >
            {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
              <View
                key={hour}
                className={compact ? 'flex-1' : 'mx-0.5 flex-1'}
                style={{ height: 3 }}
              >
                <View className="h-full w-full bg-gray-200/30" />
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View
        className={`rounded-lg ${
          compact ? 'bg-gray-100 p-2' : 'bg-gray-50 p-3'
        }`}
      >
        {/* Hour Labels - Full 24-hour coverage */}
        {!compact && (
          <View className="mb-1">
            <View className="flex-row">
              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                <View key={hour} className="flex-1">
                  {hour % 6 === 0 && (
                    <Text
                      className="text-xs text-gray-400"
                      style={{ minWidth: 50 }}
                    >
                      {formatHourLabel(hour, false)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activity Bars - Full 24-hour timeline */}
        <View
          className={`flex-row items-end ${
            compact ? 'h-6 overflow-hidden rounded-sm' : 'h-8'
          }`}
        >
          {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
            const hourInfo = hourData[hour];
            const hasActivity = (hourInfo?.activities?.length ?? 0) > 0;

            // Balance duration accuracy with visibility
            const durationRatio = hourInfo?.durationMinutes
              ? Math.min(hourInfo.durationMinutes / 60, 1)
              : 0;

            let height = 3; // Default for no activity
            if (hasActivity) {
              const minHeight = 15;
              const maxHeight = 60;
              const scaledHeight =
                minHeight + durationRatio * (maxHeight - minHeight);
              height = Math.max(scaledHeight, minHeight);
            }

            return (
              <View
                key={hour}
                className={compact ? 'flex-1' : 'mx-0.5 flex-1'} // Use flex-1 for expanded view too
                style={compact ? { height: '100%' } : { height }}
              >
                {hasActivity && hourInfo && hourInfo.activities.length > 1 ? (
                  // Multiple activities - stack them
                  <View className="h-full w-full">
                    {hourInfo.activities.map((activity, index) => (
                      <View
                        key={`${activity.id}-${index}`}
                        className="w-full"
                        style={{
                          height: `${100 / hourInfo.activities.length}%`,
                          backgroundColor: getActivityColor(activity.activity_type),
                        }}
                      />
                    ))}
                  </View>
                ) : (
                  // Single activity or no activity
                  <View
                    className={`h-full w-full ${
                      hasActivity
                        ? ''
                        : compact
                          ? 'bg-transparent'
                          : 'bg-gray-200/30'
                    }`}
                    style={{
                      backgroundColor: hasActivity && hourInfo?.primaryType
                        ? getActivityColor(hourInfo.primaryType)
                        : undefined,
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Compact Time Labels - Show key hours */}
        {compact && (
          <View className="mt-1 flex-row justify-between px-1">
            <Text className="text-xs text-gray-400">12A</Text>
            <Text className="text-xs text-gray-400">6A</Text>
            <Text className="text-xs text-gray-400">12P</Text>
            <Text className="text-xs text-gray-400">6P</Text>
            <Text className="text-xs text-gray-400">12A</Text>
          </View>
        )}

        {/* Legend */}
        {!compact && sessions.length > 0 && (
          <View className="mt-3 border-t border-gray-200 pt-2">
            <View className="flex-row flex-wrap">
              {Array.from(new Set(sessions.map((s) => s.activity_type))).map(
                (type) => (
                  <View key={type} className="mb-1 mr-3 flex-row items-center">
                    <View
                      className="mr-1 h-3 w-3 rounded-sm"
                      style={{
                        backgroundColor: getActivityColor(type),
                      }}
                    />
                    <Text className="text-xs capitalize text-gray-600">
                      {getActivityName(type)}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>
        )}
      </View>
    );
  }
);
