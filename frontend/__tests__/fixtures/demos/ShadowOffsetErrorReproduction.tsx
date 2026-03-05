/**
 * SHADOWOFFSET ERROR REPRODUCTION TEST COMPONENT
 * 
 * This component reproduces the exact shadowOffset error pattern
 * found in the track activities page to validate our fix.
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

// REPRODUCTION: This mimics the exact pattern that causes shadowOffset errors
export const ShadowOffsetErrorReproduction: React.FC = () => {
  const glowValue = useSharedValue(0);
  const scale = useSharedValue(1);
  
  useEffect(() => {
    // Start animations that trigger shadowOffset conflicts
    glowValue.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  // PROBLEMATIC PATTERN 1: Main container with shadowOffset
  const mainContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: 0.25,
      shadowRadius: 8,
      // PROBLEM: shadowOffset as direct property
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowColor: '#000000',
    };
  });

  // PROBLEMATIC PATTERN 2: Nested component also with shadowOffset  
  const nestedStyle1 = useAnimatedStyle(() => {
    const glowColor = interpolateColor(
      glowValue.value,
      [0, 0.6],
      ['#FDF2F8', '#FEE2E2']
    );

    return {
      backgroundColor: glowColor,
      shadowOpacity: glowValue.value * 0.3,
      shadowRadius: glowValue.value * 8,
      shadowColor: '#EC4899',
      // PROBLEM: Another shadowOffset in nested component
      shadowOffset: {
        width: 0,
        height: 4,
      },
    };
  });

  // PROBLEMATIC PATTERN 3: Third level shadowOffset
  const nestedStyle2 = useAnimatedStyle(() => {
    return {
      shadowOpacity: 0.2,
      shadowRadius: 4,
      // PROBLEM: Third shadowOffset source
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowColor: '#000000',
    };
  });

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 12 })
    );
  };

  return (
    <View className="p-4">
      <Text className="text-lg font-bold mb-4">ShadowOffset Error Reproduction</Text>
      <Text className="text-sm text-gray-600 mb-4">
        This component reproduces the shadowOffset error by having multiple nested 
        components with animated shadowOffset properties.
      </Text>
      
      {/* MAIN CONTAINER: First shadowOffset source */}
      <Animated.View 
        style={[mainContainerStyle]}
        className="p-4 bg-white rounded-xl border border-gray-100 border border-gray-100"
      >
        <Text className="text-base font-medium mb-4">Main Container (shadowOffset #1)</Text>
        
        {/* NESTED LEVEL 1: Second shadowOffset source */}
        <Animated.View 
          style={[nestedStyle1]}
          className="p-3 rounded-lg mb-3"
        >
          <Text className="text-sm font-medium text-gray-700">Nested Component 1 (shadowOffset #2)</Text>
          
          {/* NESTED LEVEL 2: Third shadowOffset source */}
          <Animated.View 
            style={[nestedStyle2]}
            className="p-2 bg-gray-50 rounded mt-2"
          >
            <Text className="text-xs text-gray-600">Nested Component 2 (shadowOffset #3)</Text>
          </Animated.View>
        </Animated.View>
        
        <Pressable
          onPress={handlePress}
          className="bg-blue-500 p-3 rounded-lg"
        >
          <Text className="text-white text-center font-medium">
            Press to trigger animations (and shadowOffset errors)
          </Text>
        </Pressable>
      </Animated.View>

      <Text className="text-xs text-red-600 mt-4">
        ⚠️ Check console for shadowOffset errors when this component renders/animates
      </Text>
    </View>
  );
};

export default ShadowOffsetErrorReproduction;