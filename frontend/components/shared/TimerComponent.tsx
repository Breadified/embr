import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { observer } from '@legendapp/state/react';
import Animated, { 
  useSharedValue, 
  withTiming, 
  withSpring,
  withSequence,
  withRepeat,
  useAnimatedStyle,
  interpolate,
  interpolateColor
} from 'react-native-reanimated';

// Timer states that all activity cards can use
export type TimerState = 'stopped' | 'running' | 'paused' | 'completed';

// 🏆 CHAMPIONSHIP ARCHITECTURE: Internal state for bulletproof timer management
interface TimerInternalState {
  elapsedSeconds: number;
  startTime: Date | null;
  pausedTime: Date | null;
  timerState: TimerState;
  intervalId: NodeJS.Timeout | null;
}

export interface TimerComponentProps {
  // Core timer functionality
  initialDuration?: number; // Initial seconds if resuming
  onStart?: (timestamp: Date) => void;
  onPause?: (elapsedSeconds: number) => void;
  onResume?: (timestamp: Date) => void;
  onStop?: (elapsedSeconds: number, endTimestamp: Date) => void;
  onTick?: (elapsedSeconds: number) => void;
  
  // Visual customization
  showHours?: boolean;
  showControls?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  
  // Activity-specific data
  activityType?: string;
  activityData?: Record<string, unknown>;
  
  // State management
  externalState?: TimerState;
  onStateChange?: (newState: TimerState) => void;
}


// Format seconds into readable time string
const formatTime = (totalSeconds: number, showHours: boolean = true): string => {
  // Ensure totalSeconds is a valid number
  const validSeconds = isNaN(totalSeconds) || totalSeconds < 0 ? 0 : Math.floor(totalSeconds);
  
  const hours = Math.floor(validSeconds / 3600);
  const minutes = Math.floor((validSeconds % 3600) / 60);
  const seconds = validSeconds % 60;
  
  if (showHours || hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Get size-based styling
const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return {
        container: 'p-2',
        text: 'text-lg font-mono',
        button: 'px-3 py-1.5',
        buttonText: 'text-sm'
      };
    case 'large':
      return {
        container: 'p-6',
        text: 'text-4xl font-mono',
        button: 'px-6 py-3',
        buttonText: 'text-lg'
      };
    default: // medium
      return {
        container: 'p-4',
        text: 'text-2xl font-mono',
        button: 'px-4 py-2',
        buttonText: 'text-base'
      };
  }
};

export const TimerComponent = observer<TimerComponentProps>(({
  initialDuration = 0,
  onStart,
  onPause,
  onResume,
  onStop,
  onTick,
  showHours = true,
  showControls = true,
  size = 'medium',
  color = '#3b82f6', // blue-500
  backgroundColor = '#f3f4f6', // gray-100
  activityType,
  activityData: _activityData, // eslint-disable-line @typescript-eslint/no-unused-vars
  externalState,
  onStateChange
}) => {
  // 🏆 CHAMPIONSHIP FIX: Use refs for mutable state that doesn't trigger re-renders
  const stateRef = useRef<TimerInternalState>({
    elapsedSeconds: initialDuration,
    startTime: null,
    pausedTime: null,
    timerState: externalState || 'stopped',
    intervalId: null
  });

  // React state for UI updates only
  const [displaySeconds, setDisplaySeconds] = useState(initialDuration);
  const [displayState, setDisplayState] = useState<TimerState>(externalState || 'stopped');
  
  // Enhanced animation values for championship polish
  const progressValue = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  const pulseValue = useSharedValue(1);
  const glowIntensity = useSharedValue(0);
  const digitTransition = useSharedValue(0);
  const celebrationScale = useSharedValue(1);
  
  // 🏆 CHAMPIONSHIP FIX: Bulletproof timer tick with ref-based state
  const tick = useCallback(() => {
    const currentState = stateRef.current;
    
    if (!currentState.startTime || currentState.timerState !== 'running') {
      console.log('⚠️ Timer tick called but timer not properly running');
      return;
    }
    
    if (currentState.pausedTime) {
      console.log('⏸️ Timer is paused, skipping tick');
      return;
    }
    
    const now = new Date();
    const elapsedMillis = now.getTime() - currentState.startTime.getTime();
    const newElapsedSeconds = Math.floor(elapsedMillis / 1000) + initialDuration;
    const validElapsedSeconds = Math.max(0, newElapsedSeconds);
    
    // Update ref state (doesn't trigger re-render)
    stateRef.current.elapsedSeconds = validElapsedSeconds;
    
    // Update display state (triggers re-render)
    setDisplaySeconds(validElapsedSeconds);
    
    console.log(`⏰ Timer tick: ${validElapsedSeconds}s (${formatTime(validElapsedSeconds)})`);
    
    // Call tick callback
    onTick?.(validElapsedSeconds);
    
    // Enhanced progress animations based on activity type
    if (activityType === 'nursing') {
      progressValue.value = withTiming(validElapsedSeconds % 2 === 0 ? 1 : 0.95, { duration: 800 });
    } else if (activityType === 'bottle') {
      progressValue.value = withTiming(validElapsedSeconds % 3 === 0 ? 1 : 0.9, { duration: 1200 });
    } else if (activityType === 'pumping') {
      progressValue.value = withTiming(validElapsedSeconds % 2 === 0 ? 1.05 : 0.95, { duration: 600 });
    } else {
      progressValue.value = withTiming(validElapsedSeconds % 2 === 0 ? 1 : 0.8, { duration: 500 });
    }
    
    // Number transition animation
    digitTransition.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );
  }, [initialDuration, onTick, progressValue, activityType, digitTransition, stateRef]);
  
  // 🏆 CHAMPIONSHIP FIX: Enhanced start timer with bulletproof state management
  const startTimer = useCallback(() => {
    const currentState = stateRef.current;
    
    if (currentState.timerState === 'running') {
      console.log('⚠️ Timer already running, ignoring start request');
      return;
    }
    
    const now = new Date();
    console.log(`🚀 Starting timer at ${now.toISOString()}`);
    
    // Clear any existing interval first
    if (currentState.intervalId) {
      console.log('🧹 Clearing existing interval before starting new one');
      clearInterval(currentState.intervalId);
    }
    
    if (currentState.timerState === 'paused') {
      // Resuming from pause
      if (currentState.pausedTime && currentState.startTime) {
        const pausedDuration = now.getTime() - currentState.pausedTime.getTime();
        const adjustedStart = new Date(currentState.startTime.getTime() + pausedDuration);
        
        console.log(`▶️ Resuming timer - was paused for ${Math.floor(pausedDuration / 1000)}s`);
        
        stateRef.current.startTime = adjustedStart;
        stateRef.current.pausedTime = null;
        onResume?.(now);
      }
    } else {
      // Starting fresh
      console.log('🎯 Starting fresh timer with initial duration:', initialDuration);
      stateRef.current.startTime = now;
      stateRef.current.elapsedSeconds = initialDuration;
      setDisplaySeconds(initialDuration);
      onStart?.(now);
      
      // Celebration animation
      celebrationScale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12 })
      );
    }
    
    // Update state
    stateRef.current.timerState = 'running';
    stateRef.current.pausedTime = null;
    setDisplayState('running');
    
    // 🏆 BULLETPROOF FIX: Create interval callback with guaranteed current state access
    const newIntervalId = setInterval(() => {
      // Always get the most current state on each interval tick
      const currentRefState = stateRef.current;
      console.log('🔄 Interval tick firing with state check:', {
        startTime: currentRefState.startTime?.toISOString(),
        timerState: currentRefState.timerState,
        hasStartTime: !!currentRefState.startTime
      });
      
      if (!currentRefState.startTime || currentRefState.timerState !== 'running') {
        console.log('⚠️ Interval tick: Timer not properly running, skipping');
        return;
      }
      
      tick();
    }, 1000);
    stateRef.current.intervalId = newIntervalId;
    
    console.log('⏱️ Timer interval started with ID:', newIntervalId);
    
    // Immediate first tick with current start time
    setTimeout(() => {
      console.log('⚡ Immediate first tick firing');
      tick();
    }, 0);
    
    // Activity-specific start animations
    if (activityType === 'nursing') {
      scaleValue.value = withSpring(1.05, { damping: 15 });
      glowIntensity.value = withTiming(0.3, { duration: 500 });
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      );
    } else if (activityType === 'bottle') {
      scaleValue.value = withSpring(1.1, { damping: 12 });
      glowIntensity.value = withTiming(0.4, { duration: 300 });
    } else if (activityType === 'pumping') {
      scaleValue.value = withSpring(1.08, { damping: 10 });
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(0.98, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      scaleValue.value = withSpring(1.1, { damping: 15 });
    }
  }, [tick, initialDuration, onStart, onResume, scaleValue, activityType, celebrationScale, pulseValue, glowIntensity]);
  
  // Enhanced pause timer
  const pauseTimer = useCallback(() => {
    const currentState = stateRef.current;
    
    if (currentState.timerState !== 'running') {
      console.log('⚠️ Timer not running, cannot pause');
      return;
    }
    
    const now = new Date();
    console.log(`⏸️ Pausing timer at ${now.toISOString()}`);
    
    // Update state
    stateRef.current.pausedTime = now;
    stateRef.current.timerState = 'paused';
    setDisplayState('paused');
    
    // Clear interval
    if (currentState.intervalId) {
      console.log('🛑 Clearing timer interval');
      clearInterval(currentState.intervalId);
      stateRef.current.intervalId = null;
    }
    
    // Stop animations
    pulseValue.value = withTiming(1, { duration: 500 });
    glowIntensity.value = withTiming(0.1, { duration: 300 });
    scaleValue.value = withSequence(
      withTiming(0.95, { duration: 150 }),
      withTiming(1, { duration: 300 })
    );
    
    onPause?.(currentState.elapsedSeconds);
  }, [onPause, pulseValue, glowIntensity, scaleValue]);
  
  // Enhanced stop timer
  const stopTimer = useCallback(() => {
    const currentState = stateRef.current;
    const now = new Date();
    
    console.log(`🛑 Stopping timer at ${now.toISOString()}, elapsed: ${currentState.elapsedSeconds}s`);
    
    // Clear interval
    if (currentState.intervalId) {
      console.log('🧹 Clearing timer interval on stop');
      clearInterval(currentState.intervalId);
      stateRef.current.intervalId = null;
    }
    
    // Reset state
    stateRef.current.timerState = 'completed';
    stateRef.current.startTime = null;
    stateRef.current.pausedTime = null;
    setDisplayState('completed');
    
    // Stop animations
    pulseValue.value = withTiming(1, { duration: 300 });
    glowIntensity.value = withTiming(0, { duration: 500 });
    
    // Completion celebration
    celebrationScale.value = withSequence(
      withSpring(1.2, { damping: 6, stiffness: 300 }),
      withSpring(0.95, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    
    // Activity-specific completion animations
    if (activityType === 'nursing') {
      scaleValue.value = withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 500 })
      );
    } else if (activityType === 'bottle') {
      scaleValue.value = withSequence(
        withTiming(0.9, { duration: 150 }),
        withTiming(1.15, { duration: 250 }),
        withTiming(1, { duration: 300 })
      );
    } else {
      scaleValue.value = withSequence(
        withTiming(0.9, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
    }
    
    onStop?.(currentState.elapsedSeconds, now);
  }, [onStop, scaleValue, activityType, pulseValue, glowIntensity, celebrationScale]);
  
  // State synchronization with external state
  // 🚨 CRITICAL FIX: Prevent infinite re-render loop
  useEffect(() => {
    if (externalState && externalState !== displayState) {
      stateRef.current.timerState = externalState;
      setDisplayState(externalState);
    }
  }, [externalState]); // REMOVED displayState dependency to break the loop

  useEffect(() => {
    if (onStateChange && displayState !== externalState) {
      onStateChange(displayState);
    }
  }, [displayState, onStateChange]); // REMOVED externalState dependency to break the loop
  
  // 🏆 CRITICAL: Cleanup on unmount
  useEffect(() => {
    return () => {
      const currentState = stateRef.current;
      if (currentState.intervalId) {
        console.log('🧹 Component unmounting, clearing interval');
        clearInterval(currentState.intervalId);
      }
    };
  }, []);
  
  // Enhanced animated styles
  const containerStyle = useAnimatedStyle(() => {
    const backgroundGlow = interpolateColor(
      glowIntensity.value,
      [0, 0.5],
      [backgroundColor, color + '20']
    );

    return {
      transform: [{ scale: scaleValue.value * celebrationScale.value }],
      backgroundColor: backgroundGlow,
      borderWidth: glowIntensity.value > 0 ? 1 : 0,
      borderColor: color + '40',
      opacity: glowIntensity.value > 0 ? 1 : 0.95,
    };
  });

  const timerTextStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: digitTransition.value * pulseValue.value }],
      opacity: interpolate(progressValue.value, [0.8, 1], [0.9, 1]),
    };
  });

  const stateIndicatorStyle = useAnimatedStyle(() => {
    const isRunning = displayState === 'running';
    const indicatorScale = isRunning ? pulseValue.value : 1;
    
    return {
      transform: [{ scale: indicatorScale }],
    };
  });
  
  // Get size-based styles
  const sizeStyles = getSizeStyles(size);
  
  // Format current time for display - ensure it's always a string
  const formattedTime = String(formatTime(displaySeconds, showHours) || '00:00');
  
  // Debug logging
  console.log(`🔍 Timer render: state=${displayState}, elapsed=${displaySeconds}, formatted=${formattedTime}`);
  
  return (
    <Animated.View 
      style={[containerStyle]}
      className={`items-center justify-center rounded-lg ${sizeStyles.container} relative border border-gray-200`}
    >
      {/* Active Glow Background */}
      {displayState === 'running' && (
        <Animated.View 
          style={[{
            position: 'absolute',
            inset: 0,
            backgroundColor: color + '10',
            borderRadius: 8,
          }, stateIndicatorStyle]}
        />
      )}
      
      {/* 🏆 CHAMPIONSHIP FIX: BULLETPROOF TIMER DISPLAY */}
      <View className="items-center mb-2">
        <Animated.Text 
          style={[timerTextStyle, { color: color }]}
          className={`${sizeStyles.text} font-bold text-center`}
          testID="timer-display"
        >
          {formattedTime}
        </Animated.Text>
        
        {/* Additional visual emphasis for large timers */}
        {size === 'large' && (
          <Text className="text-sm text-gray-500 mt-1 tracking-widest uppercase">
            {displayState === 'running' ? 'Running' : 
             displayState === 'paused' ? 'Paused' : 
             displayState === 'completed' ? 'Completed' : 'Ready'}
          </Text>
        )}
      </View>
      
      {/* Activity Type Badge */}
      {activityType && (
        <Text className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
          {String(activityType)}
        </Text>
      )}
      
      {/* Control Buttons */}
      {showControls && (
        <View className="flex-row items-center justify-center gap-2">
          {displayState === 'stopped' || displayState === 'completed' ? (
            <Pressable
              onPress={startTimer}
              className={`${sizeStyles.button} bg-green-500 rounded-lg`}
              testID="timer-start-button"
            >
              <Text className={`${sizeStyles.buttonText} text-white font-semibold`}>
                Start
              </Text>
            </Pressable>
          ) : displayState === 'running' ? (
            <>
              <Pressable
                onPress={pauseTimer}
                className={`${sizeStyles.button} bg-yellow-500 rounded-lg`}
                testID="timer-pause-button"
              >
                <Text className={`${sizeStyles.buttonText} text-white font-semibold`}>
                  Pause
                </Text>
              </Pressable>
              <Pressable
                onPress={stopTimer}
                className={`${sizeStyles.button} bg-red-500 rounded-lg`}
                testID="timer-stop-button"
              >
                <Text className={`${sizeStyles.buttonText} text-white font-semibold`}>
                  Stop
                </Text>
              </Pressable>
            </>
          ) : displayState === 'paused' ? (
            <>
              <Pressable
                onPress={startTimer}
                className={`${sizeStyles.button} bg-blue-500 rounded-lg`}
                testID="timer-resume-button"
              >
                <Text className={`${sizeStyles.buttonText} text-white font-semibold`}>
                  Resume
                </Text>
              </Pressable>
              <Pressable
                onPress={stopTimer}
                className={`${sizeStyles.button} bg-red-500 rounded-lg`}
                testID="timer-stop-button"
              >
                <Text className={`${sizeStyles.buttonText} text-white font-semibold`}>
                  Stop
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}
      
      {/* Enhanced State Indicator */}
      <View className="flex-row items-center mt-3">
        <Animated.View 
          style={[stateIndicatorStyle, {
            backgroundColor: 
              displayState === 'running' ? '#10B981' :
              displayState === 'paused' ? '#F59E0B' :
              displayState === 'completed' ? '#3B82F6' :
              '#6B7280'
          }]}
          className="w-2 h-2 rounded-full mr-2"
        />
        <Text className="text-xs text-gray-600 capitalize font-medium">
          {displayState === 'running' ? '● Running' :
           displayState === 'paused' ? '⏸ Paused' :
           displayState === 'completed' ? '✓ Completed' :
           '○ Ready'}
        </Text>
      </View>
    </Animated.View>
  );
});

// Session data interface
interface SessionData {
  activityType: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  metadata: Record<string, unknown>;
  completed?: boolean;
}

// Export helper hook for using timer in activity cards
export const useActivityTimer = (
  activityType: string,
  onSessionStart?: (sessionData: SessionData) => void,
  onSessionEnd?: (sessionData: SessionData) => void
) => {
  const [timerState, setTimerState] = useState<TimerState>('stopped');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  
  const handleStart = useCallback((timestamp: Date) => {
    const session: SessionData = {
      activityType,
      startTime: timestamp,
      metadata: {}
    };
    setSessionData(session);
    onSessionStart?.(session);
  }, [activityType, onSessionStart]);
  
  const handleStop = useCallback((elapsedSeconds: number, endTime: Date) => {
    if (sessionData) {
      const completedSession: SessionData = {
        ...sessionData,
        endTime,
        duration: elapsedSeconds,
        completed: true
      };
      onSessionEnd?.(completedSession);
      setSessionData(null);
    }
  }, [sessionData, onSessionEnd]);
  
  return {
    timerState,
    setTimerState,
    handleStart,
    handleStop,
    sessionData
  };
};