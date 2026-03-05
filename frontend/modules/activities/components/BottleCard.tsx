import { useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { observer } from '@legendapp/state/react';
import { useActivityCard } from '../../../hooks/useActivityCard';
import { MultiTimerComponent, TimerConfig } from '../../../components/shared/MultiTimerComponent';
import { AnimatedActivityCard } from '../../../components/shared/AnimatedActivityCard';
import type { ActivitySession } from '../../../services/supabase';

export interface BottleCardProps {
  babyId: string;
  onSessionComplete?: (session: ActivitySession) => void;
  disabled?: boolean;
}

// Bottle feeding metadata interface
interface BottleMetadata extends Record<string, unknown> {
  volume?: number; // ml
  formulaType?: 'breast_milk' | 'formula' | 'mixed';
  temperature?: 'warm' | 'room_temp' | 'cold';
  feedingMethod?: 'bottle' | 'cup' | 'syringe';
  notes?: string;
}

export const BottleCard = observer<BottleCardProps>(({ 
  babyId, 
  onSessionComplete,
  disabled = false 
}) => {
  // ✅ NEW UNIFIED SYSTEM - Single hook for all card and session management
  const card = useActivityCard('bottle');

  // Local state for bottle-specific inputs
  const [volume, setVolume] = useState<string>('');
  const [formulaType, setFormulaType] = useState<'breast_milk' | 'formula' | 'mixed'>('formula');
  const [temperature] = useState<'warm' | 'room_temp' | 'cold'>('warm');

  // Animation values
  const pulseValue = useSharedValue(1);
  const colorValue = useSharedValue(0);

  // Timer configuration for bottle feeding
  const timerConfigs: TimerConfig[] = [
    {
      id: 'feeding',
      label: 'Feeding Time',
      emoji: '🍼',
      color: card.activityColor
    }
  ];

  const startBottleSession = useCallback(async () => {
    try {
      const bottleMetadata: BottleMetadata = {
        ...(volume ? { volume: parseInt(volume) } : {}),
        formulaType,
        temperature,
        feedingMethod: 'bottle',
        notes: ''
      };

      await card.startSession(bottleMetadata);
      console.log('✅ Started bottle session');

      // Trigger success animation
      colorValue.value = withTiming(1, { duration: 500 });
      pulseValue.value = withSequence(
        withSpring(1.1, { duration: 300 }),
        withSpring(1, { duration: 300 })
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start bottle session';
      Alert.alert('Error', errorMsg);
      console.error('Failed to start bottle session:', error);
    }
  }, [card, volume, formulaType, temperature, colorValue, pulseValue]);

  const completeBottleSession = useCallback(async () => {
    try {
      const completedMetadata: BottleMetadata = {
        ...(card.activeSession?.metadata as BottleMetadata || {}),
        ...(volume ? { volume: parseInt(volume) } : {}),
        completed: true
      };

      await card.endSession(completedMetadata);
      
      if (onSessionComplete && card.activeSession) {
        onSessionComplete(card.activeSession as ActivitySession);
      }
      console.log('✅ Completed bottle session');

      // Reset form
      setVolume('');
      colorValue.value = withTiming(0, { duration: 500 });
    } catch (error) {
      Alert.alert('Error', 'Failed to complete bottle session');
      console.error('Failed to complete bottle session:', error);
    }
  }, [card, volume, onSessionComplete, colorValue]);

  // Handle timer changes from MultiTimerComponent
  const handleTimerChange = useCallback(async (_timerId: string, _elapsed: number, isRunning: boolean) => {
    if (!card.hasActiveSession && isRunning) {
      // Try to start session when timer starts
      try {
        await startBottleSession();
      } catch (error) {
        // Session couldn't start (blocked by another session)
        // Timer should not be running if session can't start
        console.log('Session blocked, timer should be disabled');
        // The timer is already disabled by the disabled prop
      }
    }
  }, [card.hasActiveSession, startBottleSession]);

  // Format last activity display
  const lastActivity = card.lastSession 
    ? new Date((card.lastSession as ActivitySession).started_at).toLocaleDateString()
    : 'Never';

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorValue.value,
      [0, 1],
      ['transparent', '#e6f7ff']
    );

    return {
      backgroundColor,
      transform: [{ scale: pulseValue.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedActivityCard
        activityType="bottle"
        title="Bottle Feeding"
        subtitle="Track bottle feeding session"
        emoji="🍼"
        isActive={card.hasActiveSession}
        lastActivity={lastActivity}
        disabled={disabled || card.isDisabled}
      >
        {/* DEBUG: Disabled state is now handled visually through grey coloring */}
        
        {/* Main Content Container */}
        <View className="space-y-4">
          
          {/* ✅ UNIFIED SYSTEM - Show session state */}
          {card.hasActiveSession && (
            <View className="bg-green-50 rounded-lg p-3 mb-4">
              <Text className="text-green-700 font-medium text-center">
                Feeding Session Active
              </Text>
              <Text className="text-green-600 text-sm text-center mt-1">
                ⏱️ {Math.floor(card.elapsedSeconds / 60)}m {card.elapsedSeconds % 60}s elapsed
              </Text>
            </View>
          )}
          
          {/* Bottle Details Form */}
          <View className="space-y-3">
            <Text className="text-lg font-semibold text-gray-800 text-center">
              Feeding Details
            </Text>
            
            {/* Volume Input */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Volume (ml)
              </Text>
              <TextInput
                value={volume}
                onChangeText={setVolume}
                placeholder="e.g., 120"
                keyboardType="numeric"
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                editable={!card.isDisabled}
              />
            </View>
            
            {/* Formula Type Selection */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Feed Type
              </Text>
              <View className="flex-row space-x-2">
                {[
                  { key: 'breast_milk', label: '🤱 Breast Milk' },
                  { key: 'formula', label: '🍼 Formula' },
                  { key: 'mixed', label: '🥛 Mixed' }
                ].map((type) => (
                  <Pressable
                    key={type.key}
                    onPress={() => setFormulaType(type.key as any)}
                    disabled={card.isDisabled}
                    className={`flex-1 py-2 px-3 rounded-lg border ${
                      formulaType === type.key
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <Text className={`text-center text-sm font-medium ${
                      formulaType === type.key ? 'text-blue-700' : 'text-gray-700'
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
            persistenceKey={`bottle_${babyId}`}
            disabled={disabled || card.isDisabled}
            exclusive={true}
            showCombinedTotal={false}
            onTimerChange={handleTimerChange}
            sessionCompletion={{
              onSessionComplete: completeBottleSession,
              sessionActive: card.hasActiveSession,
              sessionStartTime: card.activeSession?.started_at ? new Date((card.activeSession as ActivitySession).started_at).getTime() : null,
              completionLabel: "Complete Feeding",
              showCompletionButton: true
            }}
          />
          
          {/* Session Summary */}
          {card.hasActiveSession && card.activeSession && (
            <View className="border-t border-gray-200 pt-4 bg-gray-50 rounded-lg p-3">
              <Text className="text-xs text-gray-500 text-center font-medium mb-1">
                Session Started: {new Date((card.activeSession as ActivitySession).started_at).toLocaleTimeString()}
              </Text>
              {(card.activeSession.metadata as BottleMetadata)?.volume && (
                <Text className="text-xs text-gray-600 text-center">
                  Volume: {(card.activeSession.metadata as BottleMetadata).volume}ml
                </Text>
              )}
            </View>
          )}
        </View>
      </AnimatedActivityCard>
    </Animated.View>
  );
});

export default BottleCard;