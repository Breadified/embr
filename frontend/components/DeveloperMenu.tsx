/**
 * Developer Menu Component
 * 
 * Development-only menu for testing and debugging features.
 * This component is ONLY available in __DEV__ mode.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { unifiedActivityStore$ } from '../hooks/useUnifiedActivity';
import { useUnifiedData } from '../hooks/useUnifiedData';
import { useUnifiedActivity } from '../hooks/useUnifiedActivity';

// Only import seed data in dev mode
let generateSeedData: ((weeks: number) => Promise<void>) | null = null;
if (__DEV__) {
  // Dynamic import for development-only module
  import('../utils/seedData').then(module => {
    generateSeedData = module.generateSeedData;
  }).catch(err => {
    console.warn('Seed data module not available:', err);
  });
}

interface DeveloperMenuProps {
  visible: boolean;
  onClose: () => void;
}

export const DeveloperMenu: React.FC<DeveloperMenuProps> = ({ visible, onClose }) => {
  const [isGeneratingSeed, setIsGeneratingSeed] = useState(false);
  const [seedDays, setSeedDays] = useState(56); // Default 8 weeks
  const data = useUnifiedData();
  const activity = useUnifiedActivity();

  // Only render in development mode
  if (!__DEV__) {
    return null;
  }

  const handleSeedData = async () => {
    if (!data.activeBaby) {
      Alert.alert('No Active Baby', 'Please create a baby profile first');
      return;
    }

    Alert.alert(
      'Generate Seed Data',
      `This will generate ${seedDays} days of test activity data for ${data.activeBaby.name}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          style: 'destructive',
          onPress: async () => {
            setIsGeneratingSeed(true);
            try {
              if (generateSeedData) {
                // Convert days to weeks for the generateSeedData function
                const weeks = Math.ceil(seedDays / 7);
                await generateSeedData(weeks);
                Alert.alert('Success', `Generated ${weeks} weeks (${seedDays} days) of test data`);
              } else {
                Alert.alert('Error', 'Seed data generator not available');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to generate seed data');
              console.error(error);
            } finally {
              setIsGeneratingSeed(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete ALL activity data. This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: () => {
            unifiedActivityStore$.sessions.set({});
            unifiedActivityStore$.activeSessions.set({});
            unifiedActivityStore$.globalActiveSession.set(null);
            Alert.alert('Success', 'All activity data cleared');
          },
        },
      ]
    );
  };

  const handleHealthCheck = () => {
    const issues = activity.performHealthCheck();
    if (issues.length === 0) {
      Alert.alert('Health Check', 'No issues detected! Everything looks good.');
    } else {
      Alert.alert(
        'Health Check',
        `Found ${issues.length} issue(s):\n\n${issues.map(i => `• ${i.type}: ${i.message}`).join('\n')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Auto Fix',
            onPress: () => {
              const fixed = activity.performHealthCleanup();
              Alert.alert('Health Cleanup', fixed ? 'Issues resolved!' : 'Unable to auto-fix all issues');
            },
          },
        ]
      );
    }
  };

  const handleEmergencyReset = () => {
    Alert.alert(
      'Emergency Reset',
      'This will clear all active sessions and fix any stuck states. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            activity.emergencyReset();
            Alert.alert('Success', 'Emergency reset completed');
          },
        },
      ]
    );
  };

  const sessionCount = Object.keys(unifiedActivityStore$.sessions.peek()).length;
  const activeCount = Object.keys(unifiedActivityStore$.activeSessions.peek()).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20 bg-white rounded-t-3xl">
          <View className="p-4 border-b border-gray-200">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-bold text-gray-900">Developer Menu</Text>
              <Pressable onPress={onClose} className="p-2">
                <Text className="text-lg text-gray-600">✕</Text>
              </Pressable>
            </View>
            <Text className="text-xs text-gray-500 mt-1">Development Mode Only</Text>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Status Section */}
            <View className="bg-gray-50 p-4 rounded-lg mb-4">
              <Text className="text-sm font-bold text-gray-700 mb-2">Current Status</Text>
              <Text className="text-xs text-gray-600">Total Sessions: {sessionCount}</Text>
              <Text className="text-xs text-gray-600">Active Sessions: {activeCount}</Text>
              <Text className="text-xs text-gray-600">
                Active Baby: {data.activeBaby?.name || 'None'}
              </Text>
            </View>

            {/* Seed Data Section */}
            <View className="bg-blue-50 p-4 rounded-lg mb-4">
              <Text className="text-sm font-bold text-blue-700 mb-3">Test Data Generation</Text>
              
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs text-gray-600">Days to generate:</Text>
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => setSeedDays(Math.max(1, seedDays - 7))}
                    className="bg-white px-3 py-1 rounded-l-md border border-gray-300"
                  >
                    <Text>−</Text>
                  </Pressable>
                  <View className="bg-white px-4 py-1 border-t border-b border-gray-300">
                    <Text className="text-sm font-medium">{seedDays}</Text>
                  </View>
                  <Pressable
                    onPress={() => setSeedDays(Math.min(365, seedDays + 7))}
                    className="bg-white px-3 py-1 rounded-r-md border border-gray-300"
                  >
                    <Text>+</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleSeedData}
                disabled={isGeneratingSeed || !data.activeBaby}
                className={`py-2 px-4 rounded-lg ${
                  isGeneratingSeed || !data.activeBaby
                    ? 'bg-gray-300'
                    : 'bg-blue-500'
                }`}
              >
                <Text className="text-white text-center font-medium">
                  {isGeneratingSeed ? 'Generating...' : 'Generate Seed Data'}
                </Text>
              </Pressable>
            </View>

            {/* Health Check Section */}
            <View className="bg-green-50 p-4 rounded-lg mb-4">
              <Text className="text-sm font-bold text-green-700 mb-3">Session Health</Text>
              
              <Pressable
                onPress={handleHealthCheck}
                className="bg-green-500 py-2 px-4 rounded-lg mb-2"
              >
                <Text className="text-white text-center font-medium">
                  Run Health Check
                </Text>
              </Pressable>

              <Pressable
                onPress={handleEmergencyReset}
                className="bg-orange-500 py-2 px-4 rounded-lg"
              >
                <Text className="text-white text-center font-medium">
                  Emergency Reset
                </Text>
              </Pressable>
            </View>

            {/* Danger Zone */}
            <View className="bg-red-50 p-4 rounded-lg mb-4">
              <Text className="text-sm font-bold text-red-700 mb-3">Danger Zone</Text>
              
              <Pressable
                onPress={handleClearAllData}
                className="bg-red-500 py-2 px-4 rounded-lg"
              >
                <Text className="text-white text-center font-medium">
                  Clear All Activity Data
                </Text>
              </Pressable>
            </View>

            {/* Debug Info */}
            <View className="bg-gray-50 p-4 rounded-lg">
              <Text className="text-sm font-bold text-gray-700 mb-2">Debug Info</Text>
              <Text className="text-xs text-gray-600 font-mono">
                Babies Count: {data.allBabies.length}
              </Text>
              <Text className="text-xs text-gray-600 font-mono">
                Active Baby: {data.activeBaby?.name || 'None'}
              </Text>
              <Text className="text-xs text-gray-600 font-mono">
                Sync Queue: {activity.syncQueueSize}
              </Text>
              <Text className="text-xs text-gray-600 font-mono">
                Is Syncing: {activity.isSyncing ? 'Yes' : 'No'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Helper hook to toggle developer menu
export const useDeveloperMenu = () => {
  const [visible, setVisible] = useState(false);
  
  return {
    visible,
    show: () => setVisible(true),
    hide: () => setVisible(false),
    toggle: () => setVisible(prev => !prev),
  };
};