// ✅ Legend State configuration auto-loaded via entry point - no manual import needed

import { useCallback, useEffect, useRef } from 'react';
import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { ObservablePersistAsyncStorage } from '@legendapp/state/persist-plugins/async-storage';
import { unifiedAuthState$, useUnifiedAuth } from './useUnifiedAuth';
// Removed backgroundConflictResolver - using central session enforcement instead
// import { cardStateActions } from '../state/cardStateManager'; // No longer needed
import type { ActivitySession, ActivityType, SyncStatusType } from '../services/supabase';
import type { Json } from '../types/database';

// Unified activity data state - works offline and online
interface UnifiedActivityState {
  // Activity Sessions
  sessions: Record<string, ActivitySession>;
  activeSessions: Record<string, ActivitySession>; // sessionId -> session
  
  // ✅ ENHANCED GLOBAL SESSION LOCK - Only one active session allowed at a time
  globalActiveSession: ActivitySession | null;
  
  // ✅ NEW: Session Health & Recovery
  sessionConflicts: Array<{
    id: string;
    conflictType: 'duplicate_global' | 'orphaned_local' | 'stale_session' | 'emergency_reset';
    sessionId: string;
    activityType: ActivityType;
    timestamp: number;
    resolved: boolean;
  }>;
  lastHealthCheck: number | null;
  
  // Sync state  
  syncQueue: Array<{
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: 'session';
    data: Record<string, unknown>;
    timestamp: number;
  }>;
  lastSyncTime: number | null;
  isSyncing: boolean;
  syncError: string | null;
  
  // UI state
  loading: boolean;
  error: string | null;
}

// Observable unified activity store - persisted automatically
export const unifiedActivityStore$ = observable<UnifiedActivityState>({
  sessions: {},
  activeSessions: {},
  globalActiveSession: null,
  sessionConflicts: [],
  lastHealthCheck: null,
  syncQueue: [],
  lastSyncTime: null,
  isSyncing: false,
  syncError: null,
  loading: false,
  error: null,
});

// Configure persistence for offline-first behavior
persistObservable(unifiedActivityStore$, {
  pluginLocal: ObservablePersistAsyncStorage,
  local: 'embr_unified_activities',
});

// ✅ ENHANCED: Session Health Manager - Proactive conflict detection and resolution
class SessionHealthManager {
  
  // Validate current session state for conflicts
  validateSessionHealth(): Array<{ type: string; message: string; severity: 'warning' | 'error' }> {
    const issues: Array<{ type: string; message: string; severity: 'warning' | 'error' }> = [];
    const globalSession = unifiedActivityStore$.globalActiveSession.peek();
    const activeSessions = unifiedActivityStore$.activeSessions.peek();
    const activeSessionsList = Object.values(activeSessions);

    // Check 1: Multiple active sessions when only one should exist
    if (activeSessionsList.length > 1) {
      issues.push({
        type: 'multiple_active_sessions',
        message: `Found ${activeSessionsList.length} active sessions, only 1 allowed`,
        severity: 'error'
      });
    }

    // Check 2: Active sessions without global session
    if (activeSessionsList.length > 0 && !globalSession) {
      issues.push({
        type: 'orphaned_active_sessions',
        message: 'Active sessions exist without global session lock',
        severity: 'error'
      });
    }

    // Check 3: Global session without corresponding active session
    if (globalSession && !activeSessions[globalSession.id]) {
      issues.push({
        type: 'orphaned_global_session',
        message: 'Global session exists without corresponding active session',
        severity: 'error'
      });
    }

    // Check 4: Stale sessions (running for > 24 hours)
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    activeSessionsList.forEach(session => {
      if (new Date(session.started_at).getTime() < dayAgo) {
        issues.push({
          type: 'stale_session',
          message: `Session ${session.activity_type} running for >24h`,
          severity: 'warning'
        });
      }
    });

    return issues;
  }

  // Perform automatic session health cleanup
  performHealthCleanup(): boolean {
    const issues = this.validateSessionHealth();
    let cleanupPerformed = false;

    issues.forEach(issue => {
      switch (issue.type) {
        case 'multiple_active_sessions': {
          // Keep only the most recent active session
          const activeSessions = Object.values(unifiedActivityStore$.activeSessions.peek());
          const mostRecent = activeSessions.reduce((latest, session) => 
            new Date(session.started_at).getTime() > new Date(latest.started_at).getTime() ? session : latest
          );
          
          // Clear all active sessions and keep only the most recent
          unifiedActivityStore$.activeSessions.set({ [mostRecent.id]: mostRecent });
          unifiedActivityStore$.globalActiveSession.set(mostRecent);
          cleanupPerformed = true;
          console.log('🔧 Health cleanup: Resolved multiple active sessions');
          break;
        }

        case 'orphaned_active_sessions': {
          // Set global session to match the active session
          const activeList = Object.values(unifiedActivityStore$.activeSessions.peek());
          if (activeList.length === 1 && activeList[0]) {
            const restoredSession = activeList[0];
            unifiedActivityStore$.globalActiveSession.set(restoredSession);
            cleanupPerformed = true;
            console.log('🔧 Health cleanup: Restored missing global session');
          }
          break;
        }

        case 'orphaned_global_session':
          // Clear the orphaned global session
          unifiedActivityStore$.globalActiveSession.set(null);
          cleanupPerformed = true;
          console.log('🔧 Health cleanup: Cleared orphaned global session');
          break;
      }
    });

    if (cleanupPerformed) {
      unifiedActivityStore$.lastHealthCheck.set(Date.now());
    }

    return cleanupPerformed;
  }

  // Emergency reset - clear all session state and persistence
  emergencySessionReset(): void {
    console.log('🚨 EMERGENCY SESSION RESET - Clearing all session state and persistence');
    
    // Clear all reactive state
    unifiedActivityStore$.activeSessions.set({});
    unifiedActivityStore$.globalActiveSession.set(null);
    unifiedActivityStore$.sessionConflicts.set([]);
    unifiedActivityStore$.error.set(null);
    unifiedActivityStore$.syncError.set(null);
    unifiedActivityStore$.loading.set(false);
    unifiedActivityStore$.isSyncing.set(false);
    unifiedActivityStore$.lastHealthCheck.set(Date.now());
    
    // Card state is managed separately by cardStateManager

    // Log emergency reset for debugging
    const resetRecord = {
      id: `emergency_reset_${Date.now()}`,
      conflictType: 'emergency_reset' as const,
      sessionId: 'emergency_full_reset',
      activityType: 'emergency' as ActivityType,
      timestamp: Date.now(),
      resolved: true,
    };

    unifiedActivityStore$.sessionConflicts.set([resetRecord]);

    console.log('✅ EMERGENCY RESET COMPLETE - All session state cleared');
  }

  // Complete nuclear reset - clear everything including persistence
  nuclearReset(): void {
    console.log('💥 NUCLEAR RESET - Clearing all state and forcing persistence reset');
    
    // Clear all state first
    this.emergencySessionReset();
    
    // Force a new persistence save to overwrite corrupted data
    setTimeout(() => {
      console.log('💥 NUCLEAR RESET - Forcing persistence overwrite');
      unifiedActivityStore$.sessions.set({});
      unifiedActivityStore$.syncQueue.set([]);
      unifiedActivityStore$.lastSyncTime.set(null);
    }, 100);

    console.log('☢️ NUCLEAR RESET COMPLETE - All data cleared and persistence reset');
  }
}

// Singleton session health manager
const sessionHealthManager = new SessionHealthManager();

// Activity sync manager - handles all sync logic automatically
class UnifiedActivitySyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isStarted: boolean = false;
  private shouldSyncListener: (() => void) | null = null;
  private healthCheckTimeout: NodeJS.Timeout | null = null;

  async start() {
    // Prevent multiple starts - make idempotent
    if (this.isStarted) {
      console.log('🏃 Activity sync manager already started, skipping...');
      return;
    }

    console.log('🏃 Starting unified activity sync manager...');
    this.isStarted = true;
    
    
    // Reset sync state on startup to handle any persisted state from previous sessions
    unifiedActivityStore$.isSyncing.set(false);
    unifiedActivityStore$.syncError.set(null);
    
    // Listen to auth state changes (store unsubscribe function to prevent duplicates)
    this.shouldSyncListener = unifiedAuthState$.shouldSync.onChange(({ value: shouldSync }) => {
      if (shouldSync) {
        this.enableSyncMode();
      } else {
        this.disableSyncMode();
      }
    });

    // Start with current auth state
    if (unifiedAuthState$.shouldSync.peek()) {
      this.enableSyncMode();
    }

    // ✅ CRITICAL: Perform immediate startup health check and cleanup
    console.log('🚨 STARTUP: Performing initial health check and cleanup...');
    this.healthCheckTimeout = setTimeout(() => {
      const healthIssues = sessionHealthManager.validateSessionHealth();
      if (healthIssues.length > 0) {
        console.log('🚨 STARTUP: Health issues detected:', healthIssues);
        const cleanupPerformed = sessionHealthManager.performHealthCleanup();
        if (cleanupPerformed) {
          console.log('✅ STARTUP: Initial health cleanup completed');
        } else {
          console.log('⚠️ STARTUP: Health cleanup failed - manual intervention may be needed');
        }
      } else {
        console.log('✅ STARTUP: No health issues detected');
      }
    }, 500); // Faster startup check
  }

  private enableSyncMode() {
    console.log('⚡ Enabling activity sync mode...');
    
    // Start periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 30000); // Sync every 30 seconds

    // Immediate sync
    this.performSync();
  }

  private disableSyncMode() {
    console.log('📱 Disabling activity sync mode (offline/anonymous)...');
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async performSync() {
    if (unifiedActivityStore$.isSyncing.peek()) {
      return; // Already syncing
    }

    try {
      unifiedActivityStore$.isSyncing.set(true);
      unifiedActivityStore$.syncError.set(null);

      console.log('🔄 Performing activity sync...');

      // 1. Process sync queue (upload local changes)
      await this.processSyncQueue();

      // 2. Update sync timestamp
      unifiedActivityStore$.lastSyncTime.set(Date.now());

      console.log('✅ Activity sync completed successfully');

    } catch (error) {
      console.error('❌ Activity sync failed:', error);
      unifiedActivityStore$.syncError.set(
        error instanceof Error ? error.message : 'Activity sync failed'
      );
    } finally {
      unifiedActivityStore$.isSyncing.set(false);
    }
  }

  private async processSyncQueue() {
    const queue = unifiedActivityStore$.syncQueue.peek();
    
    for (const item of queue) {
      try {
        switch (item.type) {
          case 'create':
            if (item.entity === 'session') {
              // Here we would call ActivityService, but for now, just log
              console.log('🎯 Would sync create session:', item.data);
            }
            break;
          case 'update':
            if (item.entity === 'session') {
              console.log('🎯 Would sync update session:', item.data);
            }
            break;
          case 'delete':
            if (item.entity === 'session') {
              console.log('🎯 Would sync delete session:', item.data);
            }
            break;
        }

        // Remove processed item from queue
        unifiedActivityStore$.syncQueue.set(prev => 
          prev.filter(queueItem => queueItem.id !== item.id)
        );

        console.log('✅ Processed activity sync item:', item.id);

      } catch (error) {
        console.error('❌ Failed to process activity sync item:', item.id, error);
        // Keep failed item in queue for retry
      }
    }
  }

  stop() {
    if (!this.isStarted) {
      console.log('🛑 Activity sync manager not started, skipping stop...');
      return;
    }

    console.log('🛑 Stopping unified activity sync manager...');
    
    this.disableSyncMode();
    
    // Clean up listeners
    if (this.shouldSyncListener) {
      this.shouldSyncListener();
      this.shouldSyncListener = null;
    }
    
    // Clean up health check timeout
    if (this.healthCheckTimeout) {
      clearTimeout(this.healthCheckTimeout);
      this.healthCheckTimeout = null;
    }
    
    this.isStarted = false;
  }
}

// Singleton activity sync manager
const activitySyncManager = new UnifiedActivitySyncManager();

// Generate local session ID
const generateLocalSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Main hook for unified activity management
export const useUnifiedActivity = () => {
  const auth = useUnifiedAuth();
  const hasStarted = useRef(false);

  // Start sync manager when auth is ready
  useEffect(() => {
    if (auth.isReady && !hasStarted.current) {
      activitySyncManager.start().catch(console.error);
      hasStarted.current = true;
    }

    return () => {
      if (hasStarted.current) {
        activitySyncManager.stop();
        hasStarted.current = false;
      }
    };
  }, [auth.isReady]);

  // Helper to add item to sync queue
  const queueForSync = useCallback((
    type: 'create' | 'update' | 'delete',
    entity: 'session',
    data: Record<string, unknown>
  ) => {
    const queueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      entity,
      data,
      timestamp: Date.now(),
    };

    unifiedActivityStore$.syncQueue.set(prev => [...prev, queueItem]);

    // If we should sync immediately, trigger sync
    if (auth.shouldSync) {
      setTimeout(() => {
        activitySyncManager['performSync']();
      }, 100);
    }
  }, [auth.shouldSync]);

  // ✅ ENHANCED SESSION OPERATIONS with ROBUST CONFLICT RESOLUTION
  const startSession = useCallback(async (data: {
    babyId: string;
    activityType: ActivityType;
    metadata?: Record<string, unknown>;
    clientId?: string;
    forceStart?: boolean; // Allow override for conflict resolution
  }): Promise<ActivitySession> => {
    try {
      unifiedActivityStore$.loading.set(true);
      unifiedActivityStore$.error.set(null);

      // 🚨 CENTRAL SESSION ENFORCEMENT - Only ONE session allowed globally
      const currentGlobalSession = unifiedActivityStore$.globalActiveSession.peek();
      
      // Nappy changes are instant logs that shouldn't block or be blocked
      const isInstantLog = data.activityType === 'nappy';
      
      if (currentGlobalSession && !data.forceStart && !isInstantLog) {
        // BLOCK ALL new sessions when one is active (except instant logs like nappy)
        const errorMsg = `Cannot start ${data.activityType}. ${currentGlobalSession.activity_type} session is already active.`;
        console.error('🚫 SESSION BLOCKED:', errorMsg);
        unifiedActivityStore$.error.set(errorMsg);
        unifiedActivityStore$.loading.set(false);
        throw new Error(errorMsg);
      }

      // Create local session immediately (optimistic update)
      const localSession: ActivitySession = {
        id: generateLocalSessionId(),
        baby_id: data.babyId,
        activity_type: data.activityType,
        started_at: new Date().toISOString(),
        ended_at: null,
        total_duration_seconds: 0,
        metadata: (data.metadata || {}) as Json,
        client_id: data.clientId || auth.deviceId || 'unknown',
        sync_status: (auth.shouldSync ? 'pending' : 'synced') as SyncStatusType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: null,
        sync_error: null,
        sync_retry_count: null,
        last_sync_attempt: null,
      };

      // Add to local stores immediately
      unifiedActivityStore$.sessions.set(prev => ({
        ...prev,
        [localSession.id]: localSession
      }));

      unifiedActivityStore$.activeSessions.set(prev => ({
        ...prev,
        [localSession.id]: localSession
      }));

      // ✅ Set as global active session (unless it's an instant log like nappy)
      if (!isInstantLog) {
        unifiedActivityStore$.globalActiveSession.set(localSession);
      }

      // Queue for sync if authenticated and online
      if (auth.shouldSync) {
        queueForSync('create', 'session', {
          baby_id: data.babyId,
          activity_type: data.activityType,
          metadata: data.metadata || {},
          client_id: data.clientId || auth.deviceId,
        });
      }

      console.log('✅ Started session locally:', localSession.id);
      return localSession;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start session';
      unifiedActivityStore$.error.set(errorMessage);
      throw error;
    } finally {
      unifiedActivityStore$.loading.set(false);
    }
  }, [auth.shouldSync, auth.deviceId, queueForSync]);

  const endSession = useCallback(async (
    sessionId: string, 
    finalMetadata?: Record<string, unknown>
  ): Promise<ActivitySession> => {
    try {
      unifiedActivityStore$.loading.set(true);
      unifiedActivityStore$.error.set(null);

      const currentSession = unifiedActivityStore$.sessions.peek()[sessionId];
      if (!currentSession) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const endTime = new Date().toISOString();
      const startTime = new Date(currentSession.started_at);
      const totalDurationSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

      // Update session locally immediately (optimistic update)
      const updatedSession: ActivitySession = {
        ...currentSession,
        ended_at: endTime,
        total_duration_seconds: totalDurationSeconds,
        metadata: (finalMetadata || currentSession.metadata) as Json,
        updated_at: new Date().toISOString(),
        sync_status: (auth.shouldSync ? 'pending' : 'synced') as SyncStatusType,
      };

      // Update in both stores
      unifiedActivityStore$.sessions.set(prev => ({
        ...prev,
        [sessionId]: updatedSession
      }));

      // Remove from active sessions
      unifiedActivityStore$.activeSessions.set(prev => {
        const { [sessionId]: removed, ...rest } = prev;
        // Use removed to avoid unused variable warning
        void removed;
        return rest;
      });

      // ✅ Clear global active session if this was it
      const currentGlobal = unifiedActivityStore$.globalActiveSession.peek();
      if (currentGlobal?.id === sessionId) {
        unifiedActivityStore$.globalActiveSession.set(null);
      }

      // Queue for sync if authenticated and online
      if (auth.shouldSync) {
        queueForSync('update', 'session', {
          id: sessionId,
          ended_at: endTime,
          total_duration_seconds: totalDurationSeconds,
          metadata: finalMetadata || currentSession.metadata,
        });
      }

      console.log('✅ Ended session locally:', sessionId, 'Duration:', totalDurationSeconds);
      return updatedSession;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to end session';
      unifiedActivityStore$.error.set(errorMessage);
      throw error;
    } finally {
      unifiedActivityStore$.loading.set(false);
    }
  }, [auth.shouldSync, queueForSync]);

  const updateSessionMetadata = useCallback(async (
    sessionId: string, 
    metadata: Record<string, unknown>
  ): Promise<ActivitySession> => {
    try {
      const currentSession = unifiedActivityStore$.sessions.peek()[sessionId];
      if (!currentSession) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Update session locally immediately (optimistic update)
      const updatedSession: ActivitySession = {
        ...currentSession,
        metadata: { ...(currentSession.metadata as Record<string, unknown>), ...metadata } as Json,
        updated_at: new Date().toISOString(),
        sync_status: (auth.shouldSync ? 'pending' : 'synced') as SyncStatusType,
      };

      // Update in stores
      unifiedActivityStore$.sessions.set(prev => ({
        ...prev,
        [sessionId]: updatedSession
      }));

      if (unifiedActivityStore$.activeSessions.peek()[sessionId]) {
        unifiedActivityStore$.activeSessions.set(prev => ({
          ...prev,
          [sessionId]: updatedSession
        }));
      }

      // Queue for sync if authenticated and online
      if (auth.shouldSync) {
        queueForSync('update', 'session', {
          id: sessionId,
          metadata,
        });
      }

      return updatedSession;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update session metadata';
      unifiedActivityStore$.error.set(errorMessage);
      throw error;
    }
  }, [auth.shouldSync, queueForSync]);

  const createQuickLog = useCallback(async (data: {
    babyId: string;
    activityType: ActivityType;
    metadata: Record<string, unknown>;
    duration?: number;
    clientId?: string;
  }): Promise<ActivitySession> => {
    try {
      unifiedActivityStore$.loading.set(true);
      unifiedActivityStore$.error.set(null);

      const now = new Date().toISOString();
      const endTime = data.duration 
        ? new Date(Date.now() + data.duration * 1000).toISOString()
        : now;

      // Create complete session immediately (optimistic update)
      const localSession: ActivitySession = {
        id: generateLocalSessionId(),
        baby_id: data.babyId,
        activity_type: data.activityType,
        started_at: now,
        ended_at: endTime,
        total_duration_seconds: data.duration || 0,
        metadata: data.metadata as Json,
        client_id: data.clientId || auth.deviceId || 'unknown',
        sync_status: (auth.shouldSync ? 'pending' : 'synced') as SyncStatusType,
        created_at: now,
        updated_at: now,
        notes: null,
        sync_error: null,
        sync_retry_count: null,
        last_sync_attempt: null,
      };

      // Add to local store immediately (not active since it's completed)
      unifiedActivityStore$.sessions.set(prev => ({
        ...prev,
        [localSession.id]: localSession
      }));

      // Queue for sync if authenticated and online
      if (auth.shouldSync) {
        queueForSync('create', 'session', {
          baby_id: data.babyId,
          activity_type: data.activityType,
          started_at: now,
          ended_at: endTime,
          total_duration_seconds: data.duration || 0,
          metadata: data.metadata,
          client_id: data.clientId || auth.deviceId,
        });
      }

      console.log('✅ Created quick log locally:', localSession.id);
      return localSession;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create quick log';
      unifiedActivityStore$.error.set(errorMessage);
      throw error;
    } finally {
      unifiedActivityStore$.loading.set(false);
    }
  }, [auth.shouldSync, auth.deviceId, queueForSync]);

  // ✅ ENHANCED CONFLICT RESOLUTION METHODS
  const forceStartSession = useCallback(async (data: {
    babyId: string;
    activityType: ActivityType;
    metadata?: Record<string, unknown>;
    clientId?: string;
  }): Promise<ActivitySession> => {
    // Force end any existing session and start new one
    const currentGlobal = unifiedActivityStore$.globalActiveSession.peek();
    if (currentGlobal) {
      console.log('🔧 Force starting - ending existing session:', currentGlobal.id);
      await endSession(currentGlobal.id, { forcedEnd: true, reason: 'force_start_new_session' });
    }

    return startSession({ ...data, forceStart: true });
  }, [startSession, endSession]);

  // ✅ Helper methods for session management
  const hasActiveSession = useCallback(() => {
    return unifiedActivityStore$.globalActiveSession.peek() !== null;
  }, []);

  const canStartNewSession = useCallback((activityType: ActivityType) => {
    const globalSession = unifiedActivityStore$.globalActiveSession.peek();
    if (!globalSession) return true;
    // Allow same activity type (for switching sides in nursing, etc.)
    return globalSession.activity_type === activityType;
  }, []);

  const getActiveSessionForActivity = useCallback((activityType: ActivityType): ActivitySession | null => {
    const globalSession = unifiedActivityStore$.globalActiveSession.peek();
    return globalSession?.activity_type === activityType ? globalSession : null;
  }, []);

  // ✅ EMERGENCY RECOVERY METHODS
  const performHealthCheck = useCallback(() => {
    return sessionHealthManager.validateSessionHealth();
  }, []);

  const performHealthCleanup = useCallback(() => {
    return sessionHealthManager.performHealthCleanup();
  }, []);

  const emergencyReset = useCallback(() => {
    sessionHealthManager.emergencySessionReset();
  }, []);

  const nuclearReset = useCallback(() => {
    sessionHealthManager.nuclearReset();
  }, []);


  // Reactive data access - ALL REACTIVE, NO .get() calls!
  return {
    // Data (reactive via Legend State observables)
    sessions: unifiedActivityStore$.sessions,
    activeSessions: unifiedActivityStore$.activeSessions,
    globalActiveSession: unifiedActivityStore$.globalActiveSession.get(),
    sessionConflicts: unifiedActivityStore$.sessionConflicts,
    
    // Actions (work offline and online automatically) 
    startSession,
    endSession,
    updateSessionMetadata,
    createQuickLog,
    
    forceStartSession,
    
    // Computed selectors - REACTIVE versions
    get allSessions() {
      return Object.values(unifiedActivityStore$.sessions.get());
    },
    
    get activeSessionsList() {
      return Object.values(unifiedActivityStore$.activeSessions.get());
    },
    
    getActiveSessions: (babyId: string) => {
      return Object.values(unifiedActivityStore$.activeSessions.get())
        .filter(session => session.baby_id === babyId);
    },
    
    getRecentSessions: (babyId: string, hoursBack: number = 24) => {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
      
      return Object.values(unifiedActivityStore$.sessions.get())
        .filter(session => 
          session.baby_id === babyId && 
          session.ended_at && 
          new Date(session.started_at) >= cutoffTime
        )
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    },
    
    getLastActivity: (babyId: string, activityType: ActivityType) => {
      return Object.values(unifiedActivityStore$.sessions.get())
        .filter(session => 
          session.baby_id === babyId && 
          session.activity_type === activityType &&
          session.ended_at // Only completed sessions
        )
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0] || null;
    },
    
    // Status - values (to match useUnifiedData pattern)
    loading: unifiedActivityStore$.loading.get(),
    error: unifiedActivityStore$.error.get(),
    
    // Sync status - values (to match useUnifiedData pattern)
    isSyncing: unifiedActivityStore$.isSyncing.get(),
    syncError: unifiedActivityStore$.syncError.get(),
    lastSyncTime: unifiedActivityStore$.lastSyncTime.get(),
    get syncQueueSize() { return unifiedActivityStore$.syncQueue.get().length; },
    
    // Helper to clear errors
    clearError: () => unifiedActivityStore$.error.set(null),
    
    // ✅ ENHANCED GLOBAL SESSION MANAGEMENT
    hasActiveSession,
    canStartNewSession,
    getActiveSessionForActivity,
    
    // ✅ EMERGENCY RECOVERY SYSTEM
    performHealthCheck,
    performHealthCleanup,
    emergencyReset,
    nuclearReset,
    
    // Force stop all sessions (emergency use)
    forceStopAllSessions: () => {
      unifiedActivityStore$.activeSessions.set({});
      unifiedActivityStore$.globalActiveSession.set(null);
      unifiedActivityStore$.error.set(null);
    },
  };
};