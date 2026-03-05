/**
 * Settings Screen - App Configuration Tab
 *
 * Provides access to app settings, user profile, baby profiles,
 * notifications, data export, and account management.
 */

import { View, Text } from 'react-native';
import { observer } from '@legendapp/state/react';

export default observer(function SettingsScreen() {
  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">
        <View className="bg-purple-50 p-8 rounded-xl border border-purple-200 max-w-sm">
          <Text className="text-xl font-bold text-purple-800 text-center mb-4">
            ⚙️ Settings Screen
          </Text>
          <Text className="text-sm text-purple-600 text-center mb-4">
            This screen will provide access to user settings, baby profiles, notifications, and account management.
          </Text>
          <Text className="text-xs text-gray-600 text-center">
            Coming soon in Sprint 1!
          </Text>
        </View>
      </View>
    </View>
  );
});