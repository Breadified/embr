// Activity service - business logic for managing activity sessions
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityType, ActivitySession, ActivityMetadata } from './activityTypes';

const ACTIVITIES_KEY = 'embr_activities';
const ACTIVE_SESSIONS_KEY = 'embr_active_sessions';

export class ActivityService {
  // Save activity session to storage
  static async saveSession(session: ActivitySession): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(ACTIVITIES_KEY);
      const activities = stored ? JSON.parse(stored) : {};
      
      if (!activities[session.baby_id]) {
        activities[session.baby_id] = [];
      }
      
      activities[session.baby_id].push(session);
      
      // Keep only last 100 activities per baby
      if (activities[session.baby_id].length > 100) {
        activities[session.baby_id] = activities[session.baby_id].slice(-100);
      }
      
      await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
    } catch (error) {
      console.error('Failed to save activity session:', error);
    }
  }

  // Load activities for a baby
  static async loadSessions(babyId: string): Promise<ActivitySession[]> {
    try {
      const stored = await AsyncStorage.getItem(ACTIVITIES_KEY);
      if (stored) {
        const activities = JSON.parse(stored);
        return activities[babyId] || [];
      }
    } catch (error) {
      console.error('Failed to load activity sessions:', error);
    }
    return [];
  }

  // Start a new session
  static async startSession(
    babyId: string, 
    activityType: ActivityType,
    metadata?: ActivityMetadata
  ): Promise<ActivitySession> {
    const session: ActivitySession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      baby_id: babyId,
      activity_type: activityType,
      started_at: new Date().toISOString(),
      ...(metadata && { metadata }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save as active session
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_SESSIONS_KEY);
      const activeSessions = stored ? JSON.parse(stored) : {};
      activeSessions[activityType] = session;
      await AsyncStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(activeSessions));
    } catch (error) {
      console.error('Failed to save active session:', error);
    }

    return session;
  }

  // End a session
  static async endSession(
    sessionId: string,
    activityType: ActivityType,
    metadata?: ActivityMetadata
  ): Promise<ActivitySession | null> {
    try {
      // Get active session
      const stored = await AsyncStorage.getItem(ACTIVE_SESSIONS_KEY);
      const activeSessions = stored ? JSON.parse(stored) : {};
      const session = activeSessions[activityType];
      
      if (session && session.id === sessionId) {
        // Update session
        session.ended_at = new Date().toISOString();
        session.duration = Math.floor(
          (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000
        );
        session.metadata = { ...session.metadata, ...metadata };
        session.updated_at = new Date().toISOString();
        
        // Save to history
        await this.saveSession(session);
        
        // Remove from active sessions
        delete activeSessions[activityType];
        await AsyncStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(activeSessions));
        
        return session;
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    }
    return null;
  }

  // Get active session for an activity type
  static async getActiveSession(activityType: ActivityType): Promise<ActivitySession | null> {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_SESSIONS_KEY);
      if (stored) {
        const activeSessions = JSON.parse(stored);
        return activeSessions[activityType] || null;
      }
    } catch (error) {
      console.error('Failed to get active session:', error);
    }
    return null;
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([ACTIVITIES_KEY, ACTIVE_SESSIONS_KEY]);
    } catch (error) {
      console.error('Failed to clear activity data:', error);
    }
  }
}