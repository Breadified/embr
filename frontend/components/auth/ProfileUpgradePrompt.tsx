import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { observer } from '@legendapp/state/react';

interface ProfileUpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const ProfileUpgradePrompt: React.FC<ProfileUpgradePromptProps> = observer(({ 
  visible, 
  onClose, 
  onUpgrade 
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl p-6">
          {/* Header */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center mb-4">
              <Text className="text-white text-2xl">👤</Text>
            </View>
            <Text className="text-xl font-bold text-gray-900">
              Create Your Profile
            </Text>
            <Text className="text-gray-600 text-center mt-2">
              Keep your baby&apos;s data safe and access it anywhere
            </Text>
          </View>

          {/* Benefits */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Benefits of creating a profile:
            </Text>
            
            <View className="space-y-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-green-600 text-sm font-bold">✓</Text>
                </View>
                <Text className="text-gray-700 flex-1">
                  Never lose your tracking data - automatic backup
                </Text>
              </View>
              
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-blue-600 text-sm font-bold">📱</Text>
                </View>
                <Text className="text-gray-700 flex-1">
                  Access from multiple devices (phone, tablet, web)
                </Text>
              </View>
              
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-purple-600 text-sm font-bold">👥</Text>
                </View>
                <Text className="text-gray-700 flex-1">
                  Share tracking with partner or caregivers
                </Text>
              </View>
            </View>
          </View>

          {/* Current Status */}
          <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
            <View className="flex-row items-center">
              <Text className="text-orange-500 text-lg mr-2">⚠️</Text>
              <Text className="text-orange-800 font-medium flex-1">
                Currently using local storage only
              </Text>
            </View>
            <Text className="text-orange-700 text-sm mt-1 ml-7">
              Your data is only saved on this device
            </Text>
          </View>

          {/* Actions */}
          <View className="space-y-3">
            <Pressable
              onPress={onUpgrade}
              className="bg-blue-500 rounded-xl p-4"
            >
              <Text className="text-white text-lg font-semibold text-center">
                Create Profile Now
              </Text>
              <Text className="text-blue-100 text-sm text-center mt-1">
                Your existing data will be preserved
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              className="border border-gray-300 rounded-xl p-4"
            >
              <Text className="text-gray-700 text-lg font-medium text-center">
                Maybe Later
              </Text>
              <Text className="text-gray-500 text-sm text-center mt-1">
                Continue using locally
              </Text>
            </Pressable>
          </View>

          {/* Privacy note */}
          <Text className="text-xs text-gray-500 text-center mt-4">
            Your baby&apos;s data remains private and secure. We never share personal information.
          </Text>
        </View>
      </View>
    </Modal>
  );
});

ProfileUpgradePrompt.displayName = 'ProfileUpgradePrompt';