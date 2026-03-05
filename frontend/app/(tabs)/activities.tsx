/**
 * Activities Screen - Chronological Timeline
 *
 * Simple FlatList showing all days in reverse chronological order.
 * Latest activities and today's date appear first.
 */
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  FlatList,
} from 'react-native';
import { observer } from '@legendapp/state/react';
import { useUnifiedData } from '../../hooks/useUnifiedData';
import { useTimelineData } from '../../hooks/useTimelineData';
import { DailyTimelineCard } from '../../components/timeline/DailyTimelineCard';

// Timeline day item type
interface TimelineDayItem {
  date: Date;
  dayStats: any;
  isToday: boolean;
  key: string;
}

// Generate days for the timeline - today first, then descending
const generateTimelineDays = (timelineData: any, days: number = 30): TimelineDayItem[] => {
  const timelineDays: TimelineDayItem[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    // Find daily stats for this day
    const dayStats = timelineData?.dailyStats?.find((stat: any) => {
      const statDate = new Date(stat.date);
      return statDate.toDateString() === date.toDateString();
    });
    
    // Check if this day has any sessions in the timeline segments
    const targetDateStr = date.toDateString();
    const dayHasSessions = timelineData?.segments?.some((segment: any) => {
      const segmentDateStr = segment.date.toDateString();
      return segmentDateStr === targetDateStr && segment.activities?.length > 0;
    });
    
    // Include days that have sessions, stats, or if it's today
    if (dayHasSessions || dayStats || i === 0) {
      timelineDays.push({
        date,
        dayStats,
        isToday: i === 0,
        key: `day-${date.getTime()}`,
      });
    }
  }
  
  return timelineDays;
};

// Chronological Timeline Component
const ChronologicalTimeline = observer(({ babyId }: { babyId: string }) => {
  // Increase to 30 days for better history coverage
  const timeline = useTimelineData(babyId, { days: 30 });
  
  // Loading state
  if (timeline.loading && !timeline.data) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#6B46C1" />
        <Text className="mt-2 text-gray-600">Loading timeline...</Text>
      </View>
    );
  }
  
  // Error state
  if (timeline.error) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-gray-50">
        <View className="bg-white p-6 rounded-2xl shadow-sm max-w-sm">
          <Text className="text-lg font-semibold text-red-600 mb-2">
            Timeline Error
          </Text>
          <Text className="text-sm text-gray-600 mb-4">
            {timeline.error}
          </Text>
          <Pressable
            onPress={timeline.refresh}
            className="bg-purple-500 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-medium">Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  
  // Empty state
  if (!timeline.data || timeline.data.totalSessions === 0) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-gray-50">
        <View className="bg-white p-8 rounded-xl shadow-sm max-w-sm">
          <Text className="text-2xl text-center mb-2">📊</Text>
          <Text className="text-lg font-bold text-gray-800 text-center mb-2">
            No Activities Yet
          </Text>
          <Text className="text-sm text-gray-600 text-center mb-2">
            Start tracking activities from the Dashboard to see them appear in your timeline!
          </Text>
        </View>
      </View>
    );
  }
  
  // Generate days in reverse chronological order
  const timelineDays = generateTimelineDays(timeline.data);
  
  // Debug timeline data
  console.log('🔍 ChronologicalTimeline Debug:', {
    timelineDataExists: !!timeline.data,
    totalSessions: timeline.data?.totalSessions || 0,
    segments: timeline.data?.segments?.length || 0,
    timelineDays: timelineDays.length,
    loading: timeline.loading,
    error: timeline.error
  });
  
  const renderDayCard = ({ item }: { item: TimelineDayItem }) => (
    <DailyTimelineCard
      key={item.key}
      date={item.date}
      dayStats={item.dayStats}
      timelineData={timeline.data}
      isToday={item.isToday}
    />
  );
  
  return (
    <FlatList
      data={timelineDays}
      renderItem={renderDayCard}
      keyExtractor={(item) => item.key}
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      windowSize={10}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      directionalLockEnabled={false}
      disableIntervalMomentum={false}
      scrollsToTop={true}
      ListHeaderComponent={
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Activity Summary
          </Text>
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-600">
              Total Activities: {timeline.data.totalSessions}
            </Text>
            <Text className="text-xs text-gray-600">
              Time Tracked: {Math.floor(timeline.data.totalDuration / 3600)}h {Math.floor((timeline.data.totalDuration % 3600) / 60)}m
            </Text>
          </View>
        </View>
      }
    />
  );
});

export default observer(function ActivitiesScreen() {
  const { activeBaby } = useUnifiedData();

  if (!activeBaby) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <View className="bg-gray-50 p-8 rounded-xl max-w-sm">
          <Text className="text-2xl text-center mb-2">👶</Text>
          <Text className="text-lg font-bold text-gray-800 text-center mb-2">
            No Baby Profile
          </Text>
          <Text className="text-sm text-gray-600 text-center">
            Please set up a baby profile from the Dashboard first.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Screen Header - Updated */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <Text className="text-xl font-bold text-gray-900">
          Activity Timeline
        </Text>
        <Text className="text-sm text-gray-600 mt-1">
          {activeBaby.name}&apos;s activity history - latest first
        </Text>
      </View>

      {/* Chronological Timeline Content */}
      <ChronologicalTimeline babyId={activeBaby.id} />
    </View>
  );
});