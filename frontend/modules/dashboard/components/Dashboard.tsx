import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { observer } from '@legendapp/state/react';
import { useUnifiedActivity } from '../../../hooks/useUnifiedActivity';
import { useUnifiedAuth } from '../../../hooks/useUnifiedAuth';
import { useUnifiedData } from '../../../hooks/useUnifiedData';
import { ProfileUpgradePrompt } from '../../../components/auth/ProfileUpgradePrompt';
// 🏆 CHAMPIONSHIP ACTIVATION - Use the REAL fully functional nursing card!
import { NursingCard } from '../../activities/components/NursingCard';
// REMOVED TEST CARD - Real implementation has ALL features we need!
// import { TestNursingCard } from '../../activities/components/TestNursingCard';
// Other activity cards
import { BottleCard } from '../../activities/components/BottleCard';
import { SleepCard } from '../../activities/components/SleepCard';
import { PumpingCard } from '../../activities/components/PumpingCard';
import { TummyTimeCard } from '../../activities/components/TummyTimeCard';
import { NappyCard } from '../../activities/components/NappyCard';
import type { User } from '@supabase/supabase-js';

interface DashboardProps {
  user: User;
  onSignOut: () => void;
}

export const Dashboard: React.FC<DashboardProps> = observer(
  ({ user, onSignOut }) => {
    const [showProfileUpgrade, setShowProfileUpgrade] = useState(false);

    // ✅ UNIFIED ARCHITECTURE - Use unified hooks
    const auth = useUnifiedAuth();
    const data = useUnifiedData();
    const activity = useUnifiedActivity();

    const activeBaby = data.activeBaby;
    const isLoadingBabies = data.loading;
    const babyError = data.error;

    const handleSignOut = async () => {
      try {
        await auth.signOut();
        onSignOut();
      } catch (error) {
        console.error('Sign out error:', error);
        // Force sign out even if there's an error
        onSignOut();
      }
    };

    const handleProfileUpgrade = async () => {
      setShowProfileUpgrade(false);
      // This will trigger the welcome/auth flow while preserving data
      await auth.chooseAuthentication();
    };

    // Use unified auth to detect anonymous state
    const isAnonymous = auth.isAnonymous;

    if (!activeBaby) {
      return (
        <View className="flex-1 items-center justify-center bg-gray-50 px-6">
          <Text className="mb-4 text-center text-lg font-semibold text-gray-800">
            🍼 Setting Up Your Baby Profile
          </Text>
          <Text className="mb-6 text-center text-sm text-gray-600">
            Loading: {isLoadingBabies ? 'YES' : 'NO'} | Error:{' '}
            {babyError || 'NONE'}
          </Text>
          <Pressable
            onPress={() => data.clearError()}
            className="mb-4 rounded-lg bg-blue-500 p-3"
            disabled={isLoadingBabies}
          >
            {isLoadingBabies ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-center font-medium text-white">
                Refresh
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleSignOut}
            className="rounded-lg border border-gray-300 p-3"
          >
            <Text className="text-center font-medium text-gray-600">
              Sign Out
            </Text>
          </Pressable>
        </View>
      );
    }

    // ✅ UNIFIED ARCHITECTURE - Activity data comes from unified hooks automatically
    const activeSessions = activity.getActiveSessions(activeBaby.id);
    const recentSessions = activity.getRecentSessions(activeBaby.id, 24);

    return (
      <ScrollView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="border-b border-gray-200 bg-white px-6 py-8">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                Hello,{' '}
                {isAnonymous
                  ? 'Guest'
                  : user.user_metadata?.display_name || 'Parent'}
                !
              </Text>
              <Text className="text-lg text-gray-600">
                Tracking: {activeBaby.name}{' '}
                {activeBaby.nickname ? `(${activeBaby.nickname})` : ''}
              </Text>
            </View>

            <Pressable
              onPress={handleSignOut}
              className="rounded-lg bg-gray-100 px-4 py-2"
            >
              <Text className="text-sm font-medium text-gray-700">
                Sign Out
              </Text>
            </Pressable>
          </View>

          {/* Status Indicators */}
          <View className="flex-row items-center justify-between">
            <View className="space-y-1">
              <View className="flex-row items-center space-x-2">
                <View
                  className={`h-2 w-2 rounded-full ${
                    isAnonymous
                      ? 'bg-orange-400'
                      : auth.shouldSync
                        ? 'bg-green-400'
                        : 'bg-yellow-400'
                  }`}
                />
                <Text className="text-xs text-gray-500">
                  {isAnonymous
                    ? 'Guest Mode - Data stored locally'
                    : auth.shouldSync
                      ? 'Synced to cloud'
                      : 'Offline mode'}
                </Text>
              </View>
              <View className="flex-row items-center space-x-2">
                <View
                  className={`h-2 w-2 rounded-full ${
                    activity.isSyncing ? 'bg-blue-400' : 'bg-green-400'
                  }`}
                />
                <Text className="text-xs text-gray-500">
                  {activity.isSyncing ? 'Syncing...' : 'Up to date'}
                </Text>
              </View>
            </View>

            {isAnonymous && (
              <Pressable
                onPress={() => setShowProfileUpgrade(true)}
                className="rounded-full bg-blue-500 px-3 py-1"
              >
                <Text className="text-xs font-medium text-white">
                  Create Profile
                </Text>
              </Pressable>
            )}
          </View>

          {babyError && (
            <View className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2">
              <Text className="text-xs text-red-600">{babyError}</Text>
            </View>
          )}
        </View>

        {/* Quick Stats - ✅ UNIFIED ARCHITECTURE integrated */}
        <View className="mx-4 mt-4 rounded-xl border border-gray-100 bg-white px-6 py-4">
          <Text className="mb-2 text-lg font-semibold text-gray-800">
            📊 Today at a Glance
          </Text>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-gray-600">
                Active sessions: {activeSessions.length}
              </Text>
              <Text className="text-sm text-gray-600">
                Recent activities: {recentSessions.length}
              </Text>
              {activity.hasActiveSession() && (
                <Text className="text-sm font-medium text-blue-600">
                  🏃 {activity.globalActiveSession?.activity_type} session
                  active
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Activity Cards */}
        <View className="py-6">
          <Text className="mb-4 px-6 text-xl font-bold text-gray-800">
            Track Activities
          </Text>

          <View className="space-y-4">
            <View className="px-4">
              <NursingCard
                babyId={activeBaby.id}
                onSessionComplete={(session) =>
                  console.log('Nursing session completed:', session)
                }
              />
            </View>

            <View className="px-4">
              <BottleCard
                babyId={activeBaby.id}
                onSessionComplete={(session) =>
                  console.log('Bottle session completed:', session)
                }
              />
            </View>

            <View className="px-4">
              <SleepCard
                babyId={activeBaby.id}
                onSessionComplete={(session) =>
                  console.log('Sleep session completed:', session)
                }
              />
            </View>

            <View className="px-4">
              <PumpingCard
                babyId={activeBaby.id}
                onSessionComplete={(session) =>
                  console.log('Pumping session completed:', session)
                }
              />
            </View>

            <View className="px-4">
              <TummyTimeCard
                babyId={activeBaby.id}
                onSessionComplete={(session) =>
                  console.log('Tummy time session completed:', session)
                }
              />
            </View>

            <View className="px-4">
              <NappyCard
                babyId={activeBaby.id}
                onLogComplete={(session) =>
                  console.log('Diaper change logged:', session)
                }
              />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="px-6 py-8">
          <Text className="text-center text-xs text-gray-400">
            BabyTrack - Made with love for parents
          </Text>
          {activity.syncError && (
            <Text className="mt-2 text-center text-xs text-red-500">
              Sync issue: {activity.syncError}
            </Text>
          )}
          {activity.syncQueueSize > 0 && (
            <Text className="mt-1 text-center text-xs text-blue-500">
              {activity.syncQueueSize} items queued for sync
            </Text>
          )}
        </View>

        {/* Profile Upgrade Prompt */}
        <ProfileUpgradePrompt
          visible={showProfileUpgrade}
          onClose={() => setShowProfileUpgrade(false)}
          onUpgrade={handleProfileUpgrade}
        />
      </ScrollView>
    );
  }
);
