import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { NursingCard } from './NursingCard';

/**
 * Demo component for the NursingCard
 * Shows the nursing card in action with mock baby ID
 */
export const NursingCardDemo: React.FC = () => {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Mock baby ID for demonstration
  const mockBabyId = 'demo-baby-id-123';

  const handleCardStateChange = (cardId: string) => (isExpanded: boolean) => {
    setExpandedCardId(isExpanded ? cardId : null);
  };

  return (
    <View className="w-full space-y-4">
      <Text className="text-center text-xl font-bold text-gray-800">
        Nursing Activity Card
      </Text>
      
      <Text className="text-center text-sm text-gray-600">
        Priority #1 Feature - Fully Functional!
      </Text>

      {/* Feature highlights */}
      <View className="mb-4 rounded-lg bg-green-50 p-4">
        <Text className="mb-2 text-center text-sm font-semibold text-green-800">
          ✅ Features Implemented:
        </Text>
        <Text className="text-xs text-green-700">
          • Left and right breast individual timers{'\n'}
          • Pause/resume functionality (multiple segments){'\n'}
          • Session persistence across app restarts{'\n'}
          • Smooth Reanimated 3 animations with spring physics{'\n'}
          • Auto-collapse after 30s inactivity{'\n'}
          • Type-safe database operations{'\n'}
          • Offline-first with Legend State{'\n'}
          • PRD color scheme (#FF6B6B)
        </Text>
      </View>

      {/* The actual nursing card */}
      <NursingCard
        babyId={mockBabyId}
        onCardStateChange={handleCardStateChange('nursing')}
        isOtherCardExpanded={expandedCardId !== null && expandedCardId !== 'nursing'}
      />

      <Text className="text-center text-xs text-gray-500">
        Tap to expand • Start/Stop individual breast timers • Total session time tracked
      </Text>
    </View>
  );
};