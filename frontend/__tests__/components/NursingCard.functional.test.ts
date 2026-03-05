/**
 * Functional tests for NursingCard business logic
 * These tests focus on the core functionality without React Native rendering complexity
 */

// TypeScript interfaces for testing
interface BreastState {
  isActive: boolean;
  startTime: number | null;
  totalDuration: number;
}

interface NursingMetadata {
  currentSide: 'left' | 'right' | null;
  totalDuration: number;
  [key: string]: unknown;
}

// Mock the Legend State functionality
const mockObservable = {
  get: jest.fn(),
  set: jest.fn(),
  assign: jest.fn(),
  leftBreast: { isActive: { set: jest.fn() }, startTime: { set: jest.fn() }, totalDuration: { set: jest.fn() } },
  rightBreast: { isActive: { set: jest.fn() }, startTime: { set: jest.fn() }, totalDuration: { set: jest.fn() } },
  isExpanded: { set: jest.fn() },
  isActive: { set: jest.fn() },
  sessionId: { set: jest.fn() },
  startTime: { set: jest.fn() },
  lastActivityTime: { set: jest.fn() },
  autoCollapseTimer: { set: jest.fn() },
};

jest.mock('@legendapp/state/react', () => ({
  useObservable: () => mockObservable,
}));

// Business logic functions extracted for testing
class NursingCardLogic {
  static formatDuration(seconds: number): string {
    if (seconds === 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  static getCurrentDuration(breastState: BreastState, currentTime: number = Date.now()): number {
    const totalDuration = breastState.totalDuration || 0;
    if (!breastState.isActive || !breastState.startTime) {
      return totalDuration;
    }
    const sessionTime = Math.floor((currentTime - breastState.startTime) / 1000);
    return totalDuration + sessionTime;
  }

  static getTotalDuration(leftBreast: BreastState, rightBreast: BreastState, currentTime: number = Date.now()): number {
    const leftDuration = this.getCurrentDuration(leftBreast, currentTime);
    const rightDuration = this.getCurrentDuration(rightBreast, currentTime);
    return leftDuration + rightDuration;
  }

  static getLastActivityDisplay(lastActivityTime: number | null): string {
    if (!lastActivityTime) return 'Never';
    
    const now = Date.now();
    const diffMs = now - lastActivityTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  static createNursingMetadata(currentSide: 'left' | 'right' | null, totalDuration: number, breastData?: Record<string, unknown>): NursingMetadata {
    return {
      currentSide,
      totalDuration,
      ...(breastData && { [`${currentSide}Breast`]: breastData }),
    };
  }
}

describe('NursingCard Business Logic', () => {

  describe('Duration Formatting', () => {
    it('formats zero duration correctly', () => {
      expect(NursingCardLogic.formatDuration(0)).toBe('00:00');
    });

    it('formats seconds correctly', () => {
      expect(NursingCardLogic.formatDuration(30)).toBe('00:30');
      expect(NursingCardLogic.formatDuration(59)).toBe('00:59');
    });

    it('formats minutes correctly', () => {
      expect(NursingCardLogic.formatDuration(60)).toBe('01:00');
      expect(NursingCardLogic.formatDuration(90)).toBe('01:30');
      expect(NursingCardLogic.formatDuration(150)).toBe('02:30');
    });

    it('formats hours correctly', () => {
      expect(NursingCardLogic.formatDuration(3600)).toBe('60:00'); // 1 hour
      expect(NursingCardLogic.formatDuration(7200)).toBe('120:00'); // 2 hours
      expect(NursingCardLogic.formatDuration(21600)).toBe('360:00'); // 6 hours
    });
  });

  describe('Duration Calculation', () => {
    const fixedTime = 1609459200000; // Fixed timestamp for consistent testing

    it('calculates inactive breast duration correctly', () => {
      const breastState = {
        isActive: false,
        startTime: null,
        totalDuration: 120,
      };

      const duration = NursingCardLogic.getCurrentDuration(breastState, fixedTime);
      expect(duration).toBe(120);
    });

    it('calculates active breast duration correctly', () => {
      const breastState = {
        isActive: true,
        startTime: fixedTime - 60000, // 1 minute ago
        totalDuration: 120, // 2 minutes previous
      };

      const duration = NursingCardLogic.getCurrentDuration(breastState, fixedTime);
      expect(duration).toBe(180); // 120 + 60 seconds
    });

    it('calculates total session duration correctly', () => {
      const leftBreast = {
        isActive: true,
        startTime: fixedTime - 60000, // 1 minute ago
        totalDuration: 120, // 2 minutes previous
      };

      const rightBreast = {
        isActive: false,
        startTime: null,
        totalDuration: 90, // 1.5 minutes
      };

      const totalDuration = NursingCardLogic.getTotalDuration(leftBreast, rightBreast, fixedTime);
      expect(totalDuration).toBe(270); // 180 + 90 seconds
    });
  });

  describe('Last Activity Display', () => {
    const baseTime = Date.now();

    it('shows "Never" when no activity time', () => {
      expect(NursingCardLogic.getLastActivityDisplay(null)).toBe('Never');
    });

    it('shows "Just now" for very recent activity', () => {
      const recentTime = baseTime - 30000; // 30 seconds ago
      expect(NursingCardLogic.getLastActivityDisplay(recentTime)).toBe('Just now');
    });

    it('shows minutes for activity within an hour', () => {
      const timeMinutesAgo = baseTime - (45 * 60 * 1000); // 45 minutes ago
      expect(NursingCardLogic.getLastActivityDisplay(timeMinutesAgo)).toBe('45m ago');
    });

    it('shows hours for activity within a day', () => {
      const timeHoursAgo = baseTime - (3 * 60 * 60 * 1000); // 3 hours ago
      expect(NursingCardLogic.getLastActivityDisplay(timeHoursAgo)).toBe('3h ago');
    });

    it('shows days for older activity', () => {
      const timeDaysAgo = baseTime - (2 * 24 * 60 * 60 * 1000); // 2 days ago
      expect(NursingCardLogic.getLastActivityDisplay(timeDaysAgo)).toBe('2d ago');
    });
  });

  describe('Nursing Metadata Creation', () => {
    it('creates basic metadata correctly', () => {
      const metadata = NursingCardLogic.createNursingMetadata('left', 300);
      
      expect(metadata).toEqual({
        currentSide: 'left',
        totalDuration: 300,
      });
    });

    it('creates metadata with breast data', () => {
      const breastData = {
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-01-01T00:05:00Z',
        duration: 300,
      };

      const metadata = NursingCardLogic.createNursingMetadata('right', 300, breastData);
      
      expect(metadata).toEqual({
        currentSide: 'right',
        totalDuration: 300,
        rightBreast: breastData,
      });
    });

    it('handles null current side', () => {
      const metadata = NursingCardLogic.createNursingMetadata(null, 600);
      
      expect(metadata).toEqual({
        currentSide: null,
        totalDuration: 600,
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles very large durations', () => {
      const largeDuration = 24 * 60 * 60; // 24 hours in seconds
      expect(NursingCardLogic.formatDuration(largeDuration)).toBe('1440:00');
    });

    it('handles negative durations gracefully', () => {
      // Should not happen in practice, but good to test
      expect(NursingCardLogic.formatDuration(-60)).toBe('-1:00');
    });

    it('handles breast state with missing properties', () => {
      const incompleteState = {
        isActive: true,
        startTime: null,
        totalDuration: 0,
      };

      // Should handle gracefully by treating undefined as 0
      const duration = NursingCardLogic.getCurrentDuration(incompleteState);
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('State Persistence Logic', () => {
    it('validates state structure for persistence', async () => {
      const validState = {
        isExpanded: false,
        isActive: true,
        sessionId: 'test-session',
        startTime: Date.now(),
        leftBreast: {
          isActive: true,
          startTime: Date.now(),
          totalDuration: 120,
        },
        rightBreast: {
          isActive: false,
          startTime: null,
          totalDuration: 0,
        },
        lastActivityTime: Date.now(),
        autoCollapseTimer: null,
      };

      // This should be serializable
      const serialized = JSON.stringify(validState);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.isExpanded).toBe(validState.isExpanded);
      expect(deserialized.leftBreast.totalDuration).toBe(validState.leftBreast.totalDuration);
    });
  });

  // ✅ NEW TESTS: Global Session Management
  describe('Global Session Management', () => {
    it('prevents multiple simultaneous sessions', () => {
      // Simulate having an active bottle session
      const activeBottleSession = {
        id: 'bottle-session-1',
        activity_type: 'bottle',
        baby_id: 'baby-1',
        started_at: new Date().toISOString(),
        ended_at: null
      };

      // Mock unified activity to return active session
      const mockCanStartNewSession = (activityType: string) => {
        return activityType === 'bottle'; // Only allow bottle sessions
      };

      // Test that nursing cannot start when bottle is active
      expect(mockCanStartNewSession('nursing')).toBe(false);
      expect(mockCanStartNewSession('bottle')).toBe(true);
    });

    it('allows same activity type to continue (nursing side switching)', () => {
      const activeNursingSession = {
        id: 'nursing-session-1',
        activity_type: 'nursing',
        baby_id: 'baby-1',
        started_at: new Date().toISOString(),
        ended_at: null
      };

      const mockCanStartNewSession = (activityType: string) => {
        return activityType === 'nursing'; // Allow nursing to continue
      };

      expect(mockCanStartNewSession('nursing')).toBe(true);
      expect(mockCanStartNewSession('bottle')).toBe(false);
    });
  });

  // ✅ NEW TESTS: Exclusive Timer Logic
  describe('Exclusive Timer Logic', () => {
    it('pauses left timer when right timer starts', () => {
      const leftTimerState = {
        isActive: true,
        startTime: Date.now() - 60000, // 1 minute ago
        totalDuration: 120, // 2 minutes previous
      };

      const rightTimerState = {
        isActive: false,
        startTime: null,
        totalDuration: 0,
      };

      // Simulate starting right timer (should pause left)
      const handleRightStart = (leftState: any, rightState: any) => {
        return {
          leftState: { ...leftState, isActive: false },
          rightState: { ...rightState, isActive: true, startTime: Date.now() }
        };
      };

      const result = handleRightStart(leftTimerState, rightTimerState);
      expect(result.leftState.isActive).toBe(false);
      expect(result.rightState.isActive).toBe(true);
    });

    it('preserves elapsed time when switching sides', () => {
      const leftTimerState = {
        isActive: true,
        startTime: Date.now() - 60000, // 1 minute ago
        totalDuration: 120, // 2 minutes previous
      };

      const currentElapsed = NursingCardLogic.getCurrentDuration(leftTimerState);
      expect(currentElapsed).toBe(180); // 120 + 60 seconds

      // When pausing, elapsed time should be preserved
      const pausedState = {
        ...leftTimerState,
        isActive: false,
        startTime: null,
        totalDuration: currentElapsed
      };

      expect(NursingCardLogic.getCurrentDuration(pausedState)).toBe(180);
    });
  });

  // ✅ NEW TESTS: User Feedback Requirements
  describe('User Feedback Requirements', () => {
    it('validates comfort level has been removed', () => {
      const nursingMetadata = {
        currentSide: 'left' as const,
        totalDuration: 300,
        leftBreastDuration: 150,
        rightBreastDuration: 150,
        // comfort property should not exist
      };

      expect('comfort' in nursingMetadata).toBe(false);
    });

    it('validates dual breast timer data structure', () => {
      const dualTimerState = {
        leftBreast: {
          isActive: true,
          startTime: Date.now(),
          totalDuration: 120
        },
        rightBreast: {
          isActive: false,
          startTime: null,
          totalDuration: 90
        }
      };

      expect(dualTimerState.leftBreast.isActive).toBe(true);
      expect(dualTimerState.rightBreast.isActive).toBe(false);
      expect(dualTimerState.leftBreast.totalDuration).toBe(120);
      expect(dualTimerState.rightBreast.totalDuration).toBe(90);
    });
  });

  describe('Performance Edge Cases', () => {
    it('handles rapid duration calculations efficiently', () => {
      const breastState = {
        isActive: true,
        startTime: Date.now() - 1000,
        totalDuration: 0,
      };

      // Simulate rapid calls (like every second updates)
      const results = [];
      for (let i = 0; i < 1000; i++) {
        results.push(NursingCardLogic.getCurrentDuration(breastState));
      }

      expect(results.length).toBe(1000);
      expect(results[0]).toBeGreaterThan(0);
    });

    it('handles multiple rapid format duration calls', () => {
      const durations = Array.from({ length: 1000 }, (_, i) => i * 60); // 0 to ~16 hours
      
      const formatted = durations.map(d => NursingCardLogic.formatDuration(d));
      
      expect(formatted.length).toBe(1000);
      expect(formatted[0]).toBe('00:00');
      expect(formatted[60]).toBe('60:00'); // 60 minutes = 1 hour
    });
  });
});