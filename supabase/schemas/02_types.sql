-- =============================================================================
-- BabyTrack Database Schema - Custom Types and Enums
-- =============================================================================
-- Purpose: Define custom data types and enums used throughout the database
-- Dependencies: 01_extensions.sql
-- =============================================================================

-- Gender enum for baby profiles
CREATE TYPE gender_type AS ENUM ('male', 'female');

-- Activity types supported by the tracking system
-- Based on PRD requirements: nursing, bottle, pumping, sleep, nappy, tummy_time
CREATE TYPE activity_type AS ENUM (
    'nursing',
    'bottle', 
    'pumping',
    'sleep',
    'nappy',
    'tummy_time',
    'play',
    'bath',
    'walk',
    'massage'
);

-- Sync status for offline-first functionality
-- pending: Not yet synced to server
-- synced: Successfully synced
-- conflict: Conflict detected, needs resolution
-- error: Sync failed, retry needed
CREATE TYPE sync_status_type AS ENUM (
    'pending',
    'synced', 
    'conflict',
    'error'
);

-- Nappy change types
CREATE TYPE nappy_type AS ENUM (
    'wet',
    'dirty', 
    'both'
);

-- Sleep quality ratings
CREATE TYPE sleep_quality_type AS ENUM (
    'good',
    'fair',
    'poor'
);

-- Sleep locations
CREATE TYPE sleep_location_type AS ENUM (
    'crib',
    'arms',
    'carrier',
    'stroller',
    'bed',
    'bassinet'
);

-- Breast side for nursing and pumping
CREATE TYPE breast_side_type AS ENUM (
    'left',
    'right',
    'both'
);

-- Formula types for bottle feeding
CREATE TYPE formula_type AS ENUM (
    'breast_milk',
    'formula',
    'mixed'
);

-- Units for measurements
CREATE TYPE unit_type AS ENUM (
    'ml',
    'oz',
    'kg',
    'lb',
    'cm',
    'in'
);

-- Note: Timezone is stored as TEXT directly in the profiles table
-- No custom type needed as PostgreSQL handles timezones natively

-- Measurement value with unit composite type
-- Used for weights, heights, volumes, etc.
CREATE TYPE measurement AS (
    value DECIMAL(10,2),
    unit unit_type
);

-- Session segment for pause/resume functionality
-- Used in JSONB fields to track paused sessions
CREATE TYPE session_segment AS (
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    metadata JSONB
);

-- Comment on types for documentation
COMMENT ON TYPE gender_type IS 'Gender options for baby profiles';
COMMENT ON TYPE activity_type IS 'All supported activity types for tracking';
COMMENT ON TYPE sync_status_type IS 'Offline sync status for conflict resolution';
COMMENT ON TYPE nappy_type IS 'Types of nappy changes';
COMMENT ON TYPE sleep_quality_type IS 'Sleep quality assessment options';
COMMENT ON TYPE sleep_location_type IS 'Where baby sleeps';
COMMENT ON TYPE breast_side_type IS 'Left/right breast for nursing/pumping';
COMMENT ON TYPE formula_type IS 'Type of feeding content';
COMMENT ON TYPE unit_type IS 'Measurement units';
COMMENT ON TYPE measurement IS 'Value with unit for measurements';
COMMENT ON TYPE session_segment IS 'Pause/resume segment within a session';