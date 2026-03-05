import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { observer } from '@legendapp/state/react';
import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';

// Timer configuration for individual timers
export interface TimerConfig {
  id: string;
  label: string;
  emoji?: string;
  color?: string;
}

// Internal timer state interface
interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number;
}

// Session completion handler
export interface SessionCompletionProps {
  onSessionComplete?: () => void;
  sessionActive?: boolean;
  sessionStartTime?: number | null;
  completionLabel?: string;
  showCompletionButton?: boolean;
}

// Props for the multi-timer component
export interface MultiTimerComponentProps {
  timers: TimerConfig[];
  persistenceKey: string; // Unique key for persistent storage
  formatTime?: (seconds: number, showHours?: boolean) => string;
  showHours?: boolean; // Show hours in timer display
  disabled?: boolean;
  exclusive?: boolean; // If true, only one timer can run at a time
  showCombinedTotal?: boolean;
  combinedTotalLabel?: string;
  onTimerChange?: (timerId: string, elapsed: number, isRunning: boolean) => void;
  sessionCompletion?: SessionCompletionProps;
}

// Default time formatter with optional hours
const defaultFormatTime = (seconds: number, showHours: boolean = false): string => {
  const validSeconds = isNaN(seconds) || seconds < 0 ? 0 : Math.floor(seconds);
  const hours = Math.floor(validSeconds / 3600);
  const minutes = Math.floor((validSeconds % 3600) / 60);
  const remainingSeconds = validSeconds % 60;
  
  if (showHours || hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Create persistent timer store
const createTimerStore = (persistenceKey: string, timerConfigs: TimerConfig[]) => {
  const initialState: Record<string, TimerState> = {};
  timerConfigs.forEach(timer => {
    initialState[timer.id] = {
      isRunning: false,
      startTime: null,
      elapsed: 0,
    };
  });

  const store$ = observable(initialState);
  
  // Persist with unique key
  persistObservable(store$, {
    local: `multi_timer_${persistenceKey}`,
  });

  return store$;
};

export const MultiTimerComponent: React.FC<MultiTimerComponentProps> = observer(({
  timers,
  persistenceKey,
  formatTime = defaultFormatTime,
  showHours = false,
  disabled = false,
  exclusive = false,
  showCombinedTotal = true,
  combinedTotalLabel = "Total",
  onTimerChange,
  sessionCompletion
}) => {
  // Create persistent timer store
  const [timerStore$] = useState(() => createTimerStore(persistenceKey, timers));
  
  // Get reactive timer states
  const getTimerState = (timerId: string): TimerState => {
    return timerStore$[timerId]?.get() || { isRunning: false, startTime: null, elapsed: 0 };
  };
  
  // Calculate combined total time
  const combinedTotal = timers.reduce((sum, timer) => {
    const state = getTimerState(timer.id);
    return sum + state.elapsed;
  }, 0);
  
  // Determine layout based on number of timers
  const getTimerStyle = () => {
    if (timers.length === 1) return "w-full";
    if (timers.length === 2) return "flex-1";
    if (timers.length === 3) return "flex-1";
    return "flex-1"; // For 4+ timers, might need grid layout
  };

  const getContainerStyle = () => {
    if (timers.length <= 2) return "flex-row gap-4";
    if (timers.length === 3) return "flex-row gap-2";
    return "flex-row flex-wrap gap-2"; // For 4+ timers
  };

  // Restore running timers on startup
  useEffect(() => {
    const now = Date.now();
    timers.forEach(timer => {
      const state = getTimerState(timer.id);
      if (state.isRunning && state.startTime) {
        const elapsed = Math.floor((now - state.startTime) / 1000);
        timerStore$[timer.id]?.elapsed.set(elapsed);
      }
    });
  }, []); // Run once on mount
  
  // Timer update interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      timers.forEach(timer => {
        const state = getTimerState(timer.id);
        if (state.isRunning && state.startTime) {
          const elapsed = Math.floor((now - state.startTime) / 1000);
          timerStore$[timer.id]?.elapsed.set(elapsed);
          onTimerChange?.(timer.id, elapsed, state.isRunning);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers, onTimerChange]);

  // Timer toggle handler
  const handleTimerToggle = useCallback((timerId: string) => {
    const state = getTimerState(timerId);
    
    if (state.isRunning) {
      // Stop timer
      timerStore$[timerId]?.isRunning.set(false);
      onTimerChange?.(timerId, state.elapsed, false);
    } else {
      // Start timer
      if (exclusive) {
        // Stop all other timers if exclusive mode
        timers.forEach(timer => {
          if (timer.id !== timerId) {
            const otherState = getTimerState(timer.id);
            if (otherState.isRunning) {
              timerStore$[timer.id]?.isRunning.set(false);
              onTimerChange?.(timer.id, otherState.elapsed, false);
            }
          }
        });
      }
      
      // Start the selected timer - adjust startTime to account for previous elapsed time
      const adjustedStartTime = Date.now() - (state.elapsed * 1000);
      timerStore$[timerId]?.set({
        isRunning: true,
        startTime: adjustedStartTime,
        elapsed: state.elapsed // Continue from where we left off
      });
      onTimerChange?.(timerId, state.elapsed, true);
    }
  }, [timers, exclusive, onTimerChange]);

  // Reset all timers
  const resetAllTimers = useCallback(() => {
    timers.forEach(timer => {
      timerStore$[timer.id]?.set({ isRunning: false, startTime: null, elapsed: 0 });
      onTimerChange?.(timer.id, 0, false);
    });
  }, [timers, onTimerChange]);

  // Session completion animations
  const completeBounce = useSharedValue(1);
  const handleSessionComplete = () => {
    completeBounce.value = withSequence(
      withSpring(1.1, { damping: 6 }),
      withSpring(0.95, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    resetAllTimers();
    sessionCompletion?.onSessionComplete?.();
  };

  const completeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeBounce.value }],
  }));

  return (
    <View className="mb-6">
      {/* Individual Timers */}
      <View className={getContainerStyle()}>
        {timers.map((timer) => {
          const state = getTimerState(timer.id);
          return (
            <View key={timer.id} className={getTimerStyle()}>
              <View className={`rounded-xl p-4 items-center border border-gray-200 ${
                timer.color ? `bg-${timer.color}-50` : 'bg-gray-50'
              }`}>
                <Text className="text-sm font-medium text-gray-600 mb-2">
                  {timer.label} {timer.emoji || '⏱️'}
                </Text>
                <Text className="text-2xl font-bold text-gray-800 mb-3 font-mono">
                  {formatTime(state.elapsed, showHours)}
                </Text>
                <Pressable
                  onPress={() => handleTimerToggle(timer.id)}
                  disabled={disabled}
                  className={`px-4 py-2 rounded-lg ${
                    state.isRunning
                      ? 'bg-red-500'
                      : timer.color 
                        ? `bg-${timer.color}-500` 
                        : 'bg-blue-500'
                  }`}
                >
                  <Text className="text-white font-medium text-sm">
                    {state.isRunning ? '⏸ Pause' : '▶ Start'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {/* Combined Total (if enabled and multiple timers) */}
      {showCombinedTotal && timers.length > 1 && (
        <View className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 items-center">
          <Text className="text-sm font-medium text-green-700 mb-1">
            🕐 {combinedTotalLabel}
          </Text>
          <Text className="text-xl font-bold text-green-800 font-mono">
            {formatTime(combinedTotal, showHours)}
          </Text>
          {exclusive && (
            <Text className="text-xs text-green-600 mt-1 text-center">
              Exclusive mode: Only one timer can run at a time
            </Text>
          )}
        </View>
      )}

      {/* Session Completion Button - Only show if explicitly enabled */}
      {sessionCompletion?.showCompletionButton && sessionCompletion?.sessionActive && (
        <Animated.View style={[completeButtonStyle]} className="mt-4">
          <Pressable
            onPress={handleSessionComplete}
            disabled={disabled}
            className="bg-green-500 px-6 py-3 rounded-lg items-center"
          >
            <Text className="text-white font-semibold">
              ✓ {sessionCompletion.completionLabel || 'Complete Session'}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
});

export default MultiTimerComponent;

// Export a reset function for external access
export const useMultiTimerReset = (persistenceKey: string, timerConfigs: TimerConfig[]) => {
  const [timerStore$] = useState(() => createTimerStore(persistenceKey, timerConfigs));
  
  return useCallback(() => {
    timerConfigs.forEach(timer => {
      timerStore$[timer.id]?.set({ isRunning: false, startTime: null, elapsed: 0 });
    });
  }, [timerConfigs]);
};