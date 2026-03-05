/**
 * Animation Showcase Component
 * 
 * This component demonstrates all the championship-level animations
 * implemented for the BabyTrack activity cards. Perfect for testing
 * and showing off the delightful micro-interactions.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { observer } from '@legendapp/state/react';
import {
  createButtonPressAnimation,
  createCelebrationAnimation,
  createPulseAnimation,
  createGlowAnimation,
  createHeartbeatAnimation,
  createLiquidFillAnimation,
  createStarCelebrationAnimation,
  createSessionCompleteAnimation,
  createBreathingAnimation,
  ActivityType,
} from '../../utils/animationHelpers';
import { activityAnimations } from '../../constants/animations';

const AnimationShowcase: React.FC = observer(() => {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('nursing');

  // Animation values for demonstrations
  const buttonScale = useSharedValue(1);
  const celebrationScale = useSharedValue(1);
  const pulseValue = useSharedValue(1);
  const glowValue = useSharedValue(0);
  const heartbeatValue = useSharedValue(1);
  const liquidFillValue = useSharedValue(0);
  const starScale = useSharedValue(1);
  const sessionCompleteScale = useSharedValue(1);
  const breathingValue = useSharedValue(1);

  // Animated styles
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const glowStyle = useAnimatedStyle(() => {
    const opacity = glowValue.value;
    return {
      shadowOpacity: opacity * 0.5,
      shadowRadius: opacity * 12,
      shadowColor: '#FF6B6B',
      backgroundColor: `rgba(255, 107, 107, ${opacity * 0.1})`,
    };
  });

  const heartbeatStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartbeatValue.value }],
  }));

  const liquidStyle = useAnimatedStyle(() => ({
    opacity: liquidFillValue.value * 0.6,
    backgroundColor: '#4ECDC4',
  }));

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  const sessionCompleteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sessionCompleteScale.value }],
  }));

  const breathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingValue.value }],
  }));

  // Activity selection buttons
  const activities: ActivityType[] = ['nursing', 'bottle', 'pumping', 'sleep', 'nappy', 'activities'];

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-gray-800 mb-6 text-center">
        🎨 Animation Showcase
      </Text>
      
      <Text className="text-sm text-gray-600 mb-4 text-center">
        Experience the championship-level polish added to BabyTrack activity cards!
      </Text>

      {/* Activity Type Selector */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-700 mb-3">Select Activity Type:</Text>
        <View className="flex-row flex-wrap gap-2">
          {activities.map((activity) => (
            <Pressable
              key={activity}
              onPress={() => setSelectedActivity(activity)}
              className={`px-3 py-2 rounded-lg ${
                selectedActivity === activity
                  ? 'bg-blue-500'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <Text className={`text-sm font-medium ${
                selectedActivity === activity
                  ? 'text-white'
                  : 'text-gray-700'
              }`}>
                {activity.charAt(0).toUpperCase() + activity.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Animation Demonstrations */}
      <View className="space-y-6">
        
        {/* Button Press Animation */}
        <View className="bg-white p-4 rounded-lg border border-gray-100">
          <Text className="text-md font-semibold text-gray-800 mb-3">💫 Button Press Feedback</Text>
          <Text className="text-sm text-gray-600 mb-3">Instant tactile feedback with scale animation</Text>
          <Animated.View style={[buttonStyle]}>
            <Pressable
              onPress={() => createButtonPressAnimation(buttonScale)}
              className="bg-blue-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Press Me!</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Celebration Animation */}
        <View className="bg-white p-4 rounded-lg border border-gray-100">
          <Text className="text-md font-semibold text-gray-800 mb-3">🎉 Celebration Animation</Text>
          <Text className="text-sm text-gray-600 mb-3">Activity-specific celebration with bouncy spring</Text>
          <Animated.View style={[celebrationStyle]}>
            <Pressable
              onPress={() => createCelebrationAnimation(celebrationScale, selectedActivity)}
              className="bg-green-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Celebrate {selectedActivity}!</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Pulse Animation */}
        <View className="bg-white p-4 rounded-lg border border-gray-100">
          <Text className="text-md font-semibold text-gray-800 mb-3">💓 Active Timer Pulse</Text>
          <Text className="text-sm text-gray-600 mb-3">Continuous activity-specific pulse for running timers</Text>
          <View className="flex-row gap-4">
            <Animated.View style={[pulseStyle]}>
              <Pressable
                onPress={() => createPulseAnimation(pulseValue, selectedActivity)}
                className="bg-orange-500 px-4 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">Start Pulse</Text>
              </Pressable>
            </Animated.View>
            <Pressable
              onPress={() => { pulseValue.value = 1; }}
              className="bg-gray-500 px-4 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Stop</Text>
            </Pressable>
          </View>
        </View>

        {/* Glow Animation */}
        <View className="bg-white p-4 rounded-lg border border-gray-100">
          <Text className="text-md font-semibold text-gray-800 mb-3">✨ Active Glow Effect</Text>
          <Text className="text-sm text-gray-600 mb-3">Subtle glow with shadow for active states</Text>
          <Animated.View style={[glowStyle]} className="rounded-lg">
            <Pressable
              onPress={() => createGlowAnimation(glowValue, selectedActivity, 'celebration')}
              className="bg-pink-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Activate Glow</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Heartbeat Animation */}
        <View className="bg-white p-4 rounded-lg border border-gray-100">
          <Text className="text-md font-semibold text-gray-800 mb-3">💖 Heartbeat Animation</Text>
          <Text className="text-sm text-gray-600 mb-3">Gentle heartbeat for active nursing/pumping</Text>
          <View className="flex-row gap-4">
            <Animated.View style={[heartbeatStyle]}>
              <Pressable
                onPress={() => createHeartbeatAnimation(heartbeatValue)}
                className="bg-red-500 px-4 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">💓 Beat</Text>
              </Pressable>
            </Animated.View>
            <Pressable
              onPress={() => { heartbeatValue.value = 1; }}
              className="bg-gray-500 px-4 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Stop</Text>
            </Pressable>
          </View>
        </View>

        {/* Liquid Fill Animation */}
        <View className="bg-white p-4 rounded-lg border border-gray-100">
          <Text className="text-md font-semibold text-gray-800 mb-3">🌊 Liquid Fill Effect</Text>
          <Text className="text-sm text-gray-600 mb-3">Flowing animation for bottle volume selection</Text>
          <View className="relative overflow-hidden rounded-lg">
            <Animated.View style={[liquidStyle]} className="absolute inset-0 rounded-lg" />
            <Pressable
              onPress={() => createLiquidFillAnimation(liquidFillValue)}
              className="bg-teal-500 px-6 py-3 rounded-lg relative z-10"
            >
              <Text className="text-white font-semibold text-center">🍼 Fill Bottle</Text>
            </Pressable>
          </View>
        </View>

        {/* Star Rating Animation */}
        <View className="bg-white p-4 rounded-lg border border-gray-100">
          <Text className="text-md font-semibold text-gray-800 mb-3">⭐ Star Rating Celebration</Text>
          <Text className="text-sm text-gray-600 mb-3">Delightful feedback for comfort ratings</Text>
          <Animated.View style={[starStyle]}>
            <Pressable
              onPress={() => createStarCelebrationAnimation(starScale)}
              className="bg-yellow-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center text-xl">⭐ Rate Me!</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Session Complete Animation */}
        <View className="bg-white p-4 rounded-lg border border-gray-100">
          <Text className="text-md font-semibold text-gray-800 mb-3">🎊 Session Complete Fireworks</Text>
          <Text className="text-sm text-gray-600 mb-3">Epic celebration for completed sessions</Text>
          <Animated.View style={[sessionCompleteStyle]}>
            <Pressable
              onPress={() => createSessionCompleteAnimation(
                sessionCompleteScale, 
                glowValue, 
                selectedActivity
              )}
              className="bg-green-600 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-bold text-center">🎉 Complete Session</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Breathing Animation */}
        <View className="bg-white p-4 rounded-lg border border-gray-100">
          <Text className="text-md font-semibold text-gray-800 mb-3">😴 Peaceful Breathing</Text>
          <Text className="text-sm text-gray-600 mb-3">Calm breathing animation for sleep tracking</Text>
          <View className="flex-row gap-4">
            <Animated.View style={[breathingStyle]}>
              <Pressable
                onPress={() => createBreathingAnimation(breathingValue)}
                className="bg-purple-500 px-4 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">😴 Sleep</Text>
              </Pressable>
            </Animated.View>
            <Pressable
              onPress={() => { breathingValue.value = 1; }}
              className="bg-gray-500 px-4 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Wake</Text>
            </Pressable>
          </View>
        </View>

        {/* Activity Config Display */}
        <View className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <Text className="text-md font-semibold text-blue-800 mb-3">📊 Current Activity Config</Text>
          <View className="space-y-2">
            <Text className="text-sm text-blue-700">
              <Text className="font-semibold">Activity:</Text> {selectedActivity}
            </Text>
            <Text className="text-sm text-blue-700">
              <Text className="font-semibold">Pulse Scale:</Text> {activityAnimations[selectedActivity].pulseScale.from} → {activityAnimations[selectedActivity].pulseScale.to}
            </Text>
            <Text className="text-sm text-blue-700">
              <Text className="font-semibold">Glow Intensity:</Text> {activityAnimations[selectedActivity].glowIntensity}
            </Text>
            <Text className="text-sm text-blue-700">
              <Text className="font-semibold">Celebration Scale:</Text> {activityAnimations[selectedActivity].celebrationScale}
            </Text>
            <Text className="text-sm text-blue-700">
              <Text className="font-semibold">Timing:</Text> {activityAnimations[selectedActivity].timing.duration}ms
            </Text>
          </View>
        </View>

      </View>

      <View className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
        <Text className="text-md font-semibold text-green-800 mb-2">✅ Animation Polish Complete!</Text>
        <Text className="text-sm text-green-700">
          All activity cards now feature championship-level micro-interactions that will make parents 
          smile while tracking their baby&apos;s activities. Each animation is carefully tuned to the 
          activity&apos;s personality - from nurturing nursing pulses to flowing bottle animations.
        </Text>
      </View>

      <View className="h-20" />
    </ScrollView>
  );
});

export default AnimationShowcase;