import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TimerComponent } from '../../components/shared/TimerComponent';

// 🏆 CHAMPIONSHIP SMOKE TEST - Quick validation that our fix works
describe('TimerComponent - Championship Smoke Test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('🏆 CRITICAL: Should start timer without "no start time set" error', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const mockOnTick = jest.fn();
    
    const { getByTestId } = render(
      <TimerComponent 
        initialDuration={0}
        onTick={mockOnTick}
        showControls={true}
      />
    );

    // Start the timer
    fireEvent.press(getByTestId('timer-start-button'));

    // Advance time by 2 seconds
    jest.advanceTimersByTime(2000);

    // Wait for timer updates
    await waitFor(() => {
      expect(mockOnTick).toHaveBeenCalled();
    });

    // 🏆 CRITICAL VALIDATION: Should NOT contain the error message
    const errorLogs = consoleSpy.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('⚠️ Timer tick called but no start time set'))
    );
    
    expect(errorLogs).toHaveLength(0);

    // Should contain success messages
    const successLogs = consoleSpy.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('⏰ Timer tick:'))
    );
    
    expect(successLogs.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it('🏆 CRITICAL: Should render timer display without text rendering errors', () => {
    const { getByTestId } = render(
      <TimerComponent 
        initialDuration={0}
        showControls={true}
      />
    );

    const timerDisplay = getByTestId('timer-display');
    expect(timerDisplay).toBeTruthy();
    expect(timerDisplay).toHaveTextContent('00:00:00');
  });

  it('🏆 CRITICAL: Should handle pause/resume cycle without errors', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    const { getByTestId } = render(
      <TimerComponent 
        initialDuration={0}
        showControls={true}
      />
    );

    // Start timer
    fireEvent.press(getByTestId('timer-start-button'));
    
    await waitFor(() => {
      expect(getByTestId('timer-pause-button')).toBeTruthy();
    });

    // Pause timer
    fireEvent.press(getByTestId('timer-pause-button'));
    
    await waitFor(() => {
      expect(getByTestId('timer-resume-button')).toBeTruthy();
    });

    // Resume timer
    fireEvent.press(getByTestId('timer-resume-button'));
    
    await waitFor(() => {
      expect(getByTestId('timer-pause-button')).toBeTruthy();
    });

    // Advance time and verify no errors
    jest.advanceTimersByTime(1000);

    const errorLogs = consoleSpy.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('⚠️'))
    );
    
    expect(errorLogs).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  it('🏆 CRITICAL: Should cleanup intervals on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
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

    // Should have called clearInterval
    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });

  it('🏆 CRITICAL: Should handle activity-specific animations without errors', () => {
    const activityTypes = ['nursing', 'bottle', 'pumping', 'sleep'];
    
    activityTypes.forEach(activityType => {
      const { getByTestId, unmount } = render(
        <TimerComponent 
          initialDuration={0}
          activityType={activityType}
          showControls={true}
        />
      );
      
      // Should render without errors
      expect(getByTestId('timer-display')).toBeTruthy();
      
      // Should handle start without errors
      expect(() => {
        fireEvent.press(getByTestId('timer-start-button'));
      }).not.toThrow();

      unmount();
    });
  });
});