import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SleepCard } from './SleepCard';

/**
 * SleepCardDemo - Demonstration of SleepCard functionality
 * 
 * Features demonstrated:
 * - Real-time sleep timer with start/stop functionality
 * - Sleep quality selection (Good, Fair, Poor) with emoji indicators
 * - Sleep location tracking (Crib, Arms, Carrier, Stroller, Bed, Bassinet)
 * - Quick duration buttons for fast nap logging
 * - Dual mode: Active timer OR manual entry
 * - Complete session workflow with offline storage
 * - Auto-collapse behavior and cross-card interaction
 * - Session progress display in collapsed header
 */
export const SleepCardDemo: React.FC = () => {
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
        <Text className="text-2xl font-bold text-gray-800">Sleep Card Demo</Text>
        <Text className="text-gray-600 mt-2">
          Interactive demonstration of sleep tracking functionality
        </Text>
      </View>

      {/* Demo Instructions */}
      <View className="mx-4 mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <Text className="text-lg font-semibold text-blue-800 mb-2">
          🌙 Try These Features:
        </Text>
        <View className="space-y-1">
          <Text className="text-blue-700">• Tap card to expand/collapse</Text>
          <Text className="text-blue-700">• Start real-time sleep timer</Text>
          <Text className="text-blue-700">• Select sleep quality (Good 😴, Fair 😊, Poor 😫)</Text>
          <Text className="text-blue-700">• Choose sleep location (Crib, Arms, Carrier, etc.)</Text>
          <Text className="text-blue-700">• Use quick duration buttons for naps</Text>
          <Text className="text-blue-700">• Log completed sleep without timer</Text>
          <Text className="text-blue-700">• Wake up from active sleep session</Text>
          <Text className="text-blue-700">• Watch progress in collapsed header</Text>
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
        <SleepCard
          babyId="demo-baby-1"
          onCardStateChange={handleCardStateChange('Sleep')}
          isOtherCardExpanded={expandedCard !== null && expandedCard !== 'Sleep'}
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
            <Text className="font-semibold text-blue-700">Real-time Sleep Timer</Text>
            <Text className="text-gray-600">
              Start sleep timer that runs in real-time with live duration updates
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-blue-700">Quality Tracking</Text>
            <Text className="text-gray-600">
              Rate sleep quality with visual emoji indicators (Good 😴, Fair 😊, Poor 😫)
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-blue-700">Location Tracking</Text>
            <Text className="text-gray-600">
              Track where baby slept: Crib, Arms, Carrier, Stroller, Bed, Bassinet
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-blue-700">Quick Nap Entry</Text>
            <Text className="text-gray-600">
              Fast logging with preset durations: 15min, 30min, 45min, 1hr, 1.5hr, 2hr
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-blue-700">Dual Input Modes</Text>
            <Text className="text-gray-600">
              Use active timer for live tracking OR quick entry for completed sleeps
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-blue-700">Active Session Management</Text>
            <Text className="text-gray-600">
              Clear Sleep in Progress display with wake up functionality
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-blue-700">Persistent State</Text>
            <Text className="text-gray-600">
              Sleep sessions survive app restarts - timer continues from where you left off
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
            • <Text className="font-semibold">Timer Precision:</Text> Real-time updates every second with accurate duration calculation
          </Text>
          <Text className="text-gray-700">
            • <Text className="font-semibold">State Management:</Text> Legend State with reactive updates and persistence
          </Text>
          <Text className="text-gray-700">
            • <Text className="font-semibold">Session Recovery:</Text> Automatic recovery of active sleep sessions on app restart
          </Text>
          <Text className="text-gray-700">
            • <Text className="font-semibold">Dual Mode UI:</Text> Dynamic interface that adapts between timer and manual entry
          </Text>
          <Text className="text-gray-700">
            • <Text className="font-semibold">Base Pattern:</Text> Extends useBaseActivityCard with sleep-specific enhancements
          </Text>
          <Text className="text-gray-700">
            • <Text className="font-semibold">Cross-Session Data:</Text> Quality and location settings persist between sessions
          </Text>
        </View>
      </View>

      {/* Usage Examples */}
      <View className="mx-4 mb-8 p-4 bg-green-50 rounded-xl border border-green-200">
        <Text className="text-lg font-semibold text-green-800 mb-3">
          💡 Real-World Usage Examples:
        </Text>
        
        <View className="space-y-3">
          <View>
            <Text className="font-semibold text-green-700">Live Nighttime Sleep</Text>
            <Text className="text-green-600">
              1. Select Crib location → 2. Start Sleep timer at bedtime → 3. Wake Up when baby wakes → 4. Rate quality
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-green-700">Quick Nap Logging</Text>
            <Text className="text-green-600">
              Use 30 min quick button → Select Arms location → Choose Good quality → Log Sleep
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-green-700">Stroller Nap</Text>
            <Text className="text-green-600">
              Select Stroller location → Start timer during walk → Wake up when arriving home
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-green-700">Historical Entry</Text>
            <Text className="text-green-600">
              Log yesterday’s missed nap: 1 hour → Bassinet → Fair → Log Sleep (no timer needed)
            </Text>
          </View>
          
          <View>
            <Text className="font-semibold text-green-700">Session Recovery</Text>
            <Text className="text-green-600">
              Start sleep timer → Close app → Reopen hours later → Timer still running with accurate duration
            </Text>
          </View>
        </View>
      </View>

      {/* Sleep Patterns Insights */}
      <View className="mx-4 mb-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
        <Text className="text-lg font-semibold text-yellow-800 mb-3">
          📈 Sleep Pattern Insights:
        </Text>
        
        <View className="space-y-2">
          <Text className="text-yellow-700">
            • <Text className="font-semibold">Quality Trends:</Text> Track sleep quality over time to identify patterns
          </Text>
          <Text className="text-yellow-700">
            • <Text className="font-semibold">Location Preferences:</Text> Discover which locations lead to better sleep
          </Text>
          <Text className="text-yellow-700">
            • <Text className="font-semibold">Duration Tracking:</Text> Monitor total daily sleep and nap frequencies
          </Text>
          <Text className="text-yellow-700">
            • <Text className="font-semibold">Sleep Windows:</Text> Identify optimal nap times and bedtime routines
          </Text>
          <Text className="text-yellow-700">
            • <Text className="font-semibold">Environmental Factors:</Text> Future: Track room temperature, noise, lighting
          </Text>
        </View>
      </View>

      {/* Parent Tips */}
      <View className="mx-4 mb-8 p-4 bg-purple-50 rounded-xl border border-purple-200">
        <Text className="text-lg font-semibold text-purple-800 mb-3">
          👶 Parent Tips for Sleep Tracking:
        </Text>
        
        <View className="space-y-2">
          <Text className="text-purple-700">
            • <Text className="font-semibold">Start Timer Early:</Text> Begin tracking when putting baby down, not when they fall asleep
          </Text>
          <Text className="text-purple-700">
            • <Text className="font-semibold">Quality vs Duration:</Text> Sometimes short, good quality sleep is better than long, poor sleep
          </Text>
          <Text className="text-purple-700">
            • <Text className="font-semibold">Location Consistency:</Text> Track location to identify sleep environment preferences
          </Text>
          <Text className="text-purple-700">
            • <Text className="font-semibold">Quick Logging:</Text> Use quick buttons for rapid nap logging when handling other tasks
          </Text>
          <Text className="text-purple-700">
            • <Text className="font-semibold">Historical Context:</Text> Log past sleeps to build complete daily picture
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};