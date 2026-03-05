/**
 * SIMPLIFIED ACTIVITY CARD HOOK
 * 
 * This hook provides a clean, simple interface for activity cards.
 * It removes all the complexity from individual cards and centralizes
 * session management and card state logic.
 * 
 * USAGE IN ACTIVITY CARDS:
 * ```
 * const card = useActivityCard('nursing');
 * 
 * // Simple boolean flags - no complex logic needed
 * if (card.isExpanded) { show expanded UI }
 * if (card.isDisabled) { show disabled state }
 * if (card.hasActiveSession) { show timer }
 * 
 * // Simple actions - all complexity handled internally
 * card.toggle() - expand/collapse
 * card.startSession() - start session
 * card.endSession() - end session
 * ```
 */

import { useCallback } from 'react';
import { useUnifiedActivity } from './useUnifiedActivity';
import { useUnifiedData } from './useUnifiedData';
import { cardStateActions } from '../state/cardStateManager';
import type { ActivityType } from '../services/supabase';

export interface ActivityCardState {
  // SIMPLE BOOLEAN FLAGS - No complex logic needed in components
  isExpanded: boolean;
  isDisabled: boolean; 
  hasActiveSession: boolean;
  canStartSession: boolean;
  isAnimating: boolean;
  
  // SESSION DATA - Reactive, always up-to-date
  activeSession: Record<string, unknown> | null; // The current session for this activity
  elapsedSeconds: number; // Real-time elapsed seconds
  lastSession: Record<string, unknown> | null; // Most recent completed session
  
  // SIMPLE ACTIONS - All complexity handled internally
  toggle: () => void; // Expand/collapse (respects session state)
  startSession: (metadata?: Record<string, unknown>) => Promise<Record<string, unknown> | null>; // Start new session, returns session
  endSession: (metadata?: Record<string, unknown>, sessionId?: string) => Promise<void>; // End session
  
  // UI HELPERS
  activityColor: string; // Color for this activity type
  activityLabel: string; // Human-readable label
}

/**
 * SIMPLE ACTIVITY CARD HOOK
 * 
 * Provides everything an activity card needs in a simple, clean interface.
 * Removes all session management complexity from individual cards.
 * 
 * @param activityType - The type of activity ('nursing', 'bottle', etc.)
 * @returns Clean interface with boolean flags and simple actions
 */
export const useActivityCard = (activityType: ActivityType): ActivityCardState => {
  const activity = useUnifiedActivity();
  const data = useUnifiedData();

  // SIMPLE COMPUTED FLAGS - Access reactive state properly
  const isExpanded = cardStateActions.isCardExpanded(activityType);
  
  // Get current global session reactively - now properly reactive!
  const globalSession = activity.globalActiveSession;
  
  // Card is disabled if there's ANY active session that's not this activity type
  const isDisabled = globalSession ? globalSession.activity_type !== activityType : false;
  const hasActiveSession = globalSession?.activity_type === activityType;
  const canStartSession = !isDisabled;
  
  
  const isAnimating = false; // Could get from card state if needed
  
  // SESSION DATA
  const activeSession = hasActiveSession ? globalSession : null;
  const elapsedSeconds = activeSession 
    ? Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 1000)
    : 0;
  
  // Get last session for this activity type
  const activeBaby = data.activeBaby;
  const lastSession = activeBaby 
    ? activity.getLastActivity(activeBaby.id, activityType)
    : null;
  
  // SIMPLE ACTIONS
  const toggle = useCallback(() => {
    cardStateActions.toggleCard(activityType);
  }, [activityType]);
  
  const startSession = useCallback(async (metadata?: Record<string, unknown>) => {
    if (!activeBaby) {
      console.warn('No active baby - cannot start session');
      return null;
    }
    
    // For nappy (instant log), don't check canStartSession
    const isInstantLog = activityType === 'nappy';
    if (!isInstantLog && !canStartSession) {
      const message = 'Cannot start ' + activityType + ' session - another activity is active';
      console.warn(message);
      return null;
    }
    
    try {
      const session = await activity.startSession({
        babyId: activeBaby.id,
        activityType,
        metadata: metadata || {},
      });
      const successMessage = 'Started ' + activityType + ' session successfully';
      console.log(successMessage);
      return session;
    } catch (error) {
      const errorMessage = 'Failed to start ' + activityType + ' session:';
      console.error(errorMessage, error);
      return null;
    }
  }, [activity, activityType, activeBaby, canStartSession]);
  
  const endSession = useCallback(async (metadata?: Record<string, unknown>, sessionId?: string) => {
    // For instant logs like nappy, use provided sessionId
    const targetSessionId = sessionId || activeSession?.id;
    
    if (!targetSessionId) {
      const message = 'No ' + activityType + ' session to end';
      console.warn(message);
      return;
    }
    
    try {
      await activity.endSession(targetSessionId, metadata);
      const successMessage = 'Ended ' + activityType + ' session successfully';
      console.log(successMessage);
    } catch (error) {
      const errorMessage = 'Failed to end ' + activityType + ' session:';
      console.error(errorMessage, error);
    }
  }, [activity, activityType, activeSession]);
  
  // UI HELPERS
  const activityColors: Record<ActivityType, string> = {
    nursing: '#FF6B6B', // Warm Red
    bottle: '#4ECDC4', // Teal
    pumping: '#95E77E', // Green
    sleep: '#6C5CE7', // Purple
    nappy: '#FDCB6E', // Yellow
    tummy_time: '#74B9FF', // Blue
    play: '#9B59B6', // Violet
    bath: '#2ECC71', // Emerald
    walk: '#F39C12', // Orange
    massage: '#E67E22', // Carrot
  };
  
  const activityLabels: Record<ActivityType, string> = {
    nursing: 'Nursing',
    bottle: 'Bottle',
    pumping: 'Pumping',
    sleep: 'Sleep',
    nappy: 'Nappy',
    tummy_time: 'Tummy Time',
    play: 'Play',
    bath: 'Bath',
    walk: 'Walk',
    massage: 'Massage',
  };
  
  return {
    // Simple flags
    isExpanded,
    isDisabled,
    hasActiveSession,
    canStartSession,
    isAnimating,
    
    // Data
    activeSession,
    elapsedSeconds,
    lastSession,
    
    // Actions
    toggle,
    startSession,
    endSession,
    
    // UI helpers
    activityColor: activityColors[activityType],
    activityLabel: activityLabels[activityType],
  };
};

/**
 * REACTIVE ACTIVITY CARD HOOK
 * 
 * For components that use this hook, wrap the component with observer() instead:
 * 
 * ```
 * export const MyCard = observer(() => {
 *   const card = useActivityCard('nursing');
 *   return <View>...</View>;
 * });
 * ```
 */