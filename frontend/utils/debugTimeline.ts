/**
 * Debug utilities for timeline development
 * Development-only debugging tools
 */

import { unifiedActivityStore$ } from '../hooks/useUnifiedActivity';
import { unifiedDataStore$ } from '../hooks/useUnifiedData';
import { timelineState$ } from '../state/timelineState';

if (!__DEV__) {
  throw new Error('❌ Debug utilities are only available in development mode!');
}

export const debugTimeline = {
  // Check activity sessions
  checkSessions: () => {
    const sessions = unifiedActivityStore$.sessions.peek();
    console.log('🔍 Activity Sessions Debug:', {
      totalSessions: Object.keys(sessions).length,
      sessionIds: Object.keys(sessions),
      firstSession: Object.values(sessions)[0],
    });
    return sessions;
  },

  // Check babies
  checkBabies: () => {
    const babies = unifiedDataStore$.babies.peek();
    const activeBabyId = unifiedDataStore$.activeBabyId.peek();
    console.log('🔍 Babies Debug:', {
      totalBabies: Object.keys(babies).length,
      activeBabyId,
      babyIds: Object.keys(babies),
    });
    return { babies, activeBabyId };
  },

  // Check timeline state
  checkTimelineState: () => {
    const timelineData = timelineState$.data.peek();
    const sessions = timelineState$.sessions.peek();
    const loading = timelineState$.isLoading.peek();
    const error = timelineState$.error.peek();
    
    console.log('🔍 Timeline State Debug:', {
      hasTimelineData: !!timelineData,
      totalSessions: timelineData?.totalSessions || 0,
      sessionsInState: sessions.length,
      loading,
      error,
      dailyStatsCount: timelineData?.dailyStats?.length || 0,
    });
    
    return { timelineData, sessions, loading, error };
  },

  // Full debugging report
  fullReport: () => {
    console.log('🔍 === FULL TIMELINE DEBUG REPORT ===');
    const sessions = debugTimeline.checkSessions();
    const { babies, activeBabyId } = debugTimeline.checkBabies();
    const timelineState = debugTimeline.checkTimelineState();
    
    // Check for data consistency
    const activeBaby = activeBabyId ? babies[activeBabyId] : null;
    const babySessions = activeBabyId 
      ? Object.values(sessions).filter(s => s.baby_id === activeBabyId)
      : [];
    
    console.log('🔍 Data Consistency Check:', {
      hasActiveBaby: !!activeBaby,
      babySessionsCount: babySessions.length,
      recentSessions: babySessions
        .filter(s => s.ended_at)
        .slice(0, 5)
        .map(s => ({
          id: s.id,
          type: s.activity_type,
          start: s.started_at,
          duration: s.total_duration_seconds,
        }))
    });
    
    console.log('🔍 === END DEBUG REPORT ===');
    
    return {
      sessions,
      babies,
      activeBabyId,
      activeBaby,
      babySessions,
      timelineState,
    };
  },
};

// Make available globally for debugging
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).debugTimeline = debugTimeline;
  console.log('💡 Timeline debugger available: debugTimeline.fullReport()');
}