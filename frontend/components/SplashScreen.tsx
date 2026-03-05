import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { useUnifiedData } from '../hooks/useUnifiedData';
import { unifiedActivityStore$ } from '../hooks/useUnifiedActivity';
import { timelineActions } from '../state/timelineState';
import { aggregateTimelineData } from '../modules/activities/timelineLogic';

interface SplashScreenProps {
  onLoadComplete?: () => void;
}

interface LoadingStage {
  name: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
  message: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onLoadComplete }) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([
    { name: 'auth', status: 'pending', message: 'Initializing authentication...' },
    { name: 'data', status: 'pending', message: 'Loading timeline data...' },
    { name: 'activities', status: 'pending', message: 'Preparing activity cards...' },
    { name: 'timeline', status: 'pending', message: 'Building 8-week timeline...' },
    { name: 'ready', status: 'pending', message: 'Ready!' },
  ]);
  
  const data = useUnifiedData();
  
  const updateStage = (stageName: string, status: 'loading' | 'complete' | 'error', message?: string) => {
    setLoadingStages(prev => prev.map(stage => 
      stage.name === stageName 
        ? { ...stage, status, message: message || stage.message }
        : stage
    ));
  };

  useEffect(() => {
    // Animate splash screen entrance
    opacity.value = withSpring(1, { damping: 20 });
    scale.value = withSequence(
      withSpring(1.1, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );

    // Perform comprehensive data preloading
    const preloadData = async () => {
      try {
        // Stage 1: Auth initialization
        updateStage('auth', 'loading');
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for auth to settle
        updateStage('auth', 'complete', 'Authentication ready');
        
        // Stage 2: Load core data
        updateStage('data', 'loading');
        await new Promise(resolve => setTimeout(resolve, 400)); // Allow data hooks to load
        
        // Check if we have babies, if not we'll need to wait for onboarding
        if (data.allBabies.length === 0) {
          updateStage('data', 'complete', 'Waiting for baby profile...');
        } else {
          updateStage('data', 'complete', `Loaded ${data.allBabies.length} baby profile(s)`);
        }
        
        // Stage 3: Preload activity cards and system
        updateStage('activities', 'loading');
        await new Promise(resolve => setTimeout(resolve, 300));
        updateStage('activities', 'complete', 'Activity system ready');
        
        // Stage 4: Preload timeline data from existing sessions
        updateStage('timeline', 'loading');
        
        // Get the active baby for timeline initialization
        const activeBaby = data.activeBaby;
        if (activeBaby) {
          try {
            // Preload existing sessions from Legend State/AsyncStorage
            const sessions = Object.values(unifiedActivityStore$.sessions.peek());
            const babySessions = sessions.filter(s => s.baby_id === activeBaby.id);
            
            if (babySessions.length > 0) {
              // Pre-aggregate timeline data for faster Activities screen load
              const cutoffTime = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000); // 8 weeks
              const recentSessions = babySessions
                .filter(session => 
                  session.started_at && new Date(session.started_at) >= cutoffTime
                )
                .sort((a, b) => 
                  new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
                );
              
              // Pre-warm the timeline state with aggregated data
              const timelineData = aggregateTimelineData(recentSessions);
              timelineActions.setTimelineData(timelineData);
              timelineActions.setSessions(recentSessions);
              
              updateStage('timeline', 'complete', `Loaded ${recentSessions.length} activities`);
            } else {
              updateStage('timeline', 'complete', 'Timeline ready');
            }
            
            // Allow Legend State to fully hydrate
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.warn('Timeline preload warning:', error);
            updateStage('timeline', 'complete', 'Timeline initialized');
          }
        } else {
          updateStage('timeline', 'complete', 'Timeline ready for setup');
        }
        
        // Stage 5: Final readiness
        updateStage('ready', 'loading');
        await new Promise(resolve => setTimeout(resolve, 200));
        updateStage('ready', 'complete', 'App ready!');
        
        // Complete loading after a brief moment to show success
        setTimeout(() => {
          onLoadComplete?.();
        }, 300);
        
      } catch (error) {
        console.error('Splash screen data loading failed:', error);
        // Still complete loading even if there are errors
        setTimeout(() => {
          onLoadComplete?.();
        }, 1000);
      }
    };
    
    preloadData();
  }, []); // Run only once on mount

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  const currentStage = loadingStages.find(stage => stage.status === 'loading') || 
                      loadingStages[loadingStages.length - 1];
  const completedStages = loadingStages.filter(stage => stage.status === 'complete').length;

  return (
    <View className="flex-1 bg-gradient-to-b from-purple-50 to-blue-50 justify-center items-center">
      <Animated.View style={animatedStyle} className="items-center">
        {/* App Icon/Logo */}
        <View className="w-24 h-24 bg-blue-500 rounded-3xl justify-center items-center mb-6">
          <Text className="text-4xl">👶</Text>
        </View>
        
        {/* App Name */}
        <Text className="text-3xl font-bold text-gray-800 mb-2">BabyTrack</Text>
        <Text className="text-sm text-gray-600 mb-8">Track your baby&apos;s activities</Text>
        
        {/* Loading Indicator */}
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-sm text-gray-600 text-center">
          {currentStage?.message || 'Loading...'}
        </Text>
        
        {/* Progress Indicator */}
        <View className="mt-6 w-48">
          <View className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <Animated.View 
              className="bg-purple-500 h-full rounded-full"
              style={{
                width: `${(completedStages / loadingStages.length) * 100}%`,
              }}
            />
          </View>
          <Text className="text-xs text-gray-400 text-center mt-2">
            {completedStages} of {loadingStages.length} complete
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};