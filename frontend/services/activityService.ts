// ✅ UNIFIED ARCHITECTURE COMPLIANT - Activity Service for Offline-First Local Storage
// NO DIRECT SUPABASE CALLS - All sync handled by useUnifiedActivity hook

import type { 
  ActivitySession, 
  ActivityType 
} from './supabase';
import type { Json } from '../types/database';

// ✅ ARCHITECTURE COMPLIANT: Local-only activity service
// All database operations handled by unified hooks, not direct Supabase calls
export class ActivityService {
  
  // ✅ OFFLINE-FIRST: Generate local session IDs
  private static generateLocalId(): string {
    return `local_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ✅ OFFLINE-FIRST: Generate client IDs for tracking
  private static generateClientId(): string {
    // Use crypto.randomUUID if available, fallback to manual generation
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback UUID v4 generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ✅ ARCHITECTURE COMPLIANT: Create session template for local storage
  // NOTE: Actual session creation should use useUnifiedActivity().startSession()
  static createSessionTemplate(data: {
    babyId: string;
    activityType: ActivityType;
    metadata?: Record<string, unknown>;
    clientId?: string;
  }): Partial<ActivitySession> {
    const now = new Date().toISOString();
    
    return {
      id: this.generateLocalId(),
      baby_id: data.babyId,
      activity_type: data.activityType,
      started_at: now,
      ended_at: null,
      total_duration_seconds: 0,
      metadata: (data.metadata || {}) as Json,
      client_id: data.clientId || this.generateClientId(),
      sync_status: 'pending',
      created_at: now,
      updated_at: now,
    };
  }

  // ✅ ARCHITECTURE COMPLIANT: Calculate duration helper
  static calculateDuration(startTime: string, endTime?: string): number {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }

  // ✅ ARCHITECTURE COMPLIANT: Session completion helper
  static completeSessionTemplate(
    session: Partial<ActivitySession>, 
    finalMetadata?: Record<string, unknown>
  ): Partial<ActivitySession> {
    const endTime = new Date().toISOString();
    const duration = session.started_at 
      ? this.calculateDuration(session.started_at, endTime)
      : 0;

    return {
      ...session,
      ended_at: endTime,
      total_duration_seconds: duration,
      metadata: (finalMetadata || session.metadata) as Json,
      updated_at: endTime,
      sync_status: 'pending',
    };
  }

  // ✅ ARCHITECTURE COMPLIANT: Quick log template
  static createQuickLogTemplate(data: {
    babyId: string;
    activityType: ActivityType;
    metadata: Record<string, unknown>;
    duration?: number;
    clientId?: string;
  }): Partial<ActivitySession> {
    const now = new Date().toISOString();
    const endTime = data.duration 
      ? new Date(Date.now() + data.duration * 1000).toISOString()
      : now;

    return {
      id: this.generateLocalId(),
      baby_id: data.babyId,
      activity_type: data.activityType,
      started_at: now,
      ended_at: endTime,
      total_duration_seconds: data.duration || 0,
      metadata: data.metadata as Json,
      client_id: data.clientId || this.generateClientId(),
      sync_status: 'pending',
      created_at: now,
      updated_at: now,
    };
  }

  // ✅ ARCHITECTURE COMPLIANT: Validate session data
  static validateSessionData(data: Partial<ActivitySession>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.baby_id) {
      errors.push('Baby ID is required');
    }

    if (!data.activity_type) {
      errors.push('Activity type is required');
    }

    if (!data.started_at) {
      errors.push('Start time is required');
    }

    if (data.ended_at && data.started_at) {
      const startTime = new Date(data.started_at);
      const endTime = new Date(data.ended_at);
      if (endTime <= startTime) {
        errors.push('End time must be after start time');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ✅ ARCHITECTURE COMPLIANT: Format metadata for different activity types
  static formatMetadataForActivity(
    activityType: ActivityType, 
    rawMetadata: Record<string, unknown>
  ): Record<string, unknown> {
    const formatted = { ...rawMetadata };

    switch (activityType) {
      case 'nursing':
        // Ensure nursing-specific fields
        formatted.side = formatted.side || 'left';
        formatted.switchedSides = formatted.switchedSides || false;
        break;
      case 'bottle':
        // Ensure bottle-specific fields
        formatted.amountOffered = formatted.amountOffered || 0;
        formatted.amountConsumed = formatted.amountConsumed || 0;
        formatted.unit = formatted.unit || 'ml';
        break;
      case 'pumping':
        // Ensure pumping-specific fields
        formatted.leftAmount = formatted.leftAmount || 0;
        formatted.rightAmount = formatted.rightAmount || 0;
        formatted.totalAmount = formatted.totalAmount || 0;
        formatted.unit = formatted.unit || 'ml';
        break;
      case 'sleep':
        // Ensure sleep-specific fields
        formatted.quality = formatted.quality || 'good';
        formatted.location = formatted.location || 'crib';
        break;
      case 'tummy_time':
        // Ensure tummy time-specific fields
        formatted.position = formatted.position || 'tummy';
        formatted.toys = formatted.toys || [];
        break;
      case 'nappy':
        // Ensure nappy-specific fields
        formatted.type = formatted.type || 'wet';
        formatted.hasWet = formatted.hasWet || false;
        formatted.hasSoiled = formatted.hasSoiled || false;
        break;
    }

    return formatted;
  }

  // ✅ ARCHITECTURE COMPLIANT: Get activity display name
  static getActivityDisplayName(activityType: ActivityType): string {
    switch (activityType) {
      case 'nursing': return 'Nursing';
      case 'bottle': return 'Bottle Feeding';
      case 'pumping': return 'Pumping';
      case 'sleep': return 'Sleep';
      case 'tummy_time': return 'Tummy Time';
      case 'nappy': return 'Nappy Change';
      default: return 'Activity';
    }
  }

  // ✅ ARCHITECTURE COMPLIANT: Get activity color theme
  static getActivityColor(activityType: ActivityType): string {
    switch (activityType) {
      case 'nursing': return '#EC4899'; // pink-500
      case 'bottle': return '#3B82F6'; // blue-500
      case 'pumping': return '#8B5CF6'; // violet-500
      case 'sleep': return '#6366F1'; // indigo-500
      case 'tummy_time': return '#10B981'; // emerald-500
      case 'nappy': return '#F59E0B'; // amber-500
      default: return '#6B7280'; // gray-500
    }
  }
}

// ✅ ARCHITECTURE NOTES:
// 
// This ActivityService is now FULLY COMPLIANT with our Unified Architecture:
// 
// ❌ REMOVED: All direct Supabase calls
// ❌ REMOVED: Database operations
// ❌ REMOVED: Sync logic
// 
// ✅ ADDED: Local session templates
// ✅ ADDED: Data validation helpers
// ✅ ADDED: Metadata formatting utilities
// ✅ ADDED: Activity display helpers
// 
// 🎯 USAGE PATTERN:
// 
// Instead of:
//   await ActivityService.startSession(data); // ❌ OLD WAY
// 
// Use:
//   const activity = useUnifiedActivity();
//   await activity.startSession(data); // ✅ NEW WAY
// 
// The useUnifiedActivity hook handles:
// - ✅ Offline-first local storage
// - ✅ Automatic sync when online + authenticated  
// - ✅ Optimistic updates
// - ✅ Conflict resolution
// - ✅ Realtime subscriptions (when appropriate)
// 
// This maintains our Championship Unified Architecture principles!