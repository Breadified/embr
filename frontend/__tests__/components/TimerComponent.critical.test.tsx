/**
 * 🏆 CHAMPIONSHIP TIMER TESTS - Critical validation suite
 * Tests the bulletproof ref-based timer architecture
 */

import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { TimerComponent } from '../../components/shared/TimerComponent';

describe('🏆 TimerComponent - Championship Tests', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('🎯 Core Timer Functionality', () => {
    it('should initialize with stopped state and correct time display', () => {
      const { getByTestId } = render(<TimerComponent />);
      
      const display = getByTestId('timer-display');
      expect(display.props.children).toBe('00:00:00');
      
      const startButton = getByTestId('timer-start-button');
      expect(startButton).toBeTruthy();
    });

    it('should start timer and update display correctly', async () => {
      const mockOnStart = jest.fn();
      const mockOnTick = jest.fn();
      
      const { getByTestId } = render(
        <TimerComponent onStart={mockOnStart} onTick={mockOnTick} />
      );
      
      const startButton = getByTestId('timer-start-button');
      
      act(() => {
        fireEvent.press(startButton);
      });
      
      // Verify onStart callback was called
      expect(mockOnStart).toHaveBeenCalledWith(expect.any(Date));
      
      // Fast-forward time and check tick callback
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(mockOnTick).toHaveBeenCalledWith(expect.any(Number));
      });
      
      // Should now show pause and stop buttons
      expect(getByTestId('timer-pause-button')).toBeTruthy();
      expect(getByTestId('timer-stop-button')).toBeTruthy();
    });

    it('should pause and resume timer correctly', async () => {
      const mockOnPause = jest.fn();
      const mockOnResume = jest.fn();
      
      const { getByTestId } = render(
        <TimerComponent onPause={mockOnPause} onResume={mockOnResume} />
      );
      
      // Start timer
      act(() => {
        fireEvent.press(getByTestId('timer-start-button'));
      });
      
      // Advance time then pause
      act(() => {
        jest.advanceTimersByTime(2000);
        fireEvent.press(getByTestId('timer-pause-button'));
      });
      
      expect(mockOnPause).toHaveBeenCalledWith(expect.any(Number));
      
      // Should show resume button
      const resumeButton = getByTestId('timer-resume-button');
      expect(resumeButton).toBeTruthy();
      
      // Resume
      act(() => {
        fireEvent.press(resumeButton);
      });
      
      expect(mockOnResume).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should stop timer and trigger completion', async () => {
      const mockOnStop = jest.fn();
      
      const { getByTestId } = render(
        <TimerComponent onStop={mockOnStop} />
      );
      
      // Start timer
      act(() => {
        fireEvent.press(getByTestId('timer-start-button'));
      });
      
      // Advance time then stop
      act(() => {
        jest.advanceTimersByTime(3000);
        fireEvent.press(getByTestId('timer-stop-button'));
      });
      
      expect(mockOnStop).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Date)
      );
    });
  });

  describe('🛡️ Race Condition Prevention', () => {
    it('should handle rapid start/stop operations without state conflicts', async () => {
      const { getByTestId } = render(<TimerComponent />);
      
      // Rapid start/stop sequence
      act(() => {
        fireEvent.press(getByTestId('timer-start-button'));
        jest.advanceTimersByTime(100);
        fireEvent.press(getByTestId('timer-stop-button'));
        jest.advanceTimersByTime(100);
        fireEvent.press(getByTestId('timer-start-button'));
      });
      
      // Should be in running state
      await waitFor(() => {
        expect(getByTestId('timer-pause-button')).toBeTruthy();
      });
    });

    it('should not allow multiple simultaneous start operations', () => {
      const mockOnStart = jest.fn();
      const { getByTestId } = render(<TimerComponent onStart={mockOnStart} />);
      
      const startButton = getByTestId('timer-start-button');
      
      // Try to start multiple times rapidly
      act(() => {
        fireEvent.press(startButton);
        fireEvent.press(startButton);
        fireEvent.press(startButton);
      });
      
      // Should only call onStart once
      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('⚡ Performance & Memory', () => {
    it('should clean up intervals on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { getByTestId, unmount } = render(<TimerComponent />);
      
      // Start timer to create interval
      act(() => {
        fireEvent.press(getByTestId('timer-start-button'));
      });
      
      // Unmount component
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should handle external state changes correctly', () => {
      const { rerender, getByTestId } = render(
        <TimerComponent externalState="stopped" />
      );
      
      // Change external state to running
      rerender(<TimerComponent externalState="running" />);
      
      // Should show running state buttons
      expect(() => getByTestId('timer-pause-button')).not.toThrow();
    });
  });

  describe('🎨 Activity-Specific Behavior', () => {
    it('should apply activity-specific styling and behavior', () => {
      const { getByTestId } = render(
        <TimerComponent activityType="nursing" color="#ff6b6b" />
      );
      
      const display = getByTestId('timer-display');
      expect(display.props.style).toEqual(
        expect.objectContaining({
          color: '#ff6b6b',
        })
      );
    });

    it('should format time correctly for different durations', () => {
      const { getByTestId } = render(
        <TimerComponent initialDuration={3665} showHours={true} />
      );
      
      const display = getByTestId('timer-display');
      expect(display.props.children).toBe('01:01:05'); // 1 hour, 1 minute, 5 seconds
    });

    it('should hide hours when showHours is false', () => {
      const { getByTestId } = render(
        <TimerComponent initialDuration={125} showHours={false} />
      );
      
      const display = getByTestId('timer-display');
      expect(display.props.children).toBe('02:05'); // 2 minutes, 5 seconds
    });
  });

  describe('🚨 Error Handling & Edge Cases', () => {
    it('should handle invalid initial duration gracefully', () => {
      const { getByTestId } = render(
        <TimerComponent initialDuration={-10} />
      );
      
      const display = getByTestId('timer-display');
      expect(display.props.children).toBe('00:00:00');
    });

    it('should prevent negative elapsed time', async () => {
      const mockOnTick = jest.fn();
      
      const { getByTestId } = render(
        <TimerComponent onTick={mockOnTick} />
      );
      
      // Start timer
      act(() => {
        fireEvent.press(getByTestId('timer-start-button'));
      });
      
      // Advance time
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(mockOnTick).toHaveBeenCalledWith(expect.any(Number));
        const lastCall = mockOnTick.mock.calls[mockOnTick.mock.calls.length - 1];
        expect(lastCall[0]).toBeGreaterThanOrEqual(0);
      });
    });
  });
});