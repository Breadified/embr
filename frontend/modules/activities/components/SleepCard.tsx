import { useState, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useActivityCard } from '../../../hooks/useActivityCard';
import { MultiTimerComponent, TimerConfig } from '../../../components/shared/MultiTimerComponent';
import { AnimatedActivityCard } from '../../../components/shared/AnimatedActivityCard';
import type { ActivitySession } from '../../../services/supabase';

export interface SleepCardProps {
  babyId: string;
  onSessionComplete?: (session: ActivitySession) => void;
  disabled?: boolean;
}

// Sleep-specific metadata interface
interface SleepMetadata extends Record<string, unknown> {
  location?: 'crib' | 'bed' | 'stroller' | 'car' | 'arms' | 'carrier';
  sleepType?: 'nap' | 'night_sleep';
  quality?: 'poor' | 'fair' | 'good' | 'excellent';
  environment?: 'quiet' | 'white_noise' | 'music' | 'normal';
  notes?: string;
}

export const SleepCard = observer<SleepCardProps>(({ 
  babyId, 
  onSessionComplete,
  disabled = false 
}) => {
  // ✅ NEW UNIFIED SYSTEM - Single hook for all card and session management
  const card = useActivityCard('sleep');

  const [sleepMetadata, setSleepMetadata] = useState<SleepMetadata>({
    location: 'crib',
    sleepType: 'nap',
    quality: 'good',
    environment: 'quiet'
  });

  // Timer configuration for sleep
  const timerConfigs: TimerConfig[] = [
    {
      id: 'sleep',
      label: 'Sleep Duration',
      emoji: '😴',
      color: card.activityColor
    }
  ];

  const startSleepSession = useCallback(async () => {
    try {
      await card.startSession(sleepMetadata);
      console.log('✅ Started sleep session');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start sleep session';
      Alert.alert('Error', errorMsg);
      console.error('Failed to start sleep session:', error);
    }
  }, [card, sleepMetadata]);

  const completeSleepSession = useCallback(async () => {
    try {
      const completedMetadata: SleepMetadata = {
        ...sleepMetadata,
        completed: true
      };

      await card.endSession(completedMetadata);
      
      if (onSessionComplete && card.activeSession) {
        onSessionComplete(card.activeSession as ActivitySession);
      }
      console.log('✅ Completed sleep session');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete sleep session');
      console.error('Failed to complete sleep session:', error);
    }
  }, [card, sleepMetadata, onSessionComplete]);

  // Handle timer changes from MultiTimerComponent
  const handleTimerChange = useCallback((_timerId: string, _elapsed: number, isRunning: boolean) => {
    if (!card.hasActiveSession && isRunning) {
      // Start session automatically when timer starts
      startSleepSession();
    }
  }, [card.hasActiveSession, startSleepSession]);

  // Format last activity display
  const lastActivity = card.lastSession 
    ? new Date((card.lastSession as ActivitySession).started_at).toLocaleDateString()
    : 'Never';

  return (
    <AnimatedActivityCard
      activityType="sleep"
      title="Sleep"
      subtitle="Track sleep session"
      emoji="😴"
      isActive={card.hasActiveSession}
      lastActivity={lastActivity}
      disabled={disabled || card.isDisabled}
    >
      {/* DEBUG: Disabled state is now handled visually through grey coloring */}
      
      {/* Main Content Container */}
      <View className="space-y-4">
        
        {/* ✅ UNIFIED SYSTEM - Show session state */}
        {card.hasActiveSession && (
          <View className="bg-purple-50 rounded-lg p-3 mb-4">
            <Text className="text-purple-700 font-medium text-center">
              Sleep Session Active
            </Text>
            <Text className="text-purple-600 text-sm text-center mt-1">
              ⏱️ {Math.floor(card.elapsedSeconds / 60)}m {card.elapsedSeconds % 60}s asleep
            </Text>
          </View>
        )}
        
        {/* Sleep Settings */}
        <View className="space-y-3">
          <Text className="text-lg font-semibold text-gray-800 text-center">
            Sleep Details
          </Text>
          
          {/* Location Selection */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Sleep Location
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {[
                { key: 'crib', label: '🛏️ Crib' },
                { key: 'bed', label: '🛌 Bed' },
                { key: 'stroller', label: '🚼 Stroller' },
                { key: 'arms', label: '🤗 Arms' }
              ].map((location) => (
                <Pressable
                  key={location.key}
                  onPress={() => setSleepMetadata(prev => ({ ...prev, location: location.key as any }))}
                  disabled={card.isDisabled}
                  className={`py-2 px-3 rounded-lg border ${
                    sleepMetadata.location === location.key
                      ? 'bg-purple-100 border-purple-300'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <Text className={`text-center text-sm font-medium ${
                    sleepMetadata.location === location.key ? 'text-purple-700' : 'text-gray-700'
                  }`}>
                    {location.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          
          {/* Sleep Type */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Sleep Type
            </Text>
            <View className="flex-row space-x-2">
              {[
                { key: 'nap', label: '☀️ Nap' },
                { key: 'night_sleep', label: '🌙 Night Sleep' }
              ].map((type) => (
                <Pressable
                  key={type.key}
                  onPress={() => setSleepMetadata(prev => ({ ...prev, sleepType: type.key as any }))}
                  disabled={card.isDisabled}
                  className={`flex-1 py-2 px-3 rounded-lg border ${
                    sleepMetadata.sleepType === type.key
                      ? 'bg-purple-100 border-purple-300'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <Text className={`text-center text-sm font-medium ${
                    sleepMetadata.sleepType === type.key ? 'text-purple-700' : 'text-gray-700'
                  }`}>
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        
        {/* Timer Component */}
        <MultiTimerComponent
          timers={timerConfigs}
          persistenceKey={`sleep_${babyId}`}
          disabled={disabled || card.isDisabled}
          exclusive={true}
          showCombinedTotal={false}
          onTimerChange={handleTimerChange}
          sessionCompletion={{
            onSessionComplete: completeSleepSession,
            sessionActive: card.hasActiveSession,
            sessionStartTime: card.activeSession?.started_at ? new Date((card.activeSession as ActivitySession).started_at).getTime() : null,
            completionLabel: "End Sleep",
            showCompletionButton: true
          }}
        />
        
        {/* Session Summary */}
        {card.hasActiveSession && card.activeSession && (
          <View className="border-t border-gray-200 pt-4 bg-gray-50 rounded-lg p-3">
            <Text className="text-xs text-gray-500 text-center font-medium mb-1">
              Sleep Started: {new Date((card.activeSession as ActivitySession).started_at).toLocaleTimeString()}
            </Text>
            <Text className="text-xs text-gray-600 text-center">
              Location: {sleepMetadata.location} • Type: {sleepMetadata.sleepType}
            </Text>
          </View>
        )}
        
      </View>
    </AnimatedActivityCard>
  );
});

export default SleepCard;