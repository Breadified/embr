import { useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useActivityCard } from '../../../hooks/useActivityCard';
import { MultiTimerComponent, TimerConfig } from '../../../components/shared/MultiTimerComponent';
import { AnimatedActivityCard } from '../../../components/shared/AnimatedActivityCard';
import type { ActivitySession } from '../../../services/supabase';

export interface PumpingCardProps {
  babyId: string;
  onSessionComplete?: (session: ActivitySession) => void;
  disabled?: boolean;
}

// Pumping-specific metadata interface
interface PumpingMetadata extends Record<string, unknown> {
  volumeLeft?: number; // ml
  volumeRight?: number; // ml
  pumpType?: 'electric' | 'manual' | 'hospital_grade';
  pumpSetting?: 'low' | 'medium' | 'high' | 'letdown';
  breastSide?: 'left' | 'right' | 'both';
  comfort?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export const PumpingCard = observer<PumpingCardProps>(({ 
  babyId, 
  onSessionComplete,
  disabled = false 
}) => {
  // ✅ NEW UNIFIED SYSTEM - Single hook for all card and session management
  const card = useActivityCard('pumping');

  // Local state for pumping-specific inputs
  const [pumpingMetadata, setPumpingMetadata] = useState<PumpingMetadata>({
    volumeLeft: 0,
    volumeRight: 0,
    pumpType: 'electric',
    pumpSetting: 'medium',
    breastSide: 'both',
    comfort: 3
  });
  
  // Timer configuration for pumping
  const timerConfigs: TimerConfig[] = [
    {
      id: 'pumping',
      label: 'Pumping',
      emoji: '🍼',
      color: card.activityColor
    }
  ];

  // Handle timer changes with unified system
  const handleTimerChange = useCallback(async (_timerId: string, elapsed: number, isRunning: boolean) => {
    if (isRunning && !card.hasActiveSession) {
      // Start session when timer starts
      try {
        await card.startSession(pumpingMetadata);
        console.log('✅ Started pumping session');
      } catch (error) {
        Alert.alert('Error', 'Failed to start pumping session');
        console.error('Failed to start pumping session:', error);
      }
    } else if (!isRunning && card.hasActiveSession) {
      // End session when timer stops
      try {
        const completedMetadata = { 
          ...pumpingMetadata, 
          duration: elapsed, 
          completed: true 
        };
        await card.endSession(completedMetadata);
        
        if (onSessionComplete && card.activeSession) {
          onSessionComplete(card.activeSession as ActivitySession);
        }
        console.log('✅ Completed pumping session');
      } catch (error) {
        Alert.alert('Error', 'Failed to complete pumping session');
        console.error('Failed to complete pumping session:', error);
      }
    }
  }, [card, pumpingMetadata, onSessionComplete]);

  // Handle volume changes
  const handleVolumeChange = useCallback((side: 'left' | 'right', value: string) => {
    const volume = parseFloat(value) || 0;
    const updatedMetadata = { 
      ...pumpingMetadata, 
      [side === 'left' ? 'volumeLeft' : 'volumeRight']: volume 
    };
    setPumpingMetadata(updatedMetadata);
    
    // Note: Real-time metadata updates could be added to the unified system if needed
  }, [pumpingMetadata]);

  // Handle pump type selection
  const handlePumpTypeSelect = useCallback((pumpType: 'electric' | 'manual' | 'hospital_grade') => {
    const updatedMetadata = { ...pumpingMetadata, pumpType };
    setPumpingMetadata(updatedMetadata);
  }, [pumpingMetadata]);

  // Handle breast side selection
  const handleBreastSideSelect = useCallback((breastSide: 'left' | 'right' | 'both') => {
    const updatedMetadata = { ...pumpingMetadata, breastSide };
    setPumpingMetadata(updatedMetadata);
  }, [pumpingMetadata]);

  // Handle comfort rating
  const handleComfortRating = useCallback((comfort: 1 | 2 | 3 | 4 | 5) => {
    const updatedMetadata = { ...pumpingMetadata, comfort };
    setPumpingMetadata(updatedMetadata);
  }, [pumpingMetadata]);

  const totalVolume = (pumpingMetadata.volumeLeft || 0) + (pumpingMetadata.volumeRight || 0);

  // Get last activity from unified card system
  const lastActivity = card.lastSession 
    ? new Date((card.lastSession as ActivitySession).started_at).toLocaleDateString()
    : 'Never';

  return (
    <AnimatedActivityCard
      activityType="pumping"
      title="Pumping"
      subtitle="Track pumping session"
      emoji="🤰"
      isActive={card.hasActiveSession}
      lastActivity={lastActivity}
      disabled={disabled || card.isDisabled}
    >
      {/* FIXED: Removed duplicate header - AnimatedActivityCard already provides this! */}
      
      {/* Timer Component */}
      <View className="items-center mb-6">
        <MultiTimerComponent
          timers={timerConfigs}
          persistenceKey={`pumping_${babyId}`}
          disabled={disabled || card.isDisabled}
          exclusive={true}
          showCombinedTotal={false}
          onTimerChange={handleTimerChange}
        />
      </View>

      {/* Breast Side Selection */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Breast Side</Text>
        <View className="flex-row gap-2">
          {([
            { value: 'left', label: 'Left', emoji: '👈' },
            { value: 'right', label: 'Right', emoji: '👉' },
            { value: 'both', label: 'Both', emoji: '🤲' }
          ] as const).map((side) => (
            <Pressable
              key={side.value}
              onPress={() => handleBreastSideSelect(side.value)}
              className={`flex-1 py-2 px-3 rounded-lg border ${
                pumpingMetadata.breastSide === side.value 
                  ? 'bg-green-500 border-green-500' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`text-center text-lg mb-1 ${
                pumpingMetadata.breastSide === side.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {side.emoji}
              </Text>
              <Text className={`text-center text-xs font-medium ${
                pumpingMetadata.breastSide === side.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {side.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Volume Inputs */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Volume Output {totalVolume > 0 && `(Total: ${totalVolume}ml)`}
        </Text>
        <View className="flex-row gap-3">
          {/* Left Breast Volume */}
          <View className="flex-1">
            <Text className="text-xs text-gray-600 mb-1">Left Breast (ml)</Text>
            <TextInput
              value={pumpingMetadata.volumeLeft?.toString() || ''}
              onChangeText={(value) => handleVolumeChange('left', value)}
              keyboardType="numeric"
              placeholder="0"
              className="p-3 border border-gray-200 rounded-lg bg-white text-gray-900 text-center"
            />
          </View>
          
          {/* Right Breast Volume */}
          <View className="flex-1">
            <Text className="text-xs text-gray-600 mb-1">Right Breast (ml)</Text>
            <TextInput
              value={pumpingMetadata.volumeRight?.toString() || ''}
              onChangeText={(value) => handleVolumeChange('right', value)}
              keyboardType="numeric"
              placeholder="0"
              className="p-3 border border-gray-200 rounded-lg bg-white text-gray-900 text-center"
            />
          </View>
        </View>
      </View>

      {/* Pump Type Selection */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Pump Type</Text>
        <View className="flex-row gap-2">
          {([
            { value: 'electric', label: 'Electric', emoji: '⚡' },
            { value: 'manual', label: 'Manual', emoji: '🤚' },
            { value: 'hospital_grade', label: 'Hospital', emoji: '🏥' }
          ] as const).map((pump) => (
            <Pressable
              key={pump.value}
              onPress={() => handlePumpTypeSelect(pump.value)}
              className={`flex-1 py-2 px-3 rounded-lg border ${
                pumpingMetadata.pumpType === pump.value 
                  ? 'bg-green-500 border-green-500' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`text-center text-lg mb-1 ${
                pumpingMetadata.pumpType === pump.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {pump.emoji}
              </Text>
              <Text className={`text-center text-xs font-medium ${
                pumpingMetadata.pumpType === pump.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {pump.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Comfort Rating */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Comfort Level</Text>
        <View className="flex-row gap-1 justify-center">
          {([1, 2, 3, 4, 5] as const).map((rating) => (
            <Pressable
              key={rating}
              onPress={() => handleComfortRating(rating)}
              className="p-1"
            >
              <Text className="text-2xl">
                {rating <= (pumpingMetadata.comfort ?? 0) ? '⭐' : '☆'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      
      {/* Session Info */}
      {card.hasActiveSession && card.activeSession && (
        <View className="border-t border-gray-100 pt-4">
          <Text className="text-xs text-gray-500 text-center">
            Session started: {new Date((card.activeSession as ActivitySession).started_at).toLocaleTimeString()}
          </Text>
          {totalVolume > 0 && (
            <Text className="text-xs text-gray-500 mt-1 text-center">
              Total output: {totalVolume}ml | Side: {pumpingMetadata.breastSide}
            </Text>
          )}
        </View>
      )}
      
    </AnimatedActivityCard>
  );
});

export default PumpingCard;