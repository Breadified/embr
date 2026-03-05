/**
 * Timeline Data Hook
 * 
 * High-performance reactive hook using Legend State for real-time timeline tracking.
 * Optimized for offline-first with instant data access and minimal re-renders.
 */

import { useEffect, useCallback } from 'react';
import { useObservable, useSelector } from '@legendapp/state/react';
import { useUnifiedActivity } from './useUnifiedActivity';
import { useUnifiedData } from './useUnifiedData';
import { unifiedActivityStore$ } from './useUnifiedActivity';
import { 
  aggregateTimelineData, 
  type TimelineData 
} from '../modules/activities/timelineLogic';
import { 
  timelineState$, 
  timelineActions,
  isSessionSelected 
} from '../state/timelineState';

interface UseTimelineDataOptions {
  days?: number;
  refreshInterval?: number;
}

interface UseTimelineDataReturn {
  data: TimelineData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  selectedSessions: Array<{ sessionId: string; timestamp: number }>;
  selectSession: (sessionId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  isSessionSelected: (sessionId: string) => boolean;
  // Additional Legend State powered features
  viewport: typeof timelineState$.viewport;
  filters: typeof timelineState$.filters;
  preferences: typeof timelineState$.preferences;
  openDetailPanel: (sessionId: string) => void;
  closeDetailPanel: () => void;
  detailPanelOpen: boolean;
  currentDetailSession: string | null;
}

/**
 * Legend State powered timeline hook
 * Provides real-time reactive updates for all timeline data with optimal performance
 */
export const useTimelineData = (
  babyId: string | undefined,
  options: UseTimelineDataOptions = {}
): UseTimelineDataReturn => {
  const { days = 7 } = options;
  
  // 🚨 CRITICAL DEBUGGING: Add comprehensive logging
  console.log('🔍 useTimelineData called with:', {
    babyId,
    days,
    timestamp: new Date().toISOString()
  });
  
  // Get unified activity data
  const activity = useUnifiedActivity();
  const data = useUnifiedData();
  
  // Use Legend State selectors for reactive updates - optimal patterns
  const timelineData = useSelector(timelineState$.data);
  const selectedSessions = useSelector(timelineState$.selectedSessions);
  const isLoading = useSelector(timelineState$.isLoading);
  const error = useSelector(timelineState$.error);
  
  // 🚨 PERFORMANCE FIX: Use .get() to avoid infinite loops in useEffect
  // Watch activity sessions for real-time updates - proper Legend State usage
  const activitySessions = useSelector(unifiedActivityStore$.sessions);
  
  // 🔍 DEBUG: Log session data to understand state
  const sessionCount = Object.keys(activitySessions).length;
  console.log('🔍 Session data state:', {
    totalSessions: sessionCount,
    hasAnyData: sessionCount > 0,
    firstFewSessionIds: Object.keys(activitySessions).slice(0, 3),
    babyId
  });
  const viewport = useObservable(timelineState$.viewport);
  const filters = useObservable(timelineState$.filters);
  const preferences = useObservable(timelineState$.preferences);
  const detailPanelOpen = useSelector(timelineState$.detailPanelOpen);
  const currentDetailSession = useSelector(timelineState$.currentDetailSession);
  
  // Populate timeline data reactively when activity sessions change
  useEffect(() => {
    console.log('🔍 useTimelineData useEffect triggered with:', {
      babyId,
      days,
      sessionCount: Object.keys(activitySessions).length
    });
    
    if (!babyId) {
      console.log('⚠️ No babyId provided, clearing timeline data');
      timelineActions.setTimelineData(null);
      timelineActions.setSessions([]);
      return;
    }
    
    // Start loading
    console.log('⏳ Starting timeline data processing...');
    const startTime = performance.now();
    timelineActions.setLoading(true);
    
    try {
      // Get sessions from the reactive store
      const allSessions = Object.values(activitySessions);
      console.log('🔍 All sessions from store:', {
        totalCount: allSessions.length,
        sampleSession: allSessions[0] ? {
          id: allSessions[0].id,
          baby_id: allSessions[0].baby_id,
          activity_type: allSessions[0].activity_type,
          started_at: allSessions[0].started_at,
          ended_at: allSessions[0].ended_at
        } : null
      });
      
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      console.log('🔍 Time filter:', {
        cutoffTime: cutoffTime.toISOString(),
        daysBack: days
      });
      
      // 🚨 CRITICAL FIX: Include sessions WITHOUT ended_at (active sessions)
      // AND sessions that are completed within the time range
      const recentSessions = allSessions
        .filter(session => {
          const matchesBaby = session.baby_id === babyId;
          const sessionStart = new Date(session.started_at);
          const isInTimeRange = sessionStart >= cutoffTime;
          
          // Include both completed sessions AND active sessions
          const isRelevant = matchesBaby && isInTimeRange;
          
          return isRelevant;
        })
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      
      console.log('🔍 Filtered sessions:', {
        recentCount: recentSessions.length,
        completedCount: recentSessions.filter(s => s.ended_at).length,
        activeCount: recentSessions.filter(s => !s.ended_at).length,
        sampleFiltered: recentSessions.slice(0, 3).map(s => ({
          id: s.id,
          activity_type: s.activity_type,
          started_at: s.started_at,
          ended_at: s.ended_at,
          baby_id: s.baby_id
        }))
      });
      
      if (!recentSessions || recentSessions.length === 0) {
        console.log('📭 No recent sessions found, showing empty state');
        timelineActions.setTimelineData(null);
        timelineActions.setSessions([]);
      } else {
        // 🚨 PERFORMANCE OPTIMIZATION: Limit aggregation complexity
        console.log('⚡ Starting timeline aggregation...');
        const aggregationStart = performance.now();
        
        // Transform into timeline format
        const aggregated = aggregateTimelineData(recentSessions, days);
        
        const aggregationTime = performance.now() - aggregationStart;
        console.log('⚡ Timeline aggregation completed:', {
          processingTime: `${aggregationTime.toFixed(2)}ms`,
          totalSessions: aggregated.totalSessions,
          segmentCount: aggregated.segments.length,
          statsCount: aggregated.stats.length
        });
        
        // Update Legend State with computed data
        timelineActions.setTimelineData(aggregated);
        timelineActions.setSessions(recentSessions);
      }
      
      timelineActions.clearError();
    } catch (err) {
      console.error('❌ Timeline data processing failed:', err);
      timelineActions.setError(err instanceof Error ? err.message : 'Failed to load timeline data');
    } finally {
      const totalTime = performance.now() - startTime;
      console.log('✅ Timeline data processing finished:', {
        totalProcessingTime: `${totalTime.toFixed(2)}ms`,
        isAcceptablePerformance: totalTime < 200
      });
      timelineActions.setLoading(false);
    }
  }, [babyId, days, sessionCount]); // 🚨 CRITICAL FIX: Use sessionCount instead of activitySessions object
  
  // Update viewport when days change
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    timelineActions.setViewport({
      startDate,
      endDate,
      visibleDays: days,
    });
  }, [days]);
  
  // Refresh handler - optimized
  const refresh = useCallback(() => {
    // Trigger health check and cleanup if needed
    activity.performHealthCheck();
    
    // Clear any errors
    activity.clearError();
    data.clearError();
    timelineActions.clearError();
    
    // Update last refresh timestamp for UI
    timelineActions.markRefresh();
  }, [activity, data]);
  
  // Selection handlers using Legend State actions
  const selectSession = useCallback((sessionId: string, multiSelect = false) => {
    timelineActions.selectSession(sessionId, multiSelect);
  }, []);
  
  const clearSelection = useCallback(() => {
    timelineActions.clearSelection();
  }, []);
  
  const isSessionSelectedCallback = useCallback((sessionId: string) => {
    return isSessionSelected(sessionId);
  }, []);
  
  // Detail panel handlers
  const openDetailPanel = useCallback((sessionId: string) => {
    timelineActions.openDetailPanel(sessionId);
  }, []);
  
  const closeDetailPanel = useCallback(() => {
    timelineActions.closeDetailPanel();
  }, []);
  
  return {
    data: timelineData,
    loading: isLoading || activity.loading || data.loading,
    error: error || activity.error || data.error,
    refresh,
    selectedSessions: (selectedSessions || []).filter(Boolean) as Array<{ sessionId: string; timestamp: number }>,
    selectSession,
    clearSelection,
    isSessionSelected: isSessionSelectedCallback,
    // Legend State powered features
    viewport,
    filters,
    preferences,
    openDetailPanel,
    closeDetailPanel,
    detailPanelOpen,
    currentDetailSession,
  };
};