/**
 * Activity Utilities - Centralized Activity Management
 *
 * Non-card-specific utilities for activity types, colors, names, and emojis.
 * This module provides a centralized source of truth for all activity-related data.
 */

import type { ActivityType } from '../services/supabase';

// Re-export ActivityType for convenience
export type { ActivityType };

// Activity colors as hex values - centralized source of truth
export const activityColors: Record<ActivityType, string> = {
  nursing: '#FF6B6B', // Warm Red (kept same)
  bottle: '#74B9FF', // Light Blue (was tummy_time's blue)
  pumping: '#FDCB6E', // Yellow (was nappy's yellow)
  sleep: '#6C5CE7', // Purple (kept same)
  nappy: '#8B6F47', // Brown (new color for diaper)
  tummy_time: '#95E77E', // Green (was pumping's green)
  play: '#9B59B6', // Violet (keeping for now - can remove if not needed)
  bath: '#2ECC71', // Emerald (keeping for now - can remove if not needed)
  walk: '#F39C12', // Orange (keeping for now - can remove if not needed)
  massage: '#E67E22', // Carrot (keeping for now - can remove if not needed)
};

// Activity emoji mapping - centralized source of truth
export const activityEmojis: Record<ActivityType, string> = {
  nursing: '🤱',
  bottle: '🍼',
  pumping: '🤏',
  sleep: '😴',
  nappy: '👶',
  tummy_time: '🤸',
  play: '🎮',
  bath: '🛁',
  walk: '🚶',
  massage: '💆',
};

// Activity name mapping - centralized source of truth
export const activityNames: Record<ActivityType, string> = {
  nursing: 'Nursing',
  bottle: 'Bottle',
  pumping: 'Pumping',
  sleep: 'Sleep',
  nappy: 'Diaper Change',
  tummy_time: 'Tummy Time',
  play: 'Play Time',
  bath: 'Bath',
  walk: 'Walk',
  massage: 'Massage',
};

// Convert hex colors to Tailwind classes for UI components
export const hexToTailwindClass = (hexColor: string): string => {
  const colorMap: Record<string, string> = {
    '#FF6B6B': 'bg-red-400',
    '#74B9FF': 'bg-blue-400',
    '#FDCB6E': 'bg-yellow-400',
    '#6C5CE7': 'bg-purple-400',
    '#8B6F47': 'bg-amber-700',
    '#95E77E': 'bg-green-400',
    '#9B59B6': 'bg-violet-400',
    '#2ECC71': 'bg-emerald-400',
    '#F39C12': 'bg-orange-400',
    '#E67E22': 'bg-orange-500',
  };
  return colorMap[hexColor] || 'bg-gray-400';
};

// Utility function to get activity color with type safety
export function getActivityColor(type: string): string {
  return activityColors[type as ActivityType] || '#9CA3AF';
}

// Utility function to get activity color as Tailwind class
export function getActivityColorClass(type: string): string {
  const hexColor = getActivityColor(type);
  return hexToTailwindClass(hexColor);
}

// Utility function to get activity emoji with type safety
export function getActivityEmoji(type: string): string {
  return activityEmojis[type as ActivityType] || '📝';
}

// Utility function to get activity name with type safety
export function getActivityName(type: string): string {
  return (
    activityNames[type as ActivityType] ||
    type.charAt(0).toUpperCase() + type.slice(1)
  );
}

// Get all available activity types
export function getAllActivityTypes(): ActivityType[] {
  return Object.keys(activityColors) as ActivityType[];
}

// Check if a string is a valid activity type
export function isValidActivityType(type: string): type is ActivityType {
  return type in activityColors;
}

// Get activity statistics helpers
export function getActivityDisplayData(type: string) {
  return {
    color: getActivityColor(type),
    colorClass: getActivityColorClass(type),
    emoji: getActivityEmoji(type),
    name: getActivityName(type),
  };
}
