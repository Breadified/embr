/**
 * Timeline Logic Module
 * 
 * Business logic for aggregating and transforming activity data
 * into timeline-friendly structures. Separated from UI components
 * following separation of concerns principle.
 */

import type { ActivitySession, ActivityType } from '../../services/supabase';

// Timeline data structures
export interface TimelineData {
  startDate: Date;
  endDate: Date;
  segments: TimelineSegment[];
  activities: GroupedActivity[];
  stats: DayStats[];
  dailyStats: DayStats[];
  totalActivities: number;
  totalSessions: number;
  totalDuration: number;
  activityBreakdown: Record<string, { count: number; totalDuration: number }>;
}

export interface TimelineSegment {
  id: string;
  hour: number;
  date: Date;
  activities: ActivitySession[];
  overlaps: OverlapInfo[];
  isEmpty: boolean;
}

export interface GroupedActivity {
  activityType: ActivityType;
  sessions: ActivitySession[];
  totalDuration: number;
  averageDuration: number;
  count: number;
}

export interface DayStats {
  date: string;
  dayOfWeek: string;
  totalActivities: number;
  sessionCount: number;
  totalDuration: number;
  activityBreakdown: Record<ActivityType, number>;
  activityCounts: Record<string, number>;
  peakHour: number;
}

// Legacy alias for compatibility
export type DailyStats = DayStats;

export interface OverlapInfo {
  activities: ActivitySession[];
  startTime: Date;
  endTime: Date;
  maxConcurrent: number;
}

// Constants  
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_HOUR = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * 1000;

/**
 * Main timeline data aggregation function
 * Transforms raw activity sessions into timeline-ready data
 */
export function aggregateTimelineData(
  sessions: ActivitySession[],
  days: number = 7
): TimelineData {
  // 🚨 PERFORMANCE MONITORING: Track aggregation time
  const startTime = performance.now();
  console.log('⚡ Starting timeline aggregation:', {
    sessionCount: sessions.length,
    daysToProcess: days,
    expectedSegments: days * 24
  });
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // Filter sessions within date range
  const filteredSessions = sessions.filter(session => {
    const sessionStart = new Date(session.started_at);
    return sessionStart >= startDate && sessionStart <= endDate;
  });

  // 🚨 PERFORMANCE OPTIMIZATION: Skip segment generation for large datasets
  // Generate timeline segments (hourly) - this is the performance bottleneck
  console.log('⚡ Generating timeline segments...');
  const segmentStart = performance.now();
  
  // For performance, limit segment generation if we have too many sessions
  const shouldGenerateFullSegments = filteredSessions.length < 500 && days <= 14;
  
  let segments: TimelineSegment[] = [];
  if (shouldGenerateFullSegments) {
    segments = generateTimelineSegments(startDate, endDate, filteredSessions);
  } else {
    console.log('⚠️ Using minimal segments for performance (too many sessions)');
    // Generate minimal segments with session data for performance
    segments = generateMinimalSegments(startDate, endDate, filteredSessions);
  }
  
  const segmentTime = performance.now() - segmentStart;
  console.log('⚡ Segment generation completed:', {
    segmentCount: segments.length,
    processingTime: `${segmentTime.toFixed(2)}ms`,
    usedFullGeneration: shouldGenerateFullSegments
  });
  
  // Group activities by type
  const activities = groupActivitiesByType(filteredSessions);
  
  // Calculate daily stats
  const stats = calculateDailyStats(filteredSessions, startDate, days);
  
  // Calculate totals
  const totalActivities = filteredSessions.length;
  const totalDuration = filteredSessions.reduce(
    (sum, session) => sum + (session.total_duration_seconds || 0),
    0
  );

  // Create activity breakdown
  const activityBreakdown: Record<string, { count: number; totalDuration: number }> = {};
  filteredSessions.forEach(session => {
    const type = session.activity_type;
    if (!activityBreakdown[type]) {
      activityBreakdown[type] = { count: 0, totalDuration: 0 };
    }
    activityBreakdown[type].count++;
    activityBreakdown[type].totalDuration += session.total_duration_seconds || 0;
  });

  const totalTime = performance.now() - startTime;
  console.log('✅ Timeline aggregation completed:', {
    totalProcessingTime: `${totalTime.toFixed(2)}ms`,
    performanceRating: totalTime < 100 ? 'excellent' : totalTime < 500 ? 'good' : 'poor',
    sessionsProcessed: filteredSessions.length,
    segmentsGenerated: segments.length
  });
  
  return {
    startDate,
    endDate,
    segments,
    activities,
    stats,
    dailyStats: stats,
    totalActivities,
    totalSessions: totalActivities,
    totalDuration,
    activityBreakdown,
  };
}

/**
 * Generate minimal timeline segments for performance
 * Creates day-level segments with session data but without hourly breakdown
 */
export function generateMinimalSegments(
  startDate: Date,
  endDate: Date,
  sessions: ActivitySession[]
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  const current = new Date(startDate);
  
  // Generate daily segments with actual session data
  while (current <= endDate) {
    const dayStart = new Date(current);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Find sessions for this day
    const dayActivities = sessions.filter(session => {
      const sessionStart = new Date(session.started_at);
      return sessionStart >= dayStart && sessionStart <= dayEnd;
    });
    
    segments.push({
      id: `minimal_segment_${current.getTime()}`,
      hour: 12, // Noon as representative hour
      date: new Date(current),
      activities: dayActivities, // Include actual session data
      overlaps: [],
      isEmpty: dayActivities.length === 0,
    });
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return segments;
}

/**
 * Generate hourly timeline segments
 * 🚨 PERFORMANCE WARNING: This can be very slow with large datasets!
 */
export function generateTimelineSegments(
  startDate: Date,
  endDate: Date,
  sessions: ActivitySession[]
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const hour = current.getHours();
    const segmentStart = new Date(current);
    const segmentEnd = new Date(current);
    segmentEnd.setHours(hour + 1, 0, 0, 0);
    
    // Find activities in this hour
    const segmentActivities = sessions.filter(session => {
      const sessionStart = new Date(session.started_at);
      const sessionEnd = session.ended_at ? new Date(session.ended_at) : new Date();
      
      // Check if session overlaps with this hour
      return (
        (sessionStart >= segmentStart && sessionStart < segmentEnd) ||
        (sessionEnd > segmentStart && sessionEnd <= segmentEnd) ||
        (sessionStart < segmentStart && sessionEnd > segmentEnd)
      );
    });
    
    // Calculate overlaps
    const overlaps = calculateOverlaps(segmentActivities);
    
    segments.push({
      id: `segment_${current.getTime()}_${hour}`,
      hour,
      date: new Date(current),
      activities: segmentActivities,
      overlaps,
      isEmpty: segmentActivities.length === 0,
    });
    
    // Move to next hour
    current.setHours(current.getHours() + 1);
  }
  
  return segments;
}

/**
 * Group activities by type with statistics
 */
export function groupActivitiesByType(sessions: ActivitySession[]): GroupedActivity[] {
  const groups: Record<ActivityType, GroupedActivity> = {} as Record<ActivityType, GroupedActivity>;
  
  sessions.forEach(session => {
    const type = session.activity_type;
    
    if (!groups[type]) {
      groups[type] = {
        activityType: type,
        sessions: [],
        totalDuration: 0,
        averageDuration: 0,
        count: 0,
      };
    }
    
    groups[type].sessions.push(session);
    groups[type].totalDuration += session.total_duration_seconds || 0;
    groups[type].count += 1;
  });
  
  // Calculate averages
  Object.values(groups).forEach(group => {
    group.averageDuration = group.count > 0 
      ? Math.round(group.totalDuration / group.count)
      : 0;
  });
  
  return Object.values(groups);
}

/**
 * Calculate overlapping activities
 */
export function calculateOverlaps(activities: ActivitySession[]): OverlapInfo[] {
  if (activities.length < 2) {
    return [];
  }
  
  const overlaps: OverlapInfo[] = [];
  const events: Array<{ time: Date; type: 'start' | 'end'; session: ActivitySession }> = [];
  
  // Create start and end events
  activities.forEach(session => {
    events.push({
      time: new Date(session.started_at),
      type: 'start',
      session,
    });
    
    if (session.ended_at) {
      events.push({
        time: new Date(session.ended_at),
        type: 'end',
        session,
      });
    }
  });
  
  // Sort events by time
  events.sort((a, b) => a.time.getTime() - b.time.getTime());
  
  // Sweep line algorithm to find overlaps
  const active = new Set<ActivitySession>();
  let maxConcurrent = 0;
  let overlapStart: Date | null = null;
  
  events.forEach(event => {
    if (event.type === 'start') {
      if (active.size > 0 && !overlapStart) {
        overlapStart = event.time;
      }
      active.add(event.session);
      maxConcurrent = Math.max(maxConcurrent, active.size);
    } else {
      active.delete(event.session);
      
      if (active.size === 1 && overlapStart) {
        overlaps.push({
          activities: Array.from(active),
          startTime: overlapStart,
          endTime: event.time,
          maxConcurrent,
        });
        overlapStart = null;
        maxConcurrent = 0;
      }
    }
  });
  
  return overlaps;
}

/**
 * Calculate daily statistics
 */
export function calculateDailyStats(
  sessions: ActivitySession[],
  startDate: Date,
  days: number
): DayStats[] {
  const stats: DayStats[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i < days; i++) {
    const dayStart = new Date(startDate);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Filter sessions for this day
    const daySessions = sessions.filter(session => {
      const sessionStart = new Date(session.started_at);
      return sessionStart >= dayStart && sessionStart <= dayEnd;
    });
    
    // Calculate activity breakdown
    const activityBreakdown: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};
    
    daySessions.forEach(session => {
      const type = session.activity_type;
      activityBreakdown[type] = (activityBreakdown[type] || 0) + 1;
      
      const hour = new Date(session.started_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    // Find peak hour
    let peakHour = 0;
    let maxCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        peakHour = parseInt(hour, 10);
      }
    });
    
    // Calculate total duration
    const totalDuration = daySessions.reduce(
      (sum, session) => sum + (session.total_duration_seconds || 0),
      0
    );
    
    stats.push({
      date: dayStart.toISOString(),
      dayOfWeek: dayNames[dayStart.getDay()] || 'Unknown',
      totalActivities: daySessions.length,
      sessionCount: daySessions.length,
      totalDuration,
      activityBreakdown: activityBreakdown as Record<ActivityType, number>,
      activityCounts: activityBreakdown,
      peakHour,
    });
  }
  
  return stats;
}

/**
 * Generate time axis labels
 */
export function generateTimeAxis(
  startDate: Date,
  endDate: Date,
  intervalHours: number = 1
): Array<{ time: Date; label: string; isToday: boolean; isNow: boolean }> {
  const labels: Array<{ time: Date; label: string; isToday: boolean; isNow: boolean }> = [];
  const current = new Date(startDate);
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  while (current <= endDate) {
    const isToday = current.toDateString() === today.toDateString();
    const isNow = Math.abs(current.getTime() - now.getTime()) < MS_PER_HOUR;
    
    labels.push({
      time: new Date(current),
      label: formatTimeLabel(current, isToday),
      isToday,
      isNow,
    });
    
    current.setHours(current.getHours() + intervalHours);
  }
  
  return labels;
}

/**
 * Format time label for display
 */
function formatTimeLabel(date: Date, isToday: boolean): string {
  const hours = date.getHours();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  if (isToday) {
    return `${displayHours}${period}`;
  }
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[date.getDay()];
  
  return `${dayName} ${displayHours}${period}`;
}

/**
 * Calculate activity duration in a specific time range
 */
export function calculateDurationInRange(
  session: ActivitySession,
  rangeStart: Date,
  rangeEnd: Date
): number {
  const sessionStart = new Date(session.started_at);
  const sessionEnd = session.ended_at ? new Date(session.ended_at) : new Date();
  
  // No overlap
  if (sessionEnd < rangeStart || sessionStart > rangeEnd) {
    return 0;
  }
  
  // Calculate overlap
  const overlapStart = sessionStart > rangeStart ? sessionStart : rangeStart;
  const overlapEnd = sessionEnd < rangeEnd ? sessionEnd : rangeEnd;
  
  return Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / 1000);
}


/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}