import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { TimerComponent, useActivityTimer } from '../components/shared/TimerComponent';

// The react-native-reanimated mock is already set up in jest-setup.js
// No need to mock it again here

describe('TimerComponent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('renders with initial stopped state', () => {
      const { getByText } = render(<TimerComponent />);
      
      expect(getByText('00:00')).toBeTruthy();
      expect(getByText('Start')).toBeTruthy();
      expect(getByText('stopped')).toBeTruthy();
    });

    it('displays time with hours when showHours is true', () => {
      const { getByText } = render(
        <TimerComponent initialDuration={3661} showHours={true} />
      );
      
      expect(getByText('01:01:01')).toBeTruthy();
    });

    it('displays time without hours when showHours is false', () => {
      const { getByText } = render(
        <TimerComponent initialDuration={125} showHours={false} />
      );
      
      expect(getByText('02:05')).toBeTruthy();
    });

    it('hides controls when showControls is false', () => {
      const { queryByText } = render(
        <TimerComponent showControls={false} />
      );
      
      expect(queryByText('Start')).toBeNull();
    });
  });

  describe('Timer Controls', () => {
    it('starts timer when start button is pressed', async () => {
      const onStart = jest.fn();
      const { getByText } = render(
        <TimerComponent onStart={onStart} />
      );
      
      const startButton = getByText('Start');
      
      await act(async () => {
        fireEvent.press(startButton);
      });
      
      expect(onStart).toHaveBeenCalled();
      expect(getByText('Pause')).toBeTruthy();
      expect(getByText('Stop')).toBeTruthy();
      expect(getByText('running')).toBeTruthy();
    });

    it('pauses timer when pause button is pressed', async () => {
      const onPause = jest.fn();
      const { getByText } = render(
        <TimerComponent onPause={onPause} />
      );
      
      // Start timer first
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });
      
      // Then pause it
      await act(async () => {
        fireEvent.press(getByText('Pause'));
      });
      
      expect(onPause).toHaveBeenCalled();
      expect(getByText('Resume')).toBeTruthy();
      expect(getByText('paused')).toBeTruthy();
    });

    it('resumes timer when resume button is pressed', async () => {
      const onResume = jest.fn();
      const { getByText } = render(
        <TimerComponent onResume={onResume} />
      );
      
      // Start, pause, then resume
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });
      await act(async () => {
        fireEvent.press(getByText('Pause'));
      });
      await act(async () => {
        fireEvent.press(getByText('Resume'));
      });
      
      expect(onResume).toHaveBeenCalled();
      expect(getByText('running')).toBeTruthy();
    });

    it('stops timer when stop button is pressed', async () => {
      const onStop = jest.fn();
      const { getByText } = render(
        <TimerComponent onStop={onStop} />
      );
      
      // Start timer first
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });
      
      // Then stop it
      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });
      
      expect(onStop).toHaveBeenCalled();
      expect(getByText('Start')).toBeTruthy();
      expect(getByText('completed')).toBeTruthy();
    });
  });

  describe('Timer Functionality', () => {
    it('updates elapsed time correctly', async () => {
      const onTick = jest.fn();
      const { getByText } = render(
        <TimerComponent onTick={onTick} />
      );
      
      // Start timer
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });
      
      // Advance time by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      await waitFor(() => {
        expect(getByText('00:05')).toBeTruthy();
      });
    });

    it('continues from initial duration when provided', async () => {
      const { getByText } = render(
        <TimerComponent initialDuration={60} />
      );
      
      expect(getByText('01:00')).toBeTruthy();
      
      // Start timer
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });
      
      // Advance time by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      await waitFor(() => {
        expect(getByText('01:05')).toBeTruthy();
      });
    });

    it('handles pause and resume correctly', async () => {
      const { getByText } = render(<TimerComponent />);
      
      // Start timer
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });
      
      // Advance 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      // Pause
      await act(async () => {
        fireEvent.press(getByText('Pause'));
      });
      
      // Advance more time while paused
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      // Should still show 3 seconds
      expect(getByText('00:03')).toBeTruthy();
      
      // Resume
      await act(async () => {
        fireEvent.press(getByText('Resume'));
      });
      
      // Advance 2 more seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      await waitFor(() => {
        expect(getByText('00:05')).toBeTruthy();
      });
    });
  });

  describe('External State Management', () => {
    it('syncs with external state changes', async () => {
      const onStateChange = jest.fn();
      const { rerender } = render(
        <TimerComponent 
          externalState="stopped" 
          onStateChange={onStateChange} 
        />
      );
      
      // Change external state to running
      rerender(
        <TimerComponent 
          externalState="running" 
          onStateChange={onStateChange} 
        />
      );
      
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith('running');
      });
    });

    it('notifies external state changes when internal state changes', async () => {
      const onStateChange = jest.fn();
      const { getByText } = render(
        <TimerComponent onStateChange={onStateChange} />
      );
      
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });
      
      expect(onStateChange).toHaveBeenCalledWith('running');
    });
  });

  describe('Size Variants', () => {
    it('applies small size styles correctly', () => {
      const { getByText } = render(
        <TimerComponent size="small" />
      );
      
      const timerText = getByText('00:00');
      expect(timerText.props.className).toContain('text-lg');
    });

    it('applies large size styles correctly', () => {
      const { getByText } = render(
        <TimerComponent size="large" />
      );
      
      const timerText = getByText('00:00');
      expect(timerText.props.className).toContain('text-4xl');
    });
  });

  describe('Activity Integration', () => {
    it('displays activity type badge when provided', () => {
      const { getByText } = render(
        <TimerComponent activityType="nursing" />
      );
      
      expect(getByText('NURSING')).toBeTruthy();
    });

    it('applies custom colors correctly', () => {
      const { getByText } = render(
        <TimerComponent color="#ff0000" backgroundColor="#00ff00" />
      );
      
      const timerText = getByText('00:00');
      expect(timerText.props.style.color).toBe('#ff0000');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long durations correctly', () => {
      const { getByText } = render(
        <TimerComponent initialDuration={359999} /> // 99h 59m 59s
      );
      
      expect(getByText('99:59:59')).toBeTruthy();
    });

    it('handles zero duration correctly', () => {
      const { getByText } = render(
        <TimerComponent initialDuration={0} />
      );
      
      expect(getByText('00:00')).toBeTruthy();
    });

    it('cleans up intervals on unmount', async () => {
      const { getByText, unmount } = render(<TimerComponent />);
      
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});

describe('useActivityTimer Hook', () => {
  // Mock hook testing requires rendering in a test component
  const TestComponent: React.FC<{
    activityType: string;
    onSessionStart?: (sessionData: any) => void;
    onSessionEnd?: (sessionData: any) => void;
  }> = ({ activityType, onSessionStart, onSessionEnd }) => {
    const { timerState, handleStart, handleStop, sessionData } = useActivityTimer(
      activityType,
      onSessionStart,
      onSessionEnd
    );

    return (
      <>
        <TimerComponent
          onStart={handleStart}
          onStop={handleStop}
          externalState={timerState}
        />
        {sessionData && <div data-testid="session-active">Session Active</div>}
      </>
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onSessionStart when timer starts', async () => {
    const onSessionStart = jest.fn();
    const { getByText } = render(
      <TestComponent 
        activityType="bottle" 
        onSessionStart={onSessionStart} 
      />
    );
    
    await act(async () => {
      fireEvent.press(getByText('Start'));
    });
    
    expect(onSessionStart).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: 'bottle',
        startTime: expect.any(Date),
        metadata: {}
      })
    );
  });

  it('calls onSessionEnd when timer stops', async () => {
    const onSessionEnd = jest.fn();
    const { getByText } = render(
      <TestComponent 
        activityType="bottle" 
        onSessionEnd={onSessionEnd} 
      />
    );
    
    // Start timer
    await act(async () => {
      fireEvent.press(getByText('Start'));
    });
    
    // Advance time
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    
    // Stop timer
    await act(async () => {
      fireEvent.press(getByText('Stop'));
    });
    
    expect(onSessionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: 'bottle',
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        duration: 10,
        completed: true
      })
    );
  });

  it('manages session data correctly', async () => {
    const { getByText, getByTestId } = render(
      <TestComponent activityType="nursing" />
    );
    
    // Should not show session active initially
    expect(() => getByTestId('session-active')).toThrow();
    
    // Start timer
    await act(async () => {
      fireEvent.press(getByText('Start'));
    });
    
    // Should show session active
    expect(getByTestId('session-active')).toBeTruthy();
    
    // Stop timer
    await act(async () => {
      fireEvent.press(getByText('Stop'));
    });
    
    // Should not show session active after stop
    expect(() => getByTestId('session-active')).toThrow();
  });
});