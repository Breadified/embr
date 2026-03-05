import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { appState$, appActions } from '../state/appState';
import { PumpingCard } from './PumpingCard';
import { SleepCard } from './SleepCard';
import { useState } from 'react';

// Test component to validate Reanimated 3, Legend State, and new Activity Cards
export const TestComponents = () => {
  const scale = useSharedValue(1);
  const isInitialized = appState$.isInitialized.get();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePress = () => {
    scale.value = withSpring(scale.value === 1 ? 1.2 : 1, {
      duration: 300,
    });
    appActions.initialize();
  };

  const handleCardStateChange = (cardName: string) => (isExpanded: boolean) => {
    setExpandedCard(isExpanded ? cardName : null);
  };

  return (
    <ScrollView className="flex-1 bg-gray-100">
      {/* Original Test Section */}
      <View className="items-center gap-4 p-6 bg-white">
        <Text className="text-xl font-bold text-gray-800">System Tests</Text>
        
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={handlePress}
            className="rounded-lg bg-blue-500 px-6 py-3"
          >
            <Text className="text-center font-semibold text-white">
              Test Animation
            </Text>
          </Pressable>
        </Animated.View>

        <Text className="text-sm text-gray-600">
          Legend State initialized: {isInitialized ? '✅' : '❌'}
        </Text>
        
        <Text className="text-sm text-gray-600">
          Expanded Card: {expandedCard || 'None'}
        </Text>
      </View>

      {/* New Activity Cards */}
      <View className="mt-4">
        <Text className="text-lg font-bold text-gray-800 px-4 mb-4">
          New Activity Cards (Sprint 2 - Day 2)
        </Text>
        
        <PumpingCard
          babyId="test-baby"
          onCardStateChange={handleCardStateChange('Pumping')}
          isOtherCardExpanded={expandedCard !== null && expandedCard !== 'Pumping'}
        />
        
        <SleepCard
          babyId="test-baby"
          onCardStateChange={handleCardStateChange('Sleep')}
          isOtherCardExpanded={expandedCard !== null && expandedCard !== 'Sleep'}
        />
      </View>
      
      {/* Bottom padding */}
      <View className="h-20" />
    </ScrollView>
  );
};
