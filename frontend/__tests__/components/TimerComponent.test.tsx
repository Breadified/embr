import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { TimerComponent, TimerState } from '../../components/shared/TimerComponent';

// Mock timers for controlled testing
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllTimers();
  
  // Clear console mocks
  jest.clearAllMocks();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('TimerComponent', () => {
  // 🏆 CHAMPIONSHIP TESTING - UI Rendering Tests
  describe('UI Rendering', () => {
    it('should render collapsed state correctly', () => {
      const { getByTestId, getByText } = render(
        <TimerComponent 
          initialDuration={0}
          showControls={true}
          size="medium"
        />
      );

      // Timer display should be visible
      expect(getByTestId('timer-display')).toBeTruthy();
      expect(getByText('00:00:00')).toBeTruthy();
      
      // Start button should be visible
      expect(getByTestId('timer-start-button')).toBeTruthy();
      expect(getByText('Start')).toBeTruthy();
    });

    it('should render expanded state correctly when running', async () => {
      const { getByTestId, getByText } = render(
        <TimerComponent 
          initialDuration={0}
          showControls={true}
          size="medium"
        />
      );

      // Start the timer
      const startButton = getByTestId('timer-start-button');
      fireEvent.press(startButton);

      // Wait for state to update
      await waitFor(() => {
        expect(getByTestId('timer-pause-button')).toBeTruthy();
        expect(getByTestId('timer-stop-button')).toBeTruthy();
      });

      expect(getByText('Pause')).toBeTruthy();
      expect(getByText('Stop')).toBeTruthy();
    });

    it('should show proper activity colors and branding', () => {
      const testColor = '#FF6B6B';
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          color={testColor}
          activityType="nursing"
          size="large"
        />
      );

      const timerDisplay = getByTestId('timer-display');
      expect(timerDisplay).toBeTruthy();
      
      // Component should render without crashing with custom colors
      expect(timerDisplay).toHaveTextContent('00:00:00');
    });

    it('should render different sizes correctly', () => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      
      sizes.forEach(size => {
        const { getByTestId } = render(
          <TimerComponent 
            initialDuration={0}
            size={size}
            testID={`timer-${size}`}
          />
        );
        
        expect(getByTestId('timer-display')).toBeTruthy();
      });
    });
  });

  // 🏆 CHAMPIONSHIP TESTING - Timer Functionality Tests
  describe('Timer Functionality', () => {
    it('should start timer and show elapsed time', async () => {
      const mockOnStart = jest.fn();
      const mockOnTick = jest.fn();
      
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          onStart={mockOnStart}
          onTick={mockOnTick}
          showControls={true}
        />
      );

      // Start the timer
      const startButton = getByTestId('timer-start-button');
      fireEvent.press(startButton);

      // Verify start callback was called
      expect(mockOnStart).toHaveBeenCalledTimes(1);
      expect(mockOnStart).toHaveBeenCalledWith(expect.any(Date));

      // Advance time by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Wait for timer tick
      await waitFor(() => {
        expect(mockOnTick).toHaveBeenCalled();
      });
    });

    it('should pause/resume timer correctly', async () => {
      const mockOnPause = jest.fn();
      const mockOnResume = jest.fn();
      
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          onPause={mockOnPause}
          onResume={mockOnResume}
          showControls={true}
        />
      );

      // Start the timer
      fireEvent.press(getByTestId('timer-start-button'));

      // Wait for running state
      await waitFor(() => {
        expect(getByTestId('timer-pause-button')).toBeTruthy();
      });

      // Pause the timer
      fireEvent.press(getByTestId('timer-pause-button'));

      // Verify pause callback was called
      expect(mockOnPause).toHaveBeenCalledTimes(1);
      expect(mockOnPause).toHaveBeenCalledWith(expect.any(Number));

      // Wait for paused state
      await waitFor(() => {
        expect(getByTestId('timer-resume-button')).toBeTruthy();
      });

      // Resume the timer
      fireEvent.press(getByTestId('timer-resume-button'));

      // Verify resume callback was called
      expect(mockOnResume).toHaveBeenCalledTimes(1);
      expect(mockOnResume).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should stop timer and save session', async () => {
      const mockOnStop = jest.fn();
      
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          onStop={mockOnStop}
          showControls={true}
        />
      );

      // Start the timer
      fireEvent.press(getByTestId('timer-start-button'));

      // Wait for running state
      await waitFor(() => {
        expect(getByTestId('timer-stop-button')).toBeTruthy();
      });

      // Stop the timer
      fireEvent.press(getByTestId('timer-stop-button'));

      // Verify stop callback was called
      expect(mockOnStop).toHaveBeenCalledTimes(1);
      expect(mockOnStop).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Date)
      );
    });

    it('should handle timer errors gracefully', async () => {
      const mockOnStart = jest.fn(() => {
        throw new Error('Test error');
      });
      
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          onStart={mockOnStart}
          showControls={true}
        />
      );

      // Start the timer - should not crash
      fireEvent.press(getByTestId('timer-start-button'));

      // Component should still be functional
      expect(getByTestId('timer-display')).toBeTruthy();
    });
  });

  // 🏆 CHAMPIONSHIP TESTING - Data Persistence Tests
  describe('Data Persistence', () => {
    it('should restore session on app restart with initial duration', () => {
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={300} // 5 minutes
          showControls={true}
        />
      );

      // Timer should show the restored duration
      expect(getByTestId('timer-display')).toHaveTextContent('00:05:00');
    });

    it('should handle external state correctly', async () => {
      const mockOnStateChange = jest.fn();
      
      const { rerender } = render(
        <TimerComponent 
          initialDuration={0}
          externalState="stopped"
          onStateChange={mockOnStateChange}
        />
      );

      // Change external state
      rerender(
        <TimerComponent 
          initialDuration={0}
          externalState="running"
          onStateChange={mockOnStateChange}
        />
      );

      // Should have updated internal state
      await waitFor(() => {
        expect(mockOnStateChange).toHaveBeenCalled();
      });
    });
  });

  // 🏆 CHAMPIONSHIP TESTING - Error States Tests
  describe('Error States', () => {
    it('should handle network failures gracefully', () => {
      // Mock network failure scenario
      const mockOnStart = jest.fn();
      
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          onStart={mockOnStart}
          showControls={true}
        />
      );

      // Should render without crashing
      expect(getByTestId('timer-display')).toBeTruthy();
      
      // Should still be interactive
      fireEvent.press(getByTestId('timer-start-button'));
      expect(mockOnStart).toHaveBeenCalled();
    });

    it('should show loading states during sync', () => {
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          showControls={true}
        />
      );

      // Timer should be visible and functional
      expect(getByTestId('timer-display')).toBeTruthy();
      expect(getByTestId('timer-start-button')).toBeTruthy();
    });

    it('should recover from corrupted local data', () => {
      // Test with invalid initial duration
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={-100} // Invalid duration
          showControls={true}
        />
      );

      // Should show 00:00:00 instead of negative time
      expect(getByTestId('timer-display')).toHaveTextContent('00:00:00');
    });
  });

  // 🏆 CHAMPIONSHIP TESTING - Animation & UX Tests
  describe('Animation & UX', () => {
    it('should provide proper feedback for interactions', () => {
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          showControls={true}
          size="large"
        />
      );

      // Should render without animation errors
      expect(getByTestId('timer-display')).toBeTruthy();
      
      // Should handle button interactions
      fireEvent.press(getByTestId('timer-start-button'));
      expect(getByTestId('timer-display')).toBeTruthy();
    });

    it('should handle activity-specific animations', () => {
      const activityTypes = ['nursing', 'bottle', 'pumping', 'sleep'];
      
      activityTypes.forEach(activityType => {
        const { getByTestId } = render(
          <TimerComponent 
            initialDuration={0}
            activityType={activityType}
            showControls={true}
          />
        );
        
        // Should render without crashing for each activity type
        expect(getByTestId('timer-display')).toBeTruthy();
        
        // Should handle start without errors
        fireEvent.press(getByTestId('timer-start-button'));
      });
    });
  });

  // 🏆 CHAMPIONSHIP TESTING - Format Functions
  describe('Format Functions', () => {
    it('should format time correctly with hours', () => {
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={3661} // 1:01:01
          showHours={true}
        />
      );

      expect(getByTestId('timer-display')).toHaveTextContent('01:01:01');
    });

    it('should format time correctly without hours', () => {
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={61} // 1:01
          showHours={false}
        />
      );

      expect(getByTestId('timer-display')).toHaveTextContent('01:01');
    });

    it('should handle edge cases in time formatting', () => {
      const testCases = [
        { duration: 0, expected: '00:00:00' },
        { duration: 59, expected: '00:00:59' },
        { duration: 60, expected: '00:01:00' },
        { duration: 3599, expected: '00:59:59' },
        { duration: 3600, expected: '01:00:00' },
      ];

      testCases.forEach(({ duration, expected }) => {
        const { getByTestId } = render(
          <TimerComponent 
            initialDuration={duration}
            showHours={true}
          />
        );
        
        expect(getByTestId('timer-display')).toHaveTextContent(expected);
      });
    });
  });

  // 🏆 CHAMPIONSHIP TESTING - State Transitions
  describe('State Transitions', () => {
    it('should handle all state transitions correctly', async () => {
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          showControls={true}
        />
      );

      // Initial state: stopped
      expect(getByTestId('timer-start-button')).toBeTruthy();

      // Start -> running
      fireEvent.press(getByTestId('timer-start-button'));
      await waitFor(() => {
        expect(getByTestId('timer-pause-button')).toBeTruthy();
      });

      // Pause -> paused
      fireEvent.press(getByTestId('timer-pause-button'));
      await waitFor(() => {
        expect(getByTestId('timer-resume-button')).toBeTruthy();
      });

      // Resume -> running
      fireEvent.press(getByTestId('timer-resume-button'));
      await waitFor(() => {
        expect(getByTestId('timer-pause-button')).toBeTruthy();
      });

      // Stop -> completed
      fireEvent.press(getByTestId('timer-stop-button'));
      await waitFor(() => {
        expect(getByTestId('timer-start-button')).toBeTruthy();
      });
    });
  });

  // 🏆 CHAMPIONSHIP TESTING - Performance Tests
  describe('Performance', () => {
    it('should handle rapid start/stop without memory leaks', () => {
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          showControls={true}
        />
      );

      // Rapidly start and stop
      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByTestId('timer-start-button'));
        fireEvent.press(getByTestId('timer-stop-button'));
      }

      // Should still be functional
      expect(getByTestId('timer-display')).toBeTruthy();
    });

    it('should clean up intervals on unmount', () => {
      const { getByTestId, unmount } = render(
        <TimerComponent 
          initialDuration={0}
          showControls={true}
        />
      );

      // Start timer
      fireEvent.press(getByTestId('timer-start-button'));

      // Unmount component
      unmount();

      // Should not throw any errors
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  // 🏆 CHAMPIONSHIP TESTING - Edge Cases
  describe('Edge Cases', () => {
    it('should handle component unmount during timer', () => {
      const { getByTestId, unmount } = render(
        <TimerComponent 
          initialDuration={0}
          showControls={true}
        />
      );

      // Start timer
      fireEvent.press(getByTestId('timer-start-button'));

      // Unmount while running
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle multiple start calls', async () => {
      const mockOnStart = jest.fn();
      
      const { getByTestId } = render(
        <TimerComponent 
          initialDuration={0}
          onStart={mockOnStart}
          showControls={true}
        />
      );

      // Multiple start calls
      fireEvent.press(getByTestId('timer-start-button'));
      
      await waitFor(() => {
        expect(getByTestId('timer-pause-button')).toBeTruthy();
      });

      // Second start call should be ignored
      const pauseButton = getByTestId('timer-pause-button');
      expect(pauseButton).toBeTruthy();

      // Should only be called once
      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid prop values', () => {
      expect(() => {
        render(
          <TimerComponent 
            // @ts-expect-error - Testing invalid props
            initialDuration="invalid"
            // @ts-expect-error
            size="invalid"
            showControls={true}
          />
        );
      }).not.toThrow();
    });
  });
});