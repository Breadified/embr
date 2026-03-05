import { useState, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useActivityCard } from '../../../hooks/useActivityCard';
import { MultiTimerComponent, TimerConfig } from '../../../components/shared/MultiTimerComponent';
import { AnimatedActivityCard } from '../../../components/shared/AnimatedActivityCard';
import type { ActivitySession } from '../../../services/supabase';

export interface TummyTimeCardProps {
  babyId: string;
  onSessionComplete?: (session: ActivitySession) => void;
  disabled?: boolean;
}

// Tummy time metadata interface
interface TummyTimeMetadata extends Record<string, unknown> {
  surface?: 'play_mat' | 'bed' | 'couch' | 'floor' | 'blanket';
  mood?: 'happy' | 'neutral' | 'fussy' | 'sleepy';
  activityLevel?: 'low' | 'medium' | 'high';
  achievements?: string[];
  environment?: 'toys' | 'mirror' | 'music' | 'quiet' | 'siblings';
  notes?: string;
}

export const TummyTimeCard = observer<TummyTimeCardProps>(({ 
  babyId, 
  onSessionComplete,
  disabled = false 
}) => {
  // ✅ NEW UNIFIED SYSTEM - Single hook for all card and session management
  const card = useActivityCard('tummy_time');

  // Local state for tummy time-specific inputs
  const [tummyTimeMetadata, setTummyTimeMetadata] = useState<TummyTimeMetadata>({
    surface: 'play_mat',
    mood: 'neutral',
    activityLevel: 'medium',
    achievements: [],
    environment: 'toys'
  });
  
  // Timer configuration for tummy time
  const timerConfigs: TimerConfig[] = [
    {
      id: 'tummy_time',
      label: 'Tummy Time',
      emoji: '🤸',
      color: card.activityColor
    }
  ];

  // Handle timer changes with unified system
  const handleTimerChange = useCallback(async (_timerId: string, elapsed: number, isRunning: boolean) => {
    if (isRunning && !card.hasActiveSession) {
      // Start session when timer starts
      try {
        await card.startSession(tummyTimeMetadata);
        console.log('✅ Started tummy time session');
      } catch (error) {
        Alert.alert('Error', 'Failed to start tummy time session');
        console.error('Failed to start tummy time session:', error);
      }
    } else if (!isRunning && card.hasActiveSession) {
      // End session when timer stops
      try {
        const completedMetadata = { 
          ...tummyTimeMetadata, 
          duration: elapsed, 
          completed: true 
        };
        await card.endSession(completedMetadata);
        
        if (onSessionComplete && card.activeSession) {
          onSessionComplete(card.activeSession as ActivitySession);
        }
        console.log('✅ Completed tummy time session');
      } catch (error) {
        Alert.alert('Error', 'Failed to complete tummy time session');
        console.error('Failed to complete tummy time session:', error);
      }
    }
  }, [card, tummyTimeMetadata, onSessionComplete]);

  // Handle surface selection
  const handleSurfaceSelect = useCallback((surface: 'play_mat' | 'bed' | 'couch' | 'floor' | 'blanket') => {
    const updatedMetadata = { ...tummyTimeMetadata, surface };
    setTummyTimeMetadata(updatedMetadata);
  }, [tummyTimeMetadata]);

  // Handle mood selection
  const handleMoodSelect = useCallback((mood: 'happy' | 'neutral' | 'fussy' | 'sleepy') => {
    const updatedMetadata = { ...tummyTimeMetadata, mood };
    setTummyTimeMetadata(updatedMetadata);
  }, [tummyTimeMetadata]);

  // Handle activity level selection
  const handleActivityLevelSelect = useCallback((activityLevel: 'low' | 'medium' | 'high') => {
    const updatedMetadata = { ...tummyTimeMetadata, activityLevel };
    setTummyTimeMetadata(updatedMetadata);
  }, [tummyTimeMetadata]);

  // Handle achievement toggle
  const handleAchievementToggle = useCallback((achievement: string) => {
    const currentAchievements = tummyTimeMetadata.achievements || [];
    const updatedAchievements = currentAchievements.includes(achievement)
      ? currentAchievements.filter(a => a !== achievement)
      : [...currentAchievements, achievement];
    
    const updatedMetadata = { ...tummyTimeMetadata, achievements: updatedAchievements };
    setTummyTimeMetadata(updatedMetadata);
  }, [tummyTimeMetadata]);

  const availableAchievements = [
    'head_lift',
    'pushed_up',
    'rolled_over',
    'reached_for_toy',
    'smiled',
    'made_sounds'
  ];

  // Get last activity from unified card system
  const lastActivity = card.lastSession 
    ? new Date((card.lastSession as ActivitySession).started_at).toLocaleDateString()
    : 'Never';

  return (
    <AnimatedActivityCard
      activityType="tummy_time"
      title="Tummy Time"
      subtitle="Track tummy time session"
      emoji="🤸"
      isActive={card.hasActiveSession}
      lastActivity={lastActivity}
      disabled={disabled || card.isDisabled}
    >
      
      {/* Timer Component */}
      <View className="items-center mb-6">
        <MultiTimerComponent
          timers={timerConfigs}
          persistenceKey={`tummy_time_${babyId}`}
          disabled={disabled || card.isDisabled}
          exclusive={true}
          showCombinedTotal={false}
          onTimerChange={handleTimerChange}
        />
      </View>

      {/* Surface Selection */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Surface</Text>
        <View className="flex-row flex-wrap gap-2">
          {([
            { value: 'play_mat', label: 'Play Mat', emoji: '🧸' },
            { value: 'bed', label: 'Bed', emoji: '🛏️' },
            { value: 'couch', label: 'Couch', emoji: '🛋️' },
            { value: 'floor', label: 'Floor', emoji: '🏠' },
            { value: 'blanket', label: 'Blanket', emoji: '🧺' }
          ] as const).map((surface) => (
            <Pressable
              key={surface.value}
              onPress={() => handleSurfaceSelect(surface.value)}
              disabled={disabled || card.isDisabled}
              className={`px-3 py-2 rounded-lg border ${
                tummyTimeMetadata.surface === surface.value 
                  ? 'bg-orange-500 border-orange-500' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`text-center text-xs font-medium mb-1 ${
                tummyTimeMetadata.surface === surface.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {surface.emoji}
              </Text>
              <Text className={`text-center text-xs ${
                tummyTimeMetadata.surface === surface.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {surface.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Mood Selection */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Baby&apos;s Mood</Text>
        <View className="flex-row gap-2">
          {([
            { value: 'happy', label: 'Happy', emoji: '😊' },
            { value: 'neutral', label: 'Neutral', emoji: '😐' },
            { value: 'fussy', label: 'Fussy', emoji: '😤' },
            { value: 'sleepy', label: 'Sleepy', emoji: '😴' }
          ] as const).map((mood) => (
            <Pressable
              key={mood.value}
              onPress={() => handleMoodSelect(mood.value)}
              disabled={disabled || card.isDisabled}
              className={`flex-1 py-3 px-2 rounded-lg border ${
                tummyTimeMetadata.mood === mood.value 
                  ? 'bg-orange-500 border-orange-500' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`text-center text-lg mb-1 ${
                tummyTimeMetadata.mood === mood.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {mood.emoji}
              </Text>
              <Text className={`text-center text-xs font-medium ${
                tummyTimeMetadata.mood === mood.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {mood.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Activity Level */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Activity Level</Text>
        <View className="flex-row gap-2">
          {([
            { value: 'low', label: 'Low', emoji: '🐌', description: 'Relaxed' },
            { value: 'medium', label: 'Medium', emoji: '🚶', description: 'Active' },
            { value: 'high', label: 'High', emoji: '🏃', description: 'Very Active' }
          ] as const).map((level) => (
            <Pressable
              key={level.value}
              onPress={() => handleActivityLevelSelect(level.value)}
              disabled={disabled || card.isDisabled}
              className={`flex-1 py-3 px-2 rounded-lg border ${
                tummyTimeMetadata.activityLevel === level.value 
                  ? 'bg-orange-500 border-orange-500' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`text-center text-lg mb-1 ${
                tummyTimeMetadata.activityLevel === level.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {level.emoji}
              </Text>
              <Text className={`text-center text-xs font-medium ${
                tummyTimeMetadata.activityLevel === level.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {level.description}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Achievements */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Achievements {(tummyTimeMetadata.achievements?.length || 0) > 0 && `(${tummyTimeMetadata.achievements?.length})`}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {availableAchievements.map((achievement) => {
            const isSelected = tummyTimeMetadata.achievements?.includes(achievement) || false;
            const labels: Record<string, { label: string; emoji: string }> = {
              head_lift: { label: 'Head Lift', emoji: '💪' },
              pushed_up: { label: 'Pushed Up', emoji: '⬆️' },
              rolled_over: { label: 'Rolled Over', emoji: '🔄' },
              reached_for_toy: { label: 'Reached', emoji: '🤏' },
              smiled: { label: 'Smiled', emoji: '😊' },
              made_sounds: { label: 'Sounds', emoji: '🗣️' }
            };
            
            return (
              <Pressable
                key={achievement}
                onPress={() => handleAchievementToggle(achievement)}
                disabled={disabled || card.isDisabled}
                className={`px-3 py-2 rounded-lg border ${
                  isSelected 
                    ? 'bg-orange-500 border-orange-500' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`text-center text-xs font-medium ${
                  isSelected 
                    ? 'text-white' 
                    : 'text-gray-600'
                }`}>
                  {labels[achievement]?.emoji} {labels[achievement]?.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      
      {/* Session Info */}
      {card.hasActiveSession && card.activeSession && (
        <View className="border-t border-gray-100 pt-4">
          <Text className="text-xs text-gray-500 text-center">
            Session started: {new Date((card.activeSession as ActivitySession).started_at).toLocaleTimeString()}
          </Text>
          <Text className="text-xs text-gray-500 mt-1 text-center">
            Surface: {tummyTimeMetadata.surface} | Mood: {tummyTimeMetadata.mood}
            {(tummyTimeMetadata.achievements?.length ?? 0) > 0 && 
              ` | ${tummyTimeMetadata.achievements?.length ?? 0} achievements`}
          </Text>
        </View>
      )}
      
    </AnimatedActivityCard>
  );
});

export default TummyTimeCard;