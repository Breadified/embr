import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { PumpingCard } from './PumpingCard';

/**
 * PumpingCardDemo - Demonstration of PumpingCard functionality
 * 
 * Features demonstrated:
 * - Left/Right breast amount tracking with quick actions
 * - Auto-calculated total amount display
 * - Session timer with start/stop functionality
 * - Pump type selection (Manual, Electric, Hospital grade)
 * - Complete session workflow with offline storage
 * - Auto-collapse behavior and cross-card interaction
 * - Session progress display in collapsed header
 */
export const PumpingCardDemo: React.FC = () => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleCardStateChange = (cardName: string) => (isExpanded: boolean) => {
    setExpandedCard(isExpanded ? cardName : null);
    
    if (isExpanded) {
      console.log(`📱 ${cardName} card expanded`);
    } else {
      console.log(`📱 ${cardName} card collapsed`);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-white p-6 border border-gray-100">
        <Text className="text-2xl font-bold text-gray-800">Pumping Card Demo</Text>
        <Text className="text-gray-600 mt-2">
          Interactive demonstration of breast pump tracking functionality
        </Text>
      </View>

      {/* Demo Instructions */}
      <View className="mx-4 mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
        <Text className="text-lg font-semibold text-purple-800 mb-2">
          🚀 Try These Features:
        </Text>
        <View className="space-y-1">
          <Text className="text-purple-700">• Tap card to expand/collapse</Text>
          <Text className="text-purple-700">• Select pump type (Manual, Electric, Hospital)</Text>
          <Text className="text-purple-700">• Use quick amount buttons for each breast</Text>
          <Text className="text-purple-700">• Enter custom amounts with number inputs</Text>
          <Text className="text-purple-700">• Watch total amount auto-calculate</Text>
          <Text className="text-purple-700">• Start/stop session timer</Text>
          <Text className="text-purple-700">• Complete full pumping session</Text>
          <Text className="text-purple-700">• Card auto-collapses after 30s inactivity</Text>
        </View>
      </View>

      {/* Current State Display */}
      <View className="mx-4 mt-4 p-4 bg-white rounded-xl border border-gray-100">
        <Text className="text-lg font-semibold text-gray-800 mb-2">
          📊 Current State:
        </Text>
        <Text className="text-gray-600">
          Expanded Card: {expandedCard || 'None'}
        </Text>
      </View>

      {/* Demo Cards */}
      <View className="mt-6">
        <PumpingCard
          babyId="demo-baby-1"
          onCardStateChange={handleCardStateChange('Pumping')}
          isOtherCardExpanded={expandedCard !== null && expandedCard !== 'Pumping'}
        />

        {/* Second card to test cross-card interaction */}
        <View className="mx-4 mb-4 overflow-hidden rounded-xl bg-white border border-gray-100">
          <View className="bg-gray-500 p-4">
            <Text className="text-lg font-bold text-white">Another Activity Card</Text>
            <Text className="text-sm text-white/80">Tap to test cross-card collapse</Text>
          </View>
        </View>
      </View>

      {/* Feature Highlights */}
      <View className="mx-4 mt-4 mb-8 p-4 bg-white rounded-xl border border-gray-100">
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          ✨ Key Features Demonstrated:
        </Text>
        
        <View className="space-y-3">
          <View>
            <Text className="font-semibold text-purple-700">Dual Breast Tracking</Text>
            <Text className="text-gray-600">
              Separate amount inputs for left and right breast with quick action buttons
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-purple-700">Auto-calculated Total</Text>
            <Text className="text-gray-600">
              Total amount updates automatically as you enter individual amounts
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-purple-700">Session Timer</Text>
            <Text className="text-gray-600">
              Track pumping duration with start/stop timer functionality
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-purple-700">Pump Type Selection</Text>
            <Text className="text-gray-600">
              Choose between Manual, Electric, or Hospital grade pumps
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-purple-700">Offline-First</Text>
            <Text className="text-gray-600">
              All data stored locally with AsyncStorage - works without internet
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-purple-700">Session Management</Text>
            <Text className="text-gray-600">
              Complete workflow from session start to completion with progress tracking
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-purple-700">Smart UI Behavior</Text>
            <Text className="text-gray-600">
              Auto-collapse after inactivity, cross-card interaction, progress display in header
            </Text>
          </View>
        </View>
      </View>

      {/* Technical Details */}
      <View className="mx-4 mb-8 p-4 bg-gray-50 rounded-xl">
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          🔧 Technical Implementation:
        </Text>
        
        <View className="space-y-2">
          <Text className="text-gray-700">
            • <Text className="font-semibold">State Management:</Text> Legend State with reactive updates
          </Text>
          <Text className="text-gray-700">
            • <Text className="font-semibold">Persistence:</Text> AsyncStorage for offline-first experience
          </Text>
          <Text className="text-gray-700">
            • <Text className="font-semibold">Animations:</Text> React Native Reanimated 3 with spring physics
          </Text>
          <Text className="text-gray-700">
            • <Text className="font-semibold">Base Pattern:</Text> Extends useBaseActivityCard hook
          </Text>
          <Text className="text-gray-700">
            • <Text className="font-semibold">Timer Management:</Text> Real-time updates with interval-based duration tracking
          </Text>
          <Text className="text-gray-700">
            • <Text className="font-semibold">Session Data:</Text> Structured offline sessions with metadata
          </Text>
        </View>
      </View>

      {/* Usage Examples */}
      <View className="mx-4 mb-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <Text className="text-lg font-semibold text-blue-800 mb-3">
          💡 Real-World Usage Examples:
        </Text>
        
        <View className="space-y-3">
          <View>
            <Text className="font-semibold text-blue-700">Morning Pump Session</Text>
            <Text className="text-blue-600">
              1. Select Electric pump type → 2. Start timer → 3. Add amounts: Left 60ml, Right 80ml → 4. Complete session
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-blue-700">Quick Amount Entry</Text>
            <Text className="text-blue-600">
              Use quick buttons for common amounts (40ml left, 60ml right) for faster logging
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-blue-700">Timer-Free Logging</Text>
            <Text className="text-blue-600">
              Enter amounts directly and start session without timer for quick historical entries
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-blue-700">Session Recovery</Text>
            <Text className="text-blue-600">
              App restart during active session will restore timer and continue from where you left off
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};