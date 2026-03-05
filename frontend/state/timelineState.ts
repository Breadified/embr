/**
 * Timeline State Store
 * 
 * Legend State observable store for real-time timeline tracking.
 * All timeline data and interactions are reactive and synced in real-time.
 */

import { observable, Observable } from '@legendapp/state';
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage';
import { persistObservable } from '@legendapp/state/persist';
import type { TimelineData } from '../modules/activities/timelineLogic';
import type { ActivitySession } from '../services/supabase';

interface TimelineSelection {
  sessionId: string;
  timestamp: number;
}

interface TimelineViewport {
  startDate: Date;
  endDate: Date;
  visibleDays: number;
  scrollPosition: number;
  zoomLevel: number;
}

interface TimelineFilters {
  activityTypes: string[];
  showOverlaps: boolean;
  showNotes: boolean;
  minDuration: number; // minutes
}

interface TimelineState {
  // Core data
  data: TimelineData | null;
  sessions: ActivitySession[];
  
  // View configuration
  viewport: TimelineViewport;
  filters: TimelineFilters;
  
  // Selection
  selectedSessions: TimelineSelection[];
  hoveredSessionId: string | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  lastRefresh: number;
  detailPanelOpen: boolean;
  currentDetailSession: string | null;
  
  // Performance metrics
  renderTime: number;
  dataUpdateTime: number;
  
  // Settings
  preferences: {
    showTimeLabels: boolean;
    use24HourFormat: boolean;
    highlightCurrentTime: boolean;
    animationsEnabled: boolean;
    hapticFeedback: boolean;
  };
}

// Create the observable store
export const timelineState$ = observable<TimelineState>({
  // Core data
  data: null,
  sessions: [],
  
  // View configuration
  viewport: {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    visibleDays: 7,
    scrollPosition: 0,
    zoomLevel: 1,
  },
  
  // Filters
  filters: {
    activityTypes: [],
    showOverlaps: true,
    showNotes: true,
    minDuration: 0,
  },
  
  // Selection
  selectedSessions: [],
  hoveredSessionId: null,
  
  // UI state
  isLoading: false,
  error: null,
  lastRefresh: Date.now(),
  detailPanelOpen: false,
  currentDetailSession: null,
  
  // Performance metrics
  renderTime: 0,
  dataUpdateTime: 0,
  
  // Settings
  preferences: {
    showTimeLabels: true,
    use24HourFormat: false,
    highlightCurrentTime: true,
    animationsEnabled: true,
    hapticFeedback: true,
  },
});

// Persist viewport and preferences
persistObservable(timelineState$.viewport, {
  local: 'timeline_viewport',
  pluginLocal: ObservablePersistLocalStorage,
});

persistObservable(timelineState$.preferences, {
  local: 'timeline_preferences',
  pluginLocal: ObservablePersistLocalStorage,
});

// Simple helper functions (not reactive computed) to avoid circular dependencies
export const timelineHelpers = {
  // Get filtered sessions based on current filters
  getFilteredSessions: (sessions: ActivitySession[], filters: TimelineFilters) => {
    if (!sessions || sessions.length === 0) return [];
    
    return sessions.filter(session => {
      // Filter by activity type
      if (filters.activityTypes.length > 0 && 
          !filters.activityTypes.includes(session.activity_type)) {
        return false;
      }
      
      // Filter by minimum duration
      if (session.total_duration_seconds && session.total_duration_seconds < filters.minDuration * 60) {
        return false;
      }
      
      // Filter by notes
      if (!filters.showNotes && session.notes) {
        return false;
      }
      
      return true;
    });
  },
  
  // Get selected session details
  getSelectedSessionDetails: (selected: TimelineSelection[], sessions: ActivitySession[]) => {
    if (!selected.length || !sessions.length) return [];
    
    const selectedIds = new Set(selected.map(s => s.sessionId));
    return sessions.filter(s => s.id && selectedIds.has(s.id));
  },
  
  // Get visible date range
  getVisibleRange: (viewport: TimelineViewport) => {
    return {
      start: viewport.startDate,
      end: viewport.endDate,
      days: Math.ceil(
        (viewport.endDate.getTime() - viewport.startDate.getTime()) / 
        (24 * 60 * 60 * 1000)
      ),
    };
  },
};

// Actions for timeline manipulation
export const timelineActions = {
  // Update timeline data
  setTimelineData: (data: TimelineData | null) => {
    timelineState$.data.set(data);
    timelineState$.dataUpdateTime.set(Date.now());
  },
  
  // Update sessions
  setSessions: (sessions: ActivitySession[]) => {
    timelineState$.sessions.set(sessions);
  },
  
  // Selection management
  selectSession: (sessionId: string, multiSelect: boolean = false) => {
    const current = timelineState$.selectedSessions.get();
    
    if (multiSelect) {
      // Toggle selection in multi-select mode
      const exists = current.find(s => s.sessionId === sessionId);
      if (exists) {
        timelineState$.selectedSessions.set(
          current.filter(s => s.sessionId !== sessionId)
        );
      } else {
        timelineState$.selectedSessions.set([
          ...current,
          { sessionId, timestamp: Date.now() }
        ]);
      }
    } else {
      // Single selection mode
      timelineState$.selectedSessions.set([
        { sessionId, timestamp: Date.now() }
      ]);
    }
    
    // Haptic feedback if enabled
    if (timelineState$.preferences.hapticFeedback.get()) {
      // Trigger haptic feedback (platform specific)
    }
  },
  
  clearSelection: () => {
    timelineState$.selectedSessions.set([]);
    timelineState$.hoveredSessionId.set(null);
  },
  
  // Viewport management
  setViewport: (viewport: Partial<TimelineViewport>) => {
    timelineState$.viewport.set(current => ({
      ...current,
      ...viewport,
    }));
  },
  
  scrollToDate: (date: Date) => {
    const viewport = timelineState$.viewport.get();
    const dayWidth = 100; // pixels per day
    const targetPosition = Math.floor(
      (date.getTime() - viewport.startDate.getTime()) / 
      (24 * 60 * 60 * 1000) * dayWidth
    );
    
    timelineState$.viewport.scrollPosition.set(targetPosition);
  },
  
  zoom: (level: number) => {
    const clampedLevel = Math.max(0.5, Math.min(3, level));
    timelineState$.viewport.zoomLevel.set(clampedLevel);
  },
  
  // Filter management
  setFilters: (filters: Partial<TimelineFilters>) => {
    timelineState$.filters.set(current => ({
      ...current,
      ...filters,
    }));
  },
  
  toggleActivityType: (activityType: string) => {
    const current = timelineState$.filters.activityTypes.get();
    const index = current.indexOf(activityType);
    
    if (index >= 0) {
      timelineState$.filters.activityTypes.set(
        current.filter(t => t !== activityType)
      );
    } else {
      timelineState$.filters.activityTypes.set([...current, activityType]);
    }
  },
  
  // Detail panel
  openDetailPanel: (sessionId: string) => {
    timelineState$.currentDetailSession.set(sessionId);
    timelineState$.detailPanelOpen.set(true);
  },
  
  closeDetailPanel: () => {
    timelineState$.detailPanelOpen.set(false);
    // Keep session ID for animation
    setTimeout(() => {
      timelineState$.currentDetailSession.set(null);
    }, 300);
  },
  
  // Preferences
  updatePreferences: (prefs: Partial<{ showTimeLabels: boolean; use24HourFormat: boolean; highlightCurrentTime: boolean; animationsEnabled: boolean; hapticFeedback: boolean; }>) => {
    Object.entries(prefs).forEach(([key, value]) => {
      if (key in timelineState$.preferences && value !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (timelineState$.preferences as any)[key].set(value);
      }
    });
  },
  
  // Error handling
  setError: (error: string | null) => {
    timelineState$.error.set(error);
  },
  
  clearError: () => {
    timelineState$.error.set(null);
  },
  
  // Loading state
  setLoading: (loading: boolean) => {
    timelineState$.isLoading.set(loading);
  },
  
  // Refresh
  markRefresh: () => {
    timelineState$.lastRefresh.set(Date.now());
  },
  
  // Performance tracking (disabled to prevent render loops)
  recordRenderTime: () => {
    // Intentionally disabled to prevent setState during render cycles
  },
};

// Helper to check if a session is selected
export const isSessionSelected = (sessionId: string): boolean => {
  const selected = timelineState$.selectedSessions.get();
  return selected.some(s => s.sessionId === sessionId);
};

// Helper to get session by ID
export const getSessionById = (sessionId: string): ActivitySession | undefined => {
  const sessions = timelineState$.sessions.get();
  return sessions.find(s => s.id === sessionId);
};

// Export typed observable for use in components
export type TimelineState$ = Observable<TimelineState>;