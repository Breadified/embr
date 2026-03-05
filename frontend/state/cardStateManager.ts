import { observable } from '@legendapp/state';
import type { ActivityType } from '../services/supabase';
import { 
  getActivityColor, 
  getActivityEmoji, 
  getActivityName 
} from '../utils/activityUtils';

// Re-export ActivityType for convenience
export type { ActivityType };

// Re-export activity utilities for backward compatibility
export { getActivityColor, getActivityEmoji, getActivityName };

// Simplified card state interface - only handles expansion
export interface CardState {
  expandedCard: ActivityType | null;
  isAnimating: boolean;
  lastExpandedTime: number;
  // NO session state - that's handled by unifiedActivityStore
}

// Global card expansion state manager
export const cardState$ = observable<CardState>({
  expandedCard: null,  // Start collapsed - let user choose first activity
  isAnimating: false,
  lastExpandedTime: 0,
  // NO session state - single source of truth in unifiedActivityStore
});

// Simple card expansion state manager actions
export const cardStateActions = {
  /**
   * Expand a specific activity card
   * @param activityType - The type of activity card to expand
   */
  expandCard: (activityType: ActivityType) => {
    console.log('📋 Attempting to expand card:', activityType);

    // Prevent rapid state changes during animation
    if (cardState$.isAnimating.peek()) {
      console.log('📋 Animation in progress, ignoring expand request');
      return false;
    }

    const currentExpanded = cardState$.expandedCard.peek();

    // If same card is already expanded, do nothing
    if (currentExpanded === activityType) {
      console.log('📋 Card already expanded:', activityType);
      return true;
    }

    // Set animation flag
    cardState$.isAnimating.set(true);

    // Update expanded card
    cardState$.expandedCard.set(activityType);
    cardState$.lastExpandedTime.set(Date.now());

    // Clear animation flag after a delay
    setTimeout(() => {
      cardState$.isAnimating.set(false);
    }, 300);

    console.log('✅ Card expanded successfully:', activityType);
    return true;
  },

  /**
   * Collapse the currently expanded card
   */
  collapseCard: () => {
    console.log('📋 Collapsing card');

    // Prevent rapid state changes during animation
    if (cardState$.isAnimating.peek()) {
      console.log('📋 Animation in progress, ignoring collapse request');
      return false;
    }

    const currentExpanded = cardState$.expandedCard.peek();

    // If no card is expanded, do nothing
    if (!currentExpanded) {
      console.log('📋 No card expanded to collapse');
      return true;
    }

    // Set animation flag
    cardState$.isAnimating.set(true);

    // Clear expanded card
    cardState$.expandedCard.set(null);

    // Clear animation flag after a delay
    setTimeout(() => {
      cardState$.isAnimating.set(false);
    }, 300); // Match with animation duration

    return true;
  },

  /**
   * Toggle a specific activity card (expand if collapsed, collapse if expanded)
   * @param activityType - The type of activity card to toggle  
   */
  toggleCard: (activityType: ActivityType) => {
    const currentExpanded = cardState$.expandedCard.peek();

    if (currentExpanded === activityType) {
      return cardStateActions.collapseCard();
    } else {
      return cardStateActions.expandCard(activityType);
    }
  },

  /**
   * Check if a specific card is expanded
   * @param activityType - The type of activity card to check
   */
  isCardExpanded: (activityType: ActivityType): boolean => {
    return cardState$.expandedCard.peek() === activityType;
  },

  /**
   * Get the color for a specific activity type
   * @param activityType - The type of activity
   */
  getActivityColor: (activityType: ActivityType): string => {
    return getActivityColor(activityType);
  },

  /**
   * Get the emoji for a specific activity type
   * @param activityType - The type of activity
   */
  getActivityEmoji: (activityType: ActivityType): string => {
    return getActivityEmoji(activityType);
  },

  /**
   * Get the name for a specific activity type
   * @param activityType - The type of activity
   */
  getActivityName: (activityType: ActivityType): string => {
    return getActivityName(activityType);
  },

  /**
   * Reset all card state (for testing or cleanup)
   */
  resetState: () => {
    console.log('📋 Resetting card state');
    cardState$.expandedCard.set(null);
    cardState$.isAnimating.set(false);
    cardState$.lastExpandedTime.set(0);
    // Session state is handled by unifiedActivityStore, not here
  },
};
