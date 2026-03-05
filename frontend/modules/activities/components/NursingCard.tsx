import { useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useActivityCard } from '../../../hooks/useActivityCard';
import { AnimatedActivityCard } from '../../../components/shared/AnimatedActivityCard';
import { MultiTimerComponent, TimerConfig } from '../../../components/shared/MultiTimerComponent';
import type { ActivitySession } from '../../../services/supabase';

export interface NursingCardProps {
  babyId: string;
  onSessionComplete?: (session: ActivitySession) => void;
  disabled?: boolean;
}

// Nursing-specific metadata interface
interface NursingMetadata extends Record<string, unknown> {
  side?: 'left' | 'right' | 'both';
  notes?: string;
  difficulty?: 'easy' | 'normal' | 'difficult';
  leftBreastDuration?: number;
  rightBreastDuration?: number;
  totalSessionDuration?: number;
  currentSide?: 'left' | 'right';
}

export const NursingCard = observer<NursingCardProps>(({ 
  babyId, 
  onSessionComplete,
  disabled = false 
}) => {
  // ✅ NEW UNIFIED SYSTEM - Single hook for all card and session management
  const card = useActivityCard('nursing');

  // Timer configuration for nursing
  const timerConfigs: TimerConfig[] = [
    {
      id: 'left',
      label: 'Left Breast',
      emoji: '🤱',
      color: 'pink'
    },
    {
      id: 'right', 
      label: 'Right Breast',
      emoji: '🤱',
      color: 'pink'
    }
  ];

  const startNursingSession = useCallback(async () => {
    try {
      const nursingMetadata: NursingMetadata = {
        side: 'left',
        difficulty: 'normal',
        currentSide: 'left',
        leftBreastDuration: 0,
        rightBreastDuration: 0,
        totalSessionDuration: 0
      };

      await card.startSession(nursingMetadata);
      console.log('✅ Started nursing session');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start nursing session';
      Alert.alert('Error', errorMsg);
      console.error('Failed to start nursing session:', error);
    }
  }, [card]);

  const completeNursingSession = useCallback(async () => {
    try {
      const completedMetadata = {
        ...(card.activeSession?.metadata as NursingMetadata || {}),
        completed: true
      };

      await card.endSession(completedMetadata);
      
      if (onSessionComplete && card.activeSession) {
        onSessionComplete(card.activeSession as ActivitySession);
      }
      console.log('✅ Completed nursing session');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete nursing session');
      console.error('Failed to complete nursing session:', error);
    }
  }, [card, onSessionComplete]);

  // Handle timer changes from MultiTimerComponent
  const handleTimerChange = useCallback((_timerId: string, _elapsed: number, isRunning: boolean) => {
    if (!card.hasActiveSession) {
      // Start session automatically when first timer starts
      if (isRunning) {
        startNursingSession();
      }
      return;
    }

    // TODO: Update session metadata with current timer states
    // const currentMetadata = card.activeSession?.metadata as NursingMetadata || {};
    // We'd need to add updateSessionMetadata to useActivityCard hook
    // For now, we'll handle this through the existing session data
  }, [card, startNursingSession]);
  
  // Format last activity display
  const lastActivity = card.lastSession 
    ? new Date((card.lastSession as ActivitySession).started_at).toLocaleDateString()
    : 'Never';
  
  return (
    <AnimatedActivityCard
      activityType="nursing"
      title="Nursing"
      subtitle="Track breastfeeding session"
      emoji="🤱"
      isActive={card.hasActiveSession}
      lastActivity={lastActivity}
      disabled={disabled || card.isDisabled}
    >
      {/* Main Content Container */}
      <View className="space-y-4">
        
        {/* Header Section */}
        <View className="mb-2">
          <Text className="text-lg font-semibold text-gray-800 text-center">
            Breast Timers
          </Text>
          {card.hasActiveSession && (
            <Text className="text-sm text-gray-600 text-center mt-1">
              Session Active - Track each breast separately
            </Text>
          )}
          
          {/* ✅ UNIFIED SYSTEM - Show session state */}
          {card.hasActiveSession && (
            <Text className="text-xs text-green-600 text-center mt-1 font-medium">
              ⏱️ {Math.floor(card.elapsedSeconds / 60)}m {card.elapsedSeconds % 60}s elapsed
            </Text>
          )}
        </View>
        
        {/* ✅ CLEAN SEPARATION: MultiTimerComponent handles ALL timer logic */}
        <MultiTimerComponent
          timers={timerConfigs}
          persistenceKey={`nursing_${babyId}`}
          disabled={disabled || card.isDisabled}
          exclusive={true}
          showCombinedTotal={true}
          combinedTotalLabel="Total Session"
          onTimerChange={handleTimerChange}
          sessionCompletion={{
            onSessionComplete: completeNursingSession,
            sessionActive: card.hasActiveSession,
            sessionStartTime: card.activeSession?.started_at ? new Date((card.activeSession as ActivitySession).started_at).getTime() : null,
            completionLabel: "Complete Nursing Session",
            showCompletionButton: true
          }}
        />
        
        {/* Current Side Indicator */}
        {card.hasActiveSession && (
          <View className="bg-gray-50 rounded-lg p-3 mb-4">
            <Text className="text-sm font-medium text-gray-700 text-center">
              Current Side: {(card.activeSession?.metadata as NursingMetadata)?.currentSide || 'None'}
            </Text>
          </View>
        )}
        
        {/* Session Summary */}
        {card.hasActiveSession && card.activeSession && (
          <View className="border-t border-gray-200 pt-4 bg-gray-50 rounded-lg p-3">
            <Text className="text-xs text-gray-500 text-center font-medium mb-1">
              Session Started: {new Date((card.activeSession as ActivitySession).started_at).toLocaleTimeString()}
            </Text>
            <Text className="text-xs text-gray-600 text-center">
              Session ID: {(card.activeSession as ActivitySession).id.slice(0, 8)}...
            </Text>
          </View>
        )}
      </View>
    </AnimatedActivityCard>
  );
});

export default NursingCard;