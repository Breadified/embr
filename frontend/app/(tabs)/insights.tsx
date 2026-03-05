/**
 * Insights Screen - Data Analytics Tab
 *
 * Shows analytics, trends, and insights about baby's activities.
 * Includes charts, patterns, and helpful recommendations.
 */

import { View, Text } from 'react-native';
import { observer } from '@legendapp/state/react';

export default observer(function InsightsScreen() {
  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">
        <View className="bg-green-50 p-8 rounded-xl border border-green-200 max-w-sm">
          <Text className="text-xl font-bold text-green-800 text-center mb-4">
            📊 Insights Screen
          </Text>
          <Text className="text-sm text-green-600 text-center mb-4">
            This screen will show activity patterns, trends, and helpful analytics about your baby&apos;s routines.
          </Text>
          <Text className="text-xs text-gray-600 text-center">
            Coming soon in Sprint 1!
          </Text>
        </View>
      </View>
    </View>
  );
});