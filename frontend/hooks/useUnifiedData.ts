// ✅ Legend State configuration auto-loaded via entry point - no manual import needed

import { useCallback, useEffect, useRef } from 'react';
import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { ObservablePersistAsyncStorage } from '@legendapp/state/persist-plugins/async-storage';
import { unifiedAuthState$, useUnifiedAuth } from './useUnifiedAuth';
import { BabyService } from '../services/babyService';
import type { Baby, BabyInsert, SyncStatusType } from '../services/supabase';

// Note: Legend State AsyncStorage configuration is handled globally in config/legendState.ts

// Unified data state - works both offline and online
interface UnifiedDataState {
  // Data
  babies: Record<string, Baby>;
  activeBabyId: string | null;
  
  // Sync state
  syncQueue: Array<{
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: 'baby';
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

// Observable unified data store - persisted automatically
export const unifiedDataStore$ = observable<UnifiedDataState>({
  babies: {},
  activeBabyId: null,
  syncQueue: [],
  lastSyncTime: null,
  isSyncing: false,
  syncError: null,
  loading: false,
  error: null,
});

// Configure persistence for offline-first behavior with AsyncStorage
persistObservable(unifiedDataStore$, {
  pluginLocal: ObservablePersistAsyncStorage,
  local: 'embr_unified_data',
});

// Background sync manager - handles all sync logic automatically
class UnifiedSyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private realtimeSubscription: { unsubscribe: () => void } | null = null;
  private isStarted: boolean = false;
  private shouldSyncListener: (() => void) | null = null;
  private shouldUseRealtimeListener: (() => void) | null = null;

  start() {
    // Prevent multiple starts - make idempotent
    if (this.isStarted) {
      console.log('🔄 Sync manager already started, skipping...');
      return;
    }

    console.log('🔄 Starting unified sync manager...');
    this.isStarted = true;
    
    // Reset sync state on startup to handle any persisted state from previous sessions
    unifiedDataStore$.isSyncing.set(false);
    unifiedDataStore$.syncError.set(null);
    
    // Listen to auth state changes (store unsubscribe functions to prevent duplicates)
    this.shouldSyncListener = unifiedAuthState$.shouldSync.onChange(({ value: shouldSync }) => {
      if (shouldSync) {
        this.enableSyncMode();
      } else {
        this.disableSyncMode();
      }
    });

    this.shouldUseRealtimeListener = unifiedAuthState$.shouldUseRealtime.onChange(({ value: shouldUseRealtime }) => {
      if (shouldUseRealtime) {
        this.enableRealtimeMode();
      } else {
        this.disableRealtimeMode();
      }
    });

    // Start with current auth state
    if (unifiedAuthState$.shouldSync.peek()) {
      this.enableSyncMode();
    }
    if (unifiedAuthState$.shouldUseRealtime.peek()) {
      this.enableRealtimeMode();
    }
  }

  private enableSyncMode() {
    console.log('✅ Enabling sync mode...');
    
    // Start periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 30000); // Sync every 30 seconds

    // Immediate sync
    this.performSync();
  }

  private disableSyncMode() {
    console.log('📱 Disabling sync mode (offline/anonymous)...');
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async enableRealtimeMode() {
    const user = unifiedAuthState$.user.peek();
    if (!user) return;

    console.log('⚡ Enabling realtime mode...');

    try {
      const channel = BabyService.subscribeToBabies(
        user.id,
        (payload) => {
          console.log('📡 Realtime update received:', payload);
          this.handleRealtimeUpdate(payload);
        }
      );
      this.realtimeSubscription = { unsubscribe: () => channel.unsubscribe() };
    } catch (error) {
      console.warn('⚠️ Failed to enable realtime:', error);
    }
  }

  private disableRealtimeMode() {
    console.log('📴 Disabling realtime mode...');
    
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
      this.realtimeSubscription = null;
    }
  }

  private async performSync() {
    if (unifiedDataStore$.isSyncing.peek()) {
      return; // Already syncing
    }

    try {
      unifiedDataStore$.isSyncing.set(true);
      unifiedDataStore$.syncError.set(null);

      console.log('🔄 Performing sync...');

      // 1. Process sync queue (upload local changes)
      await this.processSyncQueue();

      // 2. Fetch latest data from server
      await this.fetchLatestData();

      // 3. Update sync timestamp
      unifiedDataStore$.lastSyncTime.set(Date.now());

      console.log('✅ Sync completed successfully');

    } catch (error) {
      console.error('❌ Sync failed:', error);
      unifiedDataStore$.syncError.set(
        error instanceof Error ? error.message : 'Sync failed'
      );
    } finally {
      unifiedDataStore$.isSyncing.set(false);
    }
  }

  private async processSyncQueue() {
    const queue = unifiedDataStore$.syncQueue.peek();
    
    for (const item of queue) {
      try {
        switch (item.type) {
          case 'create':
            if (item.entity === 'baby') {
              await BabyService.createBaby(item.data as Omit<BabyInsert, 'id' | 'created_at' | 'updated_at' | 'client_id' | 'sync_status'>);
            }
            break;
          case 'update':
            if (item.entity === 'baby') {
              const updateData = item.data as { id: string };
              await BabyService.updateBaby(updateData.id, item.data as Partial<Baby>);
            }
            break;
          case 'delete':
            if (item.entity === 'baby') {
              const deleteData = item.data as { id: string };
              await BabyService.archiveBaby(deleteData.id);
            }
            break;
        }

        // Remove processed item from queue
        unifiedDataStore$.syncQueue.set(prev => 
          prev.filter(queueItem => queueItem.id !== item.id)
        );

        console.log('✅ Processed sync item:', item.id);

      } catch (error) {
        console.error('❌ Failed to process sync item:', item.id, error);
        // Keep failed item in queue for retry
      }
    }
  }

  private async fetchLatestData() {
    const user = unifiedAuthState$.user.peek();
    if (!user) return;

    try {
      const babies = await BabyService.getActiveBabies(user.id);
      
      // Update babies in store
      const babiesRecord: Record<string, Baby> = {};
      babies.forEach(baby => {
        babiesRecord[baby.id] = baby;
      });
      
      unifiedDataStore$.babies.set(babiesRecord);

      // Set first baby as active if no active baby is set
      const activeBabyId = unifiedDataStore$.activeBabyId.peek();
      if (!activeBabyId && babies.length > 0) {
        unifiedDataStore$.activeBabyId.set(babies[0]!.id);
      }

    } catch (error) {
      console.error('❌ Failed to fetch latest data:', error);
      throw error;
    }
  }

  private handleRealtimeUpdate(payload: { eventType: string; new?: Baby; old?: Baby }) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          unifiedDataStore$.babies.set(prev => ({
            ...prev,
            [newRecord.id]: newRecord
          }));
          console.log('📡 Realtime: Baby created', newRecord.id);
        }
        break;

      case 'UPDATE':
        if (newRecord) {
          unifiedDataStore$.babies.set(prev => ({
            ...prev,
            [newRecord.id]: newRecord
          }));
          console.log('📡 Realtime: Baby updated', newRecord.id);
        }
        break;

      case 'DELETE':
        if (oldRecord) {
          unifiedDataStore$.babies.set(prev => {
            const { [oldRecord.id]: removed, ...rest } = prev;
            // Use removed to avoid unused variable warning
            void removed;
            return rest;
          });
          console.log('📡 Realtime: Baby deleted', oldRecord.id);
        }
        break;
    }
  }

  stop() {
    if (!this.isStarted) {
      console.log('📴 Sync manager not started, skipping stop...');
      return;
    }

    console.log('📴 Stopping unified sync manager...');
    
    this.disableSyncMode();
    this.disableRealtimeMode();
    
    // Clean up listeners
    if (this.shouldSyncListener) {
      this.shouldSyncListener();
      this.shouldSyncListener = null;
    }
    if (this.shouldUseRealtimeListener) {
      this.shouldUseRealtimeListener();
      this.shouldUseRealtimeListener = null;
    }
    
    this.isStarted = false;
  }
}

// Singleton sync manager
const syncManager = new UnifiedSyncManager();

// Main hook for unified data access
export const useUnifiedData = () => {
  const auth = useUnifiedAuth();
  const hasStarted = useRef(false);

  // Start sync manager when auth is ready
  useEffect(() => {
    if (auth.isReady && !hasStarted.current) {
      syncManager.start();
      hasStarted.current = true;
    }

    return () => {
      if (hasStarted.current) {
        syncManager.stop();
        hasStarted.current = false;
      }
    };
  }, [auth.isReady]);

  // Helper to add item to sync queue
  const queueForSync = useCallback((
    type: 'create' | 'update' | 'delete',
    entity: 'baby',
    data: Record<string, unknown>
  ) => {
    const queueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      entity,
      data,
      timestamp: Date.now(),
    };

    unifiedDataStore$.syncQueue.set(prev => [...prev, queueItem]);

    // If we should sync immediately, trigger sync
    if (auth.shouldSync) {
      setTimeout(() => {
        syncManager['performSync']();
      }, 100);
    }
  }, [auth.shouldSync]);

  // Baby operations - automatically sync when appropriate
  const createBaby = useCallback(async (data: Omit<BabyInsert, 'id' | 'created_at' | 'updated_at' | 'client_id' | 'sync_status'>) => {
    try {
      unifiedDataStore$.loading.set(true);
      unifiedDataStore$.error.set(null);

      // Create local baby immediately (optimistic update)
      const localBaby: Baby = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        profile_id: auth.user?.id || auth.deviceId || 'unknown',
        date_of_birth: data.date_of_birth,
        name: data.name,
        nickname: data.nickname || null,
        gender: data.gender || null,
        color_theme: data.color_theme || '#3B82F6',
        is_active: data.is_active ?? true,
        sync_status: (auth.shouldSync ? 'pending' : 'synced') as SyncStatusType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_id: auth.deviceId || 'unknown',
        // Optional fields
        weight_at_birth_value: data.weight_at_birth_value || null,
        weight_at_birth_unit: data.weight_at_birth_unit || null,
        height_at_birth_value: data.height_at_birth_value || null,
        height_at_birth_unit: data.height_at_birth_unit || null,
        head_circumference_at_birth_value: data.head_circumference_at_birth_value || null,
        head_circumference_at_birth_unit: data.head_circumference_at_birth_unit || null,
        gestational_age_weeks: data.gestational_age_weeks || null,
        birth_location: data.birth_location || null,
        archive_reason: null,
        avatar_url: data.avatar_url || null,
        notes: data.notes || null,
        medical_notes: data.medical_notes || null,
        time_of_birth: data.time_of_birth || null,
      };

      // Add to local store immediately
      unifiedDataStore$.babies.set(prev => ({
        ...prev,
        [localBaby.id]: localBaby
      }));

      // Set as active if first baby
      if (!unifiedDataStore$.activeBabyId.peek()) {
        unifiedDataStore$.activeBabyId.set(localBaby.id);
      }

      // Queue for sync if authenticated and online
      if (auth.shouldSync) {
        queueForSync('create', 'baby', data);
      }

      return localBaby;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create baby';
      unifiedDataStore$.error.set(errorMessage);
      throw error;
    } finally {
      unifiedDataStore$.loading.set(false);
    }
  }, [auth.shouldSync, auth.user?.id, auth.deviceId, queueForSync]);

  const updateBaby = useCallback(async (babyId: string, updates: Partial<Baby>) => {
    try {
      unifiedDataStore$.loading.set(true);
      unifiedDataStore$.error.set(null);

      // Update locally immediately (optimistic update)
      unifiedDataStore$.babies.set(prev => {
        const currentBaby = prev[babyId];
        if (!currentBaby) return prev;

        return {
          ...prev,
          [babyId]: {
            ...currentBaby,
            ...updates,
            updated_at: new Date().toISOString(),
            sync_status: (auth.shouldSync ? 'pending' : 'synced') as SyncStatusType,
          }
        };
      });

      // Queue for sync if authenticated and online
      if (auth.shouldSync) {
        queueForSync('update', 'baby', { id: babyId, ...updates });
      }

      return unifiedDataStore$.babies.peek()[babyId]!;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update baby';
      unifiedDataStore$.error.set(errorMessage);
      throw error;
    } finally {
      unifiedDataStore$.loading.set(false);
    }
  }, [auth.shouldSync, queueForSync]);

  const setActiveBaby = useCallback((babyId: string) => {
    const baby = unifiedDataStore$.babies.peek()[babyId];
    if (baby) {
      unifiedDataStore$.activeBabyId.set(babyId);
    } else {
      throw new Error(`Baby with ID ${babyId} not found`);
    }
  }, []);

  // Reactive data access
  return {
    // Data (automatically reactive via Legend State)
    babies: unifiedDataStore$.babies.get(),
    activeBabyId: unifiedDataStore$.activeBabyId.get(),
    
    // Actions (work offline and online automatically)
    createBaby,
    updateBaby,
    setActiveBaby,
    
    // Computed selectors
    get allBabies() {
      return Object.values(unifiedDataStore$.babies.get());
    },
    
    get activeBaby() {
      const activeBabyId = unifiedDataStore$.activeBabyId.get();
      return activeBabyId ? unifiedDataStore$.babies.get()[activeBabyId] || null : null;
    },
    
    // Status
    loading: unifiedDataStore$.loading.get(),
    error: unifiedDataStore$.error.get(),
    
    // Sync status
    isSyncing: unifiedDataStore$.isSyncing.get(),
    syncError: unifiedDataStore$.syncError.get(),
    lastSyncTime: unifiedDataStore$.lastSyncTime.get(),
    syncQueueSize: unifiedDataStore$.syncQueue.get().length,
    
    // Helper to clear errors
    clearError: () => unifiedDataStore$.error.set(null),
  };
};