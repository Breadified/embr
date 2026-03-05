/**
 * Tab Layout - Main App Navigation
 * 
 * Implements bottom tab navigation for authenticated users
 * with babies set up. Provides access to all core features.
 */

import { Tabs } from 'expo-router';
import { observer } from '@legendapp/state/react';
import { Text, View } from 'react-native';

// Tab navigation for main app
const TabLayout = observer(() => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e5e5e5',
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        tabBarActiveTintColor: '#3b82f6', // Blue-500
        tabBarInactiveTintColor: '#6b7280', // Gray-500
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <View className={`w-6 h-6 rounded-full ${focused ? 'bg-blue-500' : 'bg-gray-400'}`}>
              <Text className="text-center text-white text-sm leading-6">🏠</Text>
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ focused }) => (
            <View className={`w-6 h-6 rounded-full ${focused ? 'bg-blue-500' : 'bg-gray-400'}`}>
              <Text className="text-center text-white text-sm leading-6">📝</Text>
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused }) => (
            <View className={`w-6 h-6 rounded-full ${focused ? 'bg-blue-500' : 'bg-gray-400'}`}>
              <Text className="text-center text-white text-sm leading-6">📊</Text>
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <View className={`w-6 h-6 rounded-full ${focused ? 'bg-blue-500' : 'bg-gray-400'}`}>
              <Text className="text-center text-white text-sm leading-6">⚙️</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
});

TabLayout.displayName = 'TabLayout';

export default TabLayout;