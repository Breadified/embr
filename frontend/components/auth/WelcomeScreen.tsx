import React from 'react';
import { View, Text, Pressable, StatusBar } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';

export const WelcomeScreen: React.FC = observer(() => {
  const auth = useUnifiedAuth();

  const handleSignIn = async () => {
    try {
      await auth.chooseAuthentication();
      // This will trigger the auth screen to show
    } catch (error) {
      console.error('Failed to choose authentication:', error);
    }
  };

  const handleSkipForNow = async () => {
    try {
      await auth.chooseSkipForNow();
      // This will set anonymous mode and hide welcome screen
    } catch (error) {
      console.error('Failed to skip for now:', error);
    }
  };

  return (
    <>
      <View className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 px-6 justify-center">
        {/* App Icon/Logo */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-blue-500 rounded-full items-center justify-center mb-4">
            <Text className="text-white text-3xl font-bold">👶</Text>
          </View>
          <Text className="text-3xl font-bold text-gray-900">BabyTrack</Text>
          <Text className="text-lg text-gray-600 text-center mt-2">
            Track your little one&apos;s journey
          </Text>
        </View>

        {/* Welcome Message */}
        <View className="mb-8">
          <Text className="text-2xl font-semibold text-gray-900 text-center mb-4">
            Welcome! 👋
          </Text>
          <Text className="text-base text-gray-600 text-center leading-6">
            BabyTrack helps you monitor feeding, sleeping, and growth milestones with ease.
          </Text>
        </View>

        {/* Sign In Option */}
        <Pressable
          onPress={handleSignIn}
          className="bg-blue-500 rounded-xl p-4 mb-4 border border-gray-100"
          style={({ pressed }) => [
            { opacity: pressed ? 0.9 : 1 }
          ]}
        >
          <Text className="text-white text-lg font-semibold text-center mb-1">
            Sign In / Create Account
          </Text>
          <Text className="text-blue-100 text-sm text-center">
            Sync across devices • Backup your data • Share with caregivers
          </Text>
        </Pressable>

        {/* Skip Option */}
        <Pressable
          onPress={handleSkipForNow}
          className="border border-gray-300 rounded-xl p-4 mb-8"
          style={({ pressed }) => [
            { opacity: pressed ? 0.9 : 1 }
          ]}
        >
          <Text className="text-gray-700 text-lg font-medium text-center mb-1">
            Skip for now
          </Text>
          <Text className="text-gray-500 text-sm text-center">
            Use locally on this device • You can create a profile later
          </Text>
        </Pressable>

        {/* Benefits */}
        <View className="bg-white/60 rounded-xl p-4 mb-6">
          <Text className="text-sm font-medium text-gray-700 text-center mb-2">
            Why create an account?
          </Text>
          <View className="space-y-2">
            <View className="flex-row items-center">
              <Text className="text-green-500 mr-2">✓</Text>
              <Text className="text-sm text-gray-600 flex-1">
                Never lose your data - automatic backup
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 mr-2">✓</Text>
              <Text className="text-sm text-gray-600 flex-1">
                Access from multiple devices
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 mr-2">✓</Text>
              <Text className="text-sm text-gray-600 flex-1">
                Share tracking with partner or caregivers
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Note */}
        <Text className="text-xs text-gray-500 text-center">
          Your baby&apos;s data is private and secure. We never share personal information.
        </Text>
      </View>
      
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
    </>
  );
});

WelcomeScreen.displayName = 'WelcomeScreen';