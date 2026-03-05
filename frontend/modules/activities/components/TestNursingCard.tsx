/**
 * 🚨 EMERGENCY TESTING COMPONENT
 * 
 * This is a SIMPLIFIED version of NursingCard to isolate rendering issues.
 * If this renders, the problem is in the complex NursingCard.
 * If this doesn't render, the problem is deeper in the system.
 */

import React from 'react';
import { View, Text } from 'react-native';

export interface TestNursingCardProps {
  babyId: string;
}

export const TestNursingCard: React.FC<TestNursingCardProps> = ({ babyId }) => {
  console.log('🧪 TestNursingCard rendering with babyId:', babyId);
  
  return (
    <View className="bg-red-100 border-2 border-red-500 rounded-lg p-4 mx-4 mb-4">
      <Text className="text-red-800 font-bold text-lg text-center">
        🧪 TEST NURSING CARD
      </Text>
      <Text className="text-red-600 text-center mt-2">
        Baby ID: {babyId}
      </Text>
      <Text className="text-red-600 text-center mt-2">
        If you see this, basic rendering works!
      </Text>
      
      {/* Simulated dual timers */}
      <View className="flex-row gap-4 mt-4">
        <View className="flex-1 bg-pink-200 p-4 rounded-lg items-center">
          <Text className="text-pink-800 font-bold">Left Breast 🤱</Text>
          <Text className="text-2xl font-mono text-pink-800 my-2">00:00</Text>
          <View className="bg-pink-500 px-4 py-2 rounded-lg">
            <Text className="text-white font-medium">▶ Start</Text>
          </View>
        </View>
        
        <View className="flex-1 bg-pink-200 p-4 rounded-lg items-center">
          <Text className="text-pink-800 font-bold">Right Breast 🤱</Text>
          <Text className="text-2xl font-mono text-pink-800 my-2">00:00</Text>
          <View className="bg-pink-500 px-4 py-2 rounded-lg">
            <Text className="text-white font-medium">▶ Start</Text>
          </View>
        </View>
      </View>
      
      <Text className="text-red-600 text-center mt-4 text-xs">
        🎯 THIS IS THE MISSING UI YOU REPORTED!
      </Text>
    </View>
  );
};

export default TestNursingCard;