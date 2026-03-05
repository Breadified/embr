import { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { 
  ACTIVITY_TYPES, 
  GENDER_TYPES, 
  UNIT_TYPES,
  type ActivityType,
  type Baby,
  type ActivitySession 
} from '../services/supabase';
// import { ActivitiesService } from '../services/activitiesService'; // DEPRECATED - Use useUnifiedActivity hook

/**
 * Example component demonstrating proper database type integration
 * This shows how to use the generated types safely and effectively
 */
export const TypesExample = () => {
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [activeSession, setActiveSession] = useState<ActivitySession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Example of using enum types for type-safe selections
  const handleStartActivity = async (activityType: ActivityType) => {
    if (!selectedBaby) {
      Alert.alert('Error', 'Please select a baby first');
      return;
    }

    setIsLoading(true);
    try {
      // Example metadata for nursing activity (typed as Json)
      const metadata = activityType === 'nursing' 
        ? { side: 'left', position: 'cradle' } as const
        : activityType === 'bottle'
        ? { volume_ml: 0, formula_type: 'breast_milk' } as const
        : null;

      // TODO: Replace with useUnifiedActivity hook
      // const activity = useUnifiedActivity();
      // const sessionId = await activity.startSession({
      //   babyId: selectedBaby.id,
      //   activityType,
      //   metadata
      // });
      const sessionId = 'example-session-id';

      // Create a mock session object to demonstrate types
      const mockSession: ActivitySession = {
        id: sessionId,
        baby_id: selectedBaby.id,
        activity_type: activityType,
        started_at: new Date().toISOString(),
        ended_at: null,
        metadata,
        notes: null,
        client_id: 'demo-client',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_duration_seconds: null,
        sync_status: 'pending',
        sync_error: null,
        sync_retry_count: 0,
        last_sync_attempt: null,
      };

      setActiveSession(mockSession);
      Alert.alert('Success', `Started ${activityType} session`);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    setIsLoading(true);
    try {
      // TODO: Replace with useUnifiedActivity hook
      // await activity.endSession(activeSession.id);
      console.log('Mock end session:', activeSession.id);
      setActiveSession(null);
      Alert.alert('Success', 'Session ended');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Example of creating a mock baby using proper types
  const createMockBaby = (): Baby => ({
    id: 'demo-baby-id',
    profile_id: 'demo-profile-id',
    name: 'Demo Baby',
    nickname: 'Little One',
    date_of_birth: '2024-01-15',
    time_of_birth: '14:30:00',
    gender: 'female',
    weight_at_birth_value: 3.2,
    weight_at_birth_unit: 'kg',
    height_at_birth_value: 50,
    height_at_birth_unit: 'cm',
    head_circumference_at_birth_value: 34,
    head_circumference_at_birth_unit: 'cm',
    gestational_age_weeks: 39,
    birth_location: 'Hospital',
    medical_notes: null,
    notes: null,
    avatar_url: null,
    color_theme: 'pink',
    is_active: true,
    archive_reason: null,
    sync_status: 'synced',
    client_id: 'demo-client',
    created_at: '2024-01-15T14:30:00Z',
    updated_at: '2024-01-15T14:30:00Z',
  });

  useEffect(() => {
    // Set mock baby for demonstration
    setSelectedBaby(createMockBaby());
  }, []);

  return (
    <View className="w-full max-w-md space-y-4 rounded-lg bg-gray-50 p-4">
      <Text className="text-center text-lg font-bold text-gray-800">
        Database Types Integration Test
      </Text>

      {/* Baby Info Section */}
      <View className="space-y-2">
        <Text className="font-semibold text-gray-700">Selected Baby:</Text>
        {selectedBaby ? (
          <View className="rounded bg-white p-3">
            <Text className="font-medium">{selectedBaby.name}</Text>
            <Text className="text-sm text-gray-600">
              Born: {selectedBaby.date_of_birth}
            </Text>
            <Text className="text-sm text-gray-600">
              Gender: {selectedBaby.gender}
            </Text>
            <Text className="text-sm text-gray-600">
              Weight: {selectedBaby.weight_at_birth_value} {selectedBaby.weight_at_birth_unit}
            </Text>
          </View>
        ) : (
          <Text className="text-gray-500">No baby selected</Text>
        )}
      </View>

      {/* Activity Types Demo */}
      <View className="space-y-2">
        <Text className="font-semibold text-gray-700">Available Activities:</Text>
        <View className="flex-row flex-wrap gap-2">
          {ACTIVITY_TYPES.slice(0, 4).map((type) => (
            <Pressable
              key={type}
              onPress={() => handleStartActivity(type)}
              disabled={isLoading || !!activeSession}
              className={`rounded px-3 py-2 ${
                isLoading || activeSession
                  ? 'bg-gray-300'
                  : 'bg-blue-500'
              }`}
            >
              <Text className={`text-xs font-medium ${
                isLoading || activeSession 
                  ? 'text-gray-500' 
                  : 'text-white'
              }`}>
                {type}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Active Session Display */}
      {activeSession && (
        <View className="space-y-2">
          <Text className="font-semibold text-gray-700">Active Session:</Text>
          <View className="rounded bg-green-50 p-3">
            <Text className="font-medium text-green-800">
              {activeSession.activity_type.toUpperCase()}
            </Text>
            <Text className="text-sm text-green-600">
              Started: {new Date(activeSession.started_at).toLocaleTimeString()}
            </Text>
            <Text className="text-sm text-green-600">
              Status: {activeSession.sync_status}
            </Text>
            <Pressable
              onPress={handleEndSession}
              disabled={isLoading}
              className="mt-2 rounded bg-red-500 px-3 py-2"
            >
              <Text className="text-center text-sm font-medium text-white">
                End Session
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Type Constants Demo */}
      <View className="space-y-2">
        <Text className="font-semibold text-gray-700">Type Constants:</Text>
        <View className="rounded bg-white p-3">
          <Text className="text-xs text-gray-600">
            Gender Types: {GENDER_TYPES.join(', ')}
          </Text>
          <Text className="text-xs text-gray-600">
            Unit Types: {UNIT_TYPES.slice(0, 4).join(', ')}, ...
          </Text>
          <Text className="text-xs text-gray-600">
            Activity Types: {ACTIVITY_TYPES.length} total types
          </Text>
        </View>
      </View>

      <Text className="text-center text-xs text-green-600">
        ✅ All database types integrated successfully!
      </Text>
    </View>
  );
};