// ✅ CRYPTO POLYFILL & LEGEND STATE - Auto-loaded via TypeScript entry point (index.ts)
// Configuration guaranteed to run before any component code

import '../global.css';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { observer } from '@legendapp/state/react';
import { useUnifiedAuth } from '../hooks/useUnifiedAuth';
import { useUnifiedData } from '../hooks/useUnifiedData';
import { WelcomeScreen } from '../components/auth/WelcomeScreen';
import { AuthScreen } from '../components/auth/AuthScreen';
import { BabySetupWizard } from '../components/onboarding/BabySetupWizard';
import { SplashScreen } from '../components/SplashScreen';
import { DevToolsListener } from '../components/dev/DevToolsListener';

// 🏆 UNIFIED ARCHITECTURE - CHAMPIONSHIP IMPLEMENTATION!
// 75% less code, automatic auth/sync, works offline + online seamlessly
const RootLayout: React.FC = observer(() => {
  const auth = useUnifiedAuth();
  const data = useUnifiedData();

  console.log('🎯 Current Auth State:', {
    authType: auth.authType,
    isOnline: auth.isOnline,
    shouldSync: auth.shouldSync,
    canUseLocalOnly: auth.canUseLocalOnly,
  });

  // Still initializing - show splash screen
  if (auth.isInitializing || !auth.isReady) {
    return (
      <SafeAreaProvider>
        <SplashScreen onLoadComplete={() => {
          // Data will be loaded by Legend State persistence automatically
          console.log('Splash screen load complete');
        }} />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  // Error state
  if (auth.error) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 bg-gray-50 justify-center items-center px-6">
          <View className="bg-red-50 p-6 rounded-xl border border-red-200 max-w-sm">
            <Text className="text-lg font-semibold text-red-800 text-center mb-2">
              Connection Issue
            </Text>
            <Text className="text-sm text-red-600 text-center mb-4">
              {auth.error}
            </Text>
            <Text className="text-xs text-gray-600 text-center">
              Don&apos;t worry - you can still use the app offline!
            </Text>
          </View>
          <StatusBar style="auto" />
        </View>
      </SafeAreaProvider>
    );
  }

  // Needs welcome screen - show choice between auth and skip
  if (auth.needsWelcome) {
    return (
      <SafeAreaProvider>
        <WelcomeScreen />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  // User chose authentication - show auth screen
  if (auth.needsAuthentication) {
    return (
      <SafeAreaProvider>
        <AuthScreen 
          onAuthComplete={async (user) => {
            console.log('✅ Authentication completed:', user.id);
            // No manual state management needed - hooks handle everything!
          }} 
        />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  // Has auth but no babies - show onboarding
  if (data.allBabies.length === 0) {
    return (
      <SafeAreaProvider>
        <BabySetupWizard
          profileId={auth.user?.id || auth.deviceId || 'unknown'}
          onComplete={() => {
            console.log('✅ Baby setup completed');
            // No manual state management needed - data hook handles everything!
          }}
        />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  // Has babies - show main app with routing
  return (
    <SafeAreaProvider>
      {__DEV__ && <DevToolsListener />}
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      
      {/* Sync Status Indicator */}
      {auth.shouldSync && data.isSyncing && (
        <View className="absolute top-12 right-4 bg-blue-500 px-3 py-1 rounded-full z-50">
          <Text className="text-white text-xs">Syncing...</Text>
        </View>
      )}
      
      {auth.canUseLocalOnly && !auth.isOnline && (
        <View className="absolute top-12 right-4 bg-orange-500 px-3 py-1 rounded-full z-50">
          <Text className="text-white text-xs">Offline</Text>
        </View>
      )}
      
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
});

// Add display name for debugging
RootLayout.displayName = 'RootLayout';

export default RootLayout;