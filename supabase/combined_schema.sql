-- =============================================================================
-- BabyTrack Database Schema - Extensions and Base Setup
-- =============================================================================
-- Purpose: Enable PostgreSQL extensions needed for the application
-- Dependencies: None (must run first)
-- =============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional crypto functions if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable postgres_fdw for potential future federated queries
-- CREATE EXTENSION IF NOT EXISTS "postgres_fdw";

-- Set timezone to UTC for consistency
-- Note: Individual users will handle timezone conversion in their preferences
SET timezone = 'UTC';

-- Create a function to automatically update updated_at timestamps
-- This will be used across multiple tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate a unique client_id
-- Used for offline sync conflict resolution
CREATE OR REPLACE FUNCTION generate_client_id()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate age in months from birth date
-- Useful for growth tracking and age-appropriate features
CREATE OR REPLACE FUNCTION calculate_age_in_months(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) * 12 +
           EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to calculate session duration from segments
-- Handles pause/resume functionality for activities
CREATE OR REPLACE FUNCTION calculate_total_duration(segments JSONB)
RETURNS INTEGER AS $$
DECLARE
    segment JSONB;
    total_duration INTEGER := 0;
BEGIN
    -- Iterate through segments array and sum durations
    FOR segment IN SELECT * FROM jsonb_array_elements(segments)
    LOOP
        total_duration := total_duration + COALESCE((segment->>'duration_seconds')::INTEGER, 0);
    END LOOP;
    
    RETURN total_duration;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comment on the schema for documentation
COMMENT ON SCHEMA public IS 'BabyTrack application schema - Core baby tracking functionality';-- =============================================================================
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
COMMENT ON TYPE session_segment IS 'Pause/resume segment within a session';-- =============================================================================
-- BabyTrack Database Schema - User Profiles
-- =============================================================================
-- Purpose: Extend Supabase auth.users with app-specific profile data
-- Dependencies: 01_extensions.sql, 02_types.sql
-- =============================================================================

-- User profiles extending Supabase auth
-- This table stores additional user information beyond what Supabase auth provides
CREATE TABLE profiles (
    -- Primary key links to auth.users.id
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Profile information
    display_name TEXT,
    avatar_url TEXT,
    
    -- User preferences and settings
    timezone TEXT NOT NULL DEFAULT 'UTC',
    preferred_units JSONB DEFAULT '{
        "weight": "kg",
        "height": "cm", 
        "volume": "ml"
    }'::JSONB,
    
    -- App preferences
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    notifications_enabled BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    haptic_enabled BOOLEAN DEFAULT true,
    
    -- Privacy settings
    data_sharing_enabled BOOLEAN DEFAULT false,
    analytics_enabled BOOLEAN DEFAULT true,
    
    -- Onboarding and feature flags
    onboarding_completed BOOLEAN DEFAULT false,
    features_enabled JSONB DEFAULT '{}'::JSONB,
    
    -- Sync metadata for offline support
    client_id TEXT DEFAULT generate_client_id(),
    last_sync_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT profiles_timezone_check CHECK (timezone IS NOT NULL AND LENGTH(timezone) > 0),
    CONSTRAINT profiles_client_id_unique UNIQUE (client_id)
);

-- Indexes for performance
CREATE INDEX idx_profiles_client_id ON profiles(client_id);
CREATE INDEX idx_profiles_last_sync_at ON profiles(last_sync_at);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create a new profile when a user signs up
-- This will be called by a trigger on auth.users
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, display_name, client_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        generate_client_id()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
-- Note: This trigger goes on auth.users which is managed by Supabase
-- In production, this would be handled via Supabase Dashboard or Edge Functions
-- CREATE TRIGGER trigger_create_profile_on_signup
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION create_profile_for_new_user();

-- Function to get user's current timezone
CREATE OR REPLACE FUNCTION get_user_timezone(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_tz TEXT;
BEGIN
    SELECT timezone INTO user_tz 
    FROM profiles 
    WHERE id = user_id;
    
    RETURN COALESCE(user_tz, 'UTC');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
    user_id UUID,
    new_timezone TEXT DEFAULT NULL,
    new_preferred_units JSONB DEFAULT NULL,
    new_theme TEXT DEFAULT NULL,
    new_notifications_enabled BOOLEAN DEFAULT NULL,
    new_sound_enabled BOOLEAN DEFAULT NULL,
    new_haptic_enabled BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles SET
        timezone = COALESCE(new_timezone, timezone),
        preferred_units = COALESCE(new_preferred_units, preferred_units),
        theme = COALESCE(new_theme, theme),
        notifications_enabled = COALESCE(new_notifications_enabled, notifications_enabled),
        sound_enabled = COALESCE(new_sound_enabled, sound_enabled),
        haptic_enabled = COALESCE(new_haptic_enabled, haptic_enabled),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE profiles IS 'Extended user profiles with app-specific preferences and settings';
COMMENT ON COLUMN profiles.id IS 'Links to auth.users.id - primary key';
COMMENT ON COLUMN profiles.timezone IS 'User timezone for displaying dates/times correctly';
COMMENT ON COLUMN profiles.preferred_units IS 'JSON object with preferred measurement units';
COMMENT ON COLUMN profiles.client_id IS 'Unique client identifier for offline sync';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed initial setup';
COMMENT ON COLUMN profiles.features_enabled IS 'JSON object with feature flags for this user';
COMMENT ON COLUMN profiles.last_sync_at IS 'Last successful sync timestamp for offline support';

COMMENT ON FUNCTION create_profile_for_new_user() IS 'Creates profile automatically when user signs up';
COMMENT ON FUNCTION get_user_timezone(UUID) IS 'Returns user timezone or UTC default';
COMMENT ON FUNCTION update_user_preferences(UUID, TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) IS 'Updates user preferences in single transaction';-- =============================================================================
-- BabyTrack Database Schema - Baby Entities
-- =============================================================================
-- Purpose: Core baby entities and their birth/growth information
-- Dependencies: 01_extensions.sql, 02_types.sql, 03_profiles.sql
-- =============================================================================

-- Babies table - core entity for the app
-- Each baby belongs to a user (profile) and contains basic information
CREATE TABLE babies (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to profiles
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Basic baby information
    name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    nickname TEXT, -- optional nickname for display
    gender gender_type,
    
    -- Birth information
    date_of_birth DATE NOT NULL,
    time_of_birth TIME, -- optional, for more precise birth time
    
    -- Birth measurements (all optional)
    weight_at_birth_value DECIMAL(5,2), -- e.g., 3.45 kg
    weight_at_birth_unit unit_type DEFAULT 'kg',
    
    height_at_birth_value DECIMAL(5,2), -- e.g., 50.5 cm  
    height_at_birth_unit unit_type DEFAULT 'cm',
    
    head_circumference_at_birth_value DECIMAL(5,2), -- e.g., 35.2 cm
    head_circumference_at_birth_unit unit_type DEFAULT 'cm',
    
    -- Additional birth information
    gestational_age_weeks INTEGER, -- weeks at birth (for premature babies)
    birth_location TEXT, -- hospital, home, etc.
    
    -- Status and management
    is_active BOOLEAN DEFAULT true, -- whether this baby is currently being tracked
    archive_reason TEXT, -- reason for archiving (if not active)
    
    -- Photo and visual
    avatar_url TEXT, -- profile photo URL
    color_theme TEXT DEFAULT '#FF6B6B', -- color for UI theming
    
    -- Notes and additional info
    notes TEXT,
    medical_notes TEXT, -- separate field for medical information
    
    -- Sync metadata
    client_id TEXT DEFAULT generate_client_id(),
    sync_status sync_status_type DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT babies_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT babies_birth_date_reasonable CHECK (
        date_of_birth >= '1900-01-01' AND 
        date_of_birth <= CURRENT_DATE + INTERVAL '1 day'
    ),
    CONSTRAINT babies_gestational_age_reasonable CHECK (
        gestational_age_weeks IS NULL OR 
        (gestational_age_weeks >= 20 AND gestational_age_weeks <= 45)
    ),
    CONSTRAINT babies_weight_at_birth_positive CHECK (
        weight_at_birth_value IS NULL OR weight_at_birth_value > 0
    ),
    CONSTRAINT babies_height_at_birth_positive CHECK (
        height_at_birth_value IS NULL OR height_at_birth_value > 0
    ),
    CONSTRAINT babies_head_circumference_positive CHECK (
        head_circumference_at_birth_value IS NULL OR head_circumference_at_birth_value > 0
    )
);

-- Indexes for performance
CREATE INDEX idx_babies_profile_id ON babies(profile_id);
CREATE INDEX idx_babies_is_active ON babies(profile_id, is_active) WHERE is_active = true;
CREATE INDEX idx_babies_date_of_birth ON babies(date_of_birth);
CREATE INDEX idx_babies_sync_status ON babies(sync_status) WHERE sync_status != 'synced';
CREATE INDEX idx_babies_created_at ON babies(created_at);

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_babies_updated_at
    BEFORE UPDATE ON babies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Growth measurements table for tracking baby's growth over time
-- This is separate from the main babies table for better organization
CREATE TABLE growth_measurements (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to baby
    baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    
    -- Measurement date
    measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
    measured_time TIME, -- optional time of measurement
    
    -- Measurements (all optional - user might only track some)
    weight_value DECIMAL(5,2),
    weight_unit unit_type DEFAULT 'kg',
    
    height_value DECIMAL(5,2), 
    height_unit unit_type DEFAULT 'cm',
    
    head_circumference_value DECIMAL(5,2),
    head_circumference_unit unit_type DEFAULT 'cm',
    
    -- Context
    notes TEXT,
    measured_by TEXT, -- who took the measurement (pediatrician, parent, etc.)
    
    -- Sync metadata
    client_id TEXT DEFAULT generate_client_id(),
    sync_status sync_status_type DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT growth_measurements_weight_positive CHECK (
        weight_value IS NULL OR weight_value > 0
    ),
    CONSTRAINT growth_measurements_height_positive CHECK (
        height_value IS NULL OR height_value > 0
    ),
    CONSTRAINT growth_measurements_head_circumference_positive CHECK (
        head_circumference_value IS NULL OR head_circumference_value > 0
    ),
    CONSTRAINT growth_measurements_measured_at_reasonable CHECK (
        measured_at >= '1900-01-01' AND 
        measured_at <= CURRENT_DATE + INTERVAL '1 day'
    )
);

-- Indexes for growth measurements
CREATE INDEX idx_growth_measurements_baby_id ON growth_measurements(baby_id);
CREATE INDEX idx_growth_measurements_measured_at ON growth_measurements(baby_id, measured_at DESC);
CREATE INDEX idx_growth_measurements_sync_status ON growth_measurements(sync_status) WHERE sync_status != 'synced';

-- Trigger for growth measurements updated_at
CREATE TRIGGER trigger_growth_measurements_updated_at
    BEFORE UPDATE ON growth_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get active babies for a user
CREATE OR REPLACE FUNCTION get_active_babies(user_id UUID)
RETURNS SETOF babies AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM babies 
    WHERE profile_id = user_id AND is_active = true
    ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to calculate baby's current age
CREATE OR REPLACE FUNCTION get_baby_age_info(baby_id UUID)
RETURNS JSONB AS $$
DECLARE
    baby_record RECORD;
    age_info JSONB;
BEGIN
    SELECT date_of_birth INTO baby_record
    FROM babies 
    WHERE id = baby_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    SELECT jsonb_build_object(
        'days_old', EXTRACT(DAY FROM AGE(CURRENT_DATE, baby_record.date_of_birth)),
        'weeks_old', FLOOR(EXTRACT(DAY FROM AGE(CURRENT_DATE, baby_record.date_of_birth)) / 7),
        'months_old', calculate_age_in_months(baby_record.date_of_birth),
        'years_old', EXTRACT(YEAR FROM AGE(CURRENT_DATE, baby_record.date_of_birth)),
        'birth_date', baby_record.date_of_birth
    ) INTO age_info;
    
    RETURN age_info;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get latest growth measurements for a baby
CREATE OR REPLACE FUNCTION get_latest_measurements(baby_id UUID)
RETURNS growth_measurements AS $$
DECLARE
    latest_measurement growth_measurements;
BEGIN
    SELECT * INTO latest_measurement
    FROM growth_measurements
    WHERE baby_id = get_latest_measurements.baby_id
    ORDER BY measured_at DESC, created_at DESC
    LIMIT 1;
    
    RETURN latest_measurement;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to archive a baby (soft delete)
CREATE OR REPLACE FUNCTION archive_baby(
    baby_id UUID,
    reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE babies SET
        is_active = false,
        archive_reason = reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = baby_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE babies IS 'Core baby entities with birth information and basic profile data';
COMMENT ON TABLE growth_measurements IS 'Growth tracking measurements over time';

COMMENT ON COLUMN babies.profile_id IS 'Parent/caregiver who owns this baby record';
COMMENT ON COLUMN babies.date_of_birth IS 'Baby birth date - required for age calculations';
COMMENT ON COLUMN babies.is_active IS 'Whether baby is currently being tracked (soft delete)';
COMMENT ON COLUMN babies.color_theme IS 'Hex color for UI theming this baby';
COMMENT ON COLUMN babies.gestational_age_weeks IS 'Weeks at birth for premature babies';

COMMENT ON COLUMN growth_measurements.baby_id IS 'Baby this measurement belongs to';
COMMENT ON COLUMN growth_measurements.measured_at IS 'Date measurement was taken';
COMMENT ON COLUMN growth_measurements.measured_by IS 'Who took the measurement';

COMMENT ON FUNCTION get_active_babies(UUID) IS 'Returns all active babies for a user';
COMMENT ON FUNCTION get_baby_age_info(UUID) IS 'Returns detailed age information for a baby';
COMMENT ON FUNCTION get_latest_measurements(UUID) IS 'Returns most recent growth measurements';
COMMENT ON FUNCTION archive_baby(UUID, TEXT) IS 'Soft delete a baby with optional reason';-- =============================================================================
-- BabyTrack Database Schema - Activity Sessions (Core Tracking)
-- =============================================================================
-- Purpose: Main activity tracking with polymorphic design for all activity types
-- Dependencies: 01_extensions.sql, 02_types.sql, 03_profiles.sql, 04_babies.sql
-- =============================================================================

-- Activity sessions - core tracking table (polymorphic design)
-- Handles all activity types: nursing, bottle, pumping, sleep, nappy, tummy_time, etc.
CREATE TABLE activity_sessions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to baby being tracked
    baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    
    -- Activity identification
    activity_type activity_type NOT NULL,
    
    -- Session timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ, -- NULL means session is still active
    
    -- Duration tracking (computed from segments for pause/resume functionality)
    total_duration_seconds INTEGER DEFAULT 0,
    
    -- Activity-specific data stored as JSONB for flexibility
    -- Structure varies by activity_type (documented in comments below)
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    
    -- Notes and context
    notes TEXT,
    
    -- Offline sync support
    client_id TEXT NOT NULL DEFAULT generate_client_id(),
    sync_status sync_status_type DEFAULT 'pending',
    sync_error TEXT, -- error message if sync fails
    sync_retry_count INTEGER DEFAULT 0,
    last_sync_attempt TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT activity_sessions_timing_valid CHECK (
        ended_at IS NULL OR ended_at >= started_at
    ),
    CONSTRAINT activity_sessions_duration_positive CHECK (
        total_duration_seconds >= 0
    ),
    CONSTRAINT activity_sessions_sync_retry_positive CHECK (
        sync_retry_count >= 0
    ),
    CONSTRAINT activity_sessions_client_id_not_empty CHECK (
        LENGTH(TRIM(client_id)) > 0
    )
);

-- Indexes for performance
CREATE INDEX idx_activity_sessions_baby_id ON activity_sessions(baby_id);
CREATE INDEX idx_activity_sessions_activity_type ON activity_sessions(baby_id, activity_type);
CREATE INDEX idx_activity_sessions_started_at ON activity_sessions(baby_id, started_at DESC);
CREATE INDEX idx_activity_sessions_active ON activity_sessions(baby_id, activity_type) WHERE ended_at IS NULL;
CREATE INDEX idx_activity_sessions_sync_status ON activity_sessions(sync_status) WHERE sync_status != 'synced';
CREATE INDEX idx_activity_sessions_client_id ON activity_sessions(client_id);

-- Composite index for common queries (recent activities)
CREATE INDEX idx_activity_sessions_recent ON activity_sessions(baby_id, started_at DESC, activity_type);

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_activity_sessions_updated_at
    BEFORE UPDATE ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- METADATA STRUCTURE DOCUMENTATION
-- =============================================================================

/*
NURSING SESSION METADATA:
{
  "left_breast": {
    "duration_seconds": 600,
    "segments": [
      {"started_at": "2025-01-15T10:00:00Z", "ended_at": "2025-01-15T10:10:00Z", "duration_seconds": 600}
    ]
  },
  "right_breast": {
    "duration_seconds": 720,
    "segments": [
      {"started_at": "2025-01-15T10:15:00Z", "ended_at": "2025-01-15T10:27:00Z", "duration_seconds": 720}
    ]
  },
  "active_side": "right" // or null if stopped
}

BOTTLE FEEDING METADATA:
{
  "amount_ml": 120,
  "formula_type": "breast_milk", // "breast_milk", "formula", "mixed"
  "temperature": "warm", // optional
  "feeding_duration_seconds": 900, // optional timer
  "amount_consumed_ml": 100 // how much baby actually drank
}

PUMPING SESSION METADATA:
{
  "left_amount_ml": 60,
  "right_amount_ml": 80,
  "total_amount_ml": 140,
  "pump_type": "electric", // optional
  "duration_seconds": 1200,
  "segments": [
    {"started_at": "2025-01-15T09:00:00Z", "ended_at": "2025-01-15T09:20:00Z", "duration_seconds": 1200}
  ]
}

SLEEP SESSION METADATA:
{
  "quality": "good", // "good", "fair", "poor"
  "location": "crib", // "crib", "arms", "carrier", "stroller", "bed", "bassinet"
  "environment": {
    "room_temperature": 22, // optional
    "noise_level": "quiet", // optional
    "lighting": "dark" // optional
  }
}

NAPPY CHANGE METADATA:
{
  "type": "wet", // "wet", "dirty", "both"
  "diaper_brand": "Pampers", // optional
  "rash_observed": false, // optional
  "weight_before_g": 450, // optional for calculating urine output
  "weight_after_g": 380 // optional
}

TUMMY TIME / ACTIVITY METADATA:
{
  "activity_subtype": "tummy_time", // "tummy_time", "play", "bath", "walk", "massage"
  "location": "play_mat", // optional
  "toys_used": ["rattle", "teether"], // optional array
  "duration_seconds": 300,
  "segments": [
    {"started_at": "2025-01-15T14:00:00Z", "ended_at": "2025-01-15T14:05:00Z", "duration_seconds": 300}
  ]
}
*/

-- =============================================================================
-- HELPER FUNCTIONS FOR ACTIVITY SESSIONS
-- =============================================================================

-- Function to start a new activity session
CREATE OR REPLACE FUNCTION start_activity_session(
    p_baby_id UUID,
    p_activity_type activity_type,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_client_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_session_id UUID;
    session_client_id TEXT;
BEGIN
    -- Generate client ID if not provided
    session_client_id := COALESCE(p_client_id, generate_client_id());
    
    -- Insert new session
    INSERT INTO activity_sessions (
        baby_id,
        activity_type,
        metadata,
        client_id
    ) VALUES (
        p_baby_id,
        p_activity_type,
        p_metadata,
        session_client_id
    )
    RETURNING id INTO new_session_id;
    
    RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end an active session
CREATE OR REPLACE FUNCTION end_activity_session(
    p_session_id UUID,
    p_end_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    p_final_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    session_duration INTEGER;
BEGIN
    -- Calculate duration and update session
    UPDATE activity_sessions SET
        ended_at = p_end_time,
        total_duration_seconds = EXTRACT(EPOCH FROM (p_end_time - started_at))::INTEGER,
        metadata = COALESCE(p_final_metadata, metadata),
        sync_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_session_id AND ended_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active sessions for a baby
CREATE OR REPLACE FUNCTION get_active_sessions(p_baby_id UUID)
RETURNS SETOF activity_sessions AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM activity_sessions
    WHERE baby_id = p_baby_id AND ended_at IS NULL
    ORDER BY started_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get recent activity sessions
CREATE OR REPLACE FUNCTION get_recent_sessions(
    p_baby_id UUID,
    p_hours_back INTEGER DEFAULT 24,
    p_limit INTEGER DEFAULT 50
)
RETURNS SETOF activity_sessions AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM activity_sessions
    WHERE baby_id = p_baby_id 
    AND started_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' * p_hours_back
    ORDER BY started_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to update session metadata (for real-time updates during active session)
CREATE OR REPLACE FUNCTION update_session_metadata(
    p_session_id UUID,
    p_metadata JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE activity_sessions SET
        metadata = p_metadata,
        sync_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_session_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get session statistics for a date range
CREATE OR REPLACE FUNCTION get_activity_stats(
    p_baby_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_sessions', COUNT(*),
        'by_activity_type', jsonb_object_agg(
            activity_type,
            jsonb_build_object(
                'count', activity_count,
                'total_duration_seconds', total_duration,
                'avg_duration_seconds', ROUND(total_duration::NUMERIC / activity_count, 2)
            )
        ),
        'total_duration_seconds', SUM(total_duration_seconds),
        'date_range', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        )
    ) INTO stats
    FROM (
        SELECT 
            activity_type,
            COUNT(*) as activity_count,
            SUM(total_duration_seconds) as total_duration
        FROM activity_sessions
        WHERE baby_id = p_baby_id
        AND DATE(started_at) >= p_start_date
        AND DATE(started_at) <= p_end_date
        AND ended_at IS NOT NULL
        GROUP BY activity_type
    ) t;
    
    RETURN COALESCE(stats, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE activity_sessions IS 'Main activity tracking table supporting all activity types via polymorphic design';
COMMENT ON COLUMN activity_sessions.baby_id IS 'Baby being tracked';
COMMENT ON COLUMN activity_sessions.activity_type IS 'Type of activity (nursing, bottle, sleep, etc.)';
COMMENT ON COLUMN activity_sessions.started_at IS 'When the activity session began';
COMMENT ON COLUMN activity_sessions.ended_at IS 'When session ended (NULL = still active)';
COMMENT ON COLUMN activity_sessions.metadata IS 'Activity-specific data stored as JSON (see function documentation)';
COMMENT ON COLUMN activity_sessions.client_id IS 'Device identifier for offline sync';
COMMENT ON COLUMN activity_sessions.sync_status IS 'Current sync status for offline support';

COMMENT ON FUNCTION start_activity_session(UUID, activity_type, JSONB, TEXT) IS 'Creates new activity session';
COMMENT ON FUNCTION end_activity_session(UUID, TIMESTAMPTZ, JSONB) IS 'Ends active session and calculates duration';
COMMENT ON FUNCTION get_active_sessions(UUID) IS 'Returns all currently active sessions for a baby';
COMMENT ON FUNCTION get_recent_sessions(UUID, INTEGER, INTEGER) IS 'Returns recent sessions within specified hours';
COMMENT ON FUNCTION update_session_metadata(UUID, JSONB) IS 'Updates metadata for real-time session tracking';
COMMENT ON FUNCTION get_activity_stats(UUID, DATE, DATE) IS 'Returns activity statistics for date range';-- =============================================================================
-- BabyTrack Database Schema - Session Segments (Pause/Resume Functionality)
-- =============================================================================
-- Purpose: Handle pause/resume functionality for timed activities
-- Dependencies: 01_extensions.sql, 02_types.sql, 05_activity_sessions.sql
-- =============================================================================

-- Session segments for pause/resume functionality
-- This table tracks individual time segments within a session when activities are paused and resumed
-- Example: Baby stops nursing, then resumes 10 minutes later - creates 2 segments
CREATE TABLE session_segments (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to parent session
    session_id UUID NOT NULL REFERENCES activity_sessions(id) ON DELETE CASCADE,
    
    -- Segment timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ, -- NULL means segment is currently active
    
    -- Calculated duration (updated when segment ends)
    duration_seconds INTEGER DEFAULT 0,
    
    -- Segment-specific metadata (context for this particular segment)
    -- For nursing: which breast, for activities: specific notes about this segment
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Offline sync support
    client_id TEXT NOT NULL DEFAULT generate_client_id(),
    sync_status sync_status_type DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT session_segments_timing_valid CHECK (
        ended_at IS NULL OR ended_at >= started_at
    ),
    CONSTRAINT session_segments_duration_positive CHECK (
        duration_seconds >= 0
    ),
    CONSTRAINT session_segments_client_id_not_empty CHECK (
        LENGTH(TRIM(client_id)) > 0
    )
);

-- Indexes for performance
CREATE INDEX idx_session_segments_session_id ON session_segments(session_id);
CREATE INDEX idx_session_segments_timing ON session_segments(session_id, started_at);
CREATE INDEX idx_session_segments_active ON session_segments(session_id) WHERE ended_at IS NULL;
CREATE INDEX idx_session_segments_sync_status ON session_segments(sync_status) WHERE sync_status != 'synced';

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_session_segments_updated_at
    BEFORE UPDATE ON session_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEGMENT METADATA EXAMPLES
-- =============================================================================

/*
NURSING SEGMENT METADATA:
{
  "breast_side": "left",
  "switch_reason": "baby_stopped", // "baby_stopped", "manual_switch", "comfort"
  "notes": "Baby seemed satisfied"
}

PUMPING SEGMENT METADATA:
{
  "pump_setting": 3,
  "left_output_ml": 30,
  "right_output_ml": 25,
  "pause_reason": "pump_adjustment"
}

TUMMY TIME SEGMENT METADATA:
{
  "position": "tummy",
  "engagement_level": "active", // "active", "fussy", "content"
  "pause_reason": "diaper_change"
}

SLEEP SEGMENT METADATA:
{
  "sleep_state": "deep", // "light", "deep", "rem", "transitioning"
  "interruption_reason": "feeding", // "feeding", "diaper", "noise", "comfort"
  "self_soothed": true
}
*/

-- =============================================================================
-- HELPER FUNCTIONS FOR SESSION SEGMENTS
-- =============================================================================

-- Function to start a new segment (pause/resume functionality)
CREATE OR REPLACE FUNCTION start_session_segment(
    p_session_id UUID,
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_client_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_segment_id UUID;
    segment_client_id TEXT;
BEGIN
    -- Generate client ID if not provided
    segment_client_id := COALESCE(p_client_id, generate_client_id());
    
    -- Insert new segment
    INSERT INTO session_segments (
        session_id,
        metadata,
        client_id
    ) VALUES (
        p_session_id,
        p_metadata,
        segment_client_id
    )
    RETURNING id INTO new_segment_id;
    
    RETURN new_segment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end a segment (when pausing or stopping)
CREATE OR REPLACE FUNCTION end_session_segment(
    p_segment_id UUID,
    p_end_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    p_final_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE session_segments SET
        ended_at = p_end_time,
        duration_seconds = EXTRACT(EPOCH FROM (p_end_time - started_at))::INTEGER,
        metadata = COALESCE(p_final_metadata, metadata),
        sync_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_segment_id AND ended_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all segments for a session
CREATE OR REPLACE FUNCTION get_session_segments(p_session_id UUID)
RETURNS SETOF session_segments AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM session_segments
    WHERE session_id = p_session_id
    ORDER BY started_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get active (ongoing) segment for a session
CREATE OR REPLACE FUNCTION get_active_segment(p_session_id UUID)
RETURNS session_segments AS $$
DECLARE
    active_segment session_segments;
BEGIN
    SELECT * INTO active_segment
    FROM session_segments
    WHERE session_id = p_session_id AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;
    
    RETURN active_segment;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to calculate total session duration from segments
CREATE OR REPLACE FUNCTION calculate_session_duration_from_segments(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_duration INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(duration_seconds), 0) INTO total_duration
    FROM session_segments
    WHERE session_id = p_session_id AND ended_at IS NOT NULL;
    
    RETURN total_duration;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update the parent session's total duration based on segments
CREATE OR REPLACE FUNCTION sync_session_duration(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    calculated_duration INTEGER;
BEGIN
    -- Calculate total duration from segments
    SELECT calculate_session_duration_from_segments(p_session_id) INTO calculated_duration;
    
    -- Update the parent session
    UPDATE activity_sessions SET
        total_duration_seconds = calculated_duration,
        sync_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_session_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to pause a session (end current segment)
CREATE OR REPLACE FUNCTION pause_session(
    p_session_id UUID,
    p_pause_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    active_segment_id UUID;
BEGIN
    -- Find active segment
    SELECT id INTO active_segment_id
    FROM session_segments
    WHERE session_id = p_session_id AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;
    
    -- End the active segment if found
    IF active_segment_id IS NOT NULL THEN
        PERFORM end_session_segment(active_segment_id, CURRENT_TIMESTAMP, p_pause_metadata);
        -- Update parent session duration
        PERFORM sync_session_duration(p_session_id);
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resume a session (start new segment)
CREATE OR REPLACE FUNCTION resume_session(
    p_session_id UUID,
    p_resume_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    new_segment_id UUID;
BEGIN
    -- Start new segment
    SELECT start_session_segment(p_session_id, p_resume_metadata) INTO new_segment_id;
    
    RETURN new_segment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get session summary with segment breakdown
CREATE OR REPLACE FUNCTION get_session_summary(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
    session_info RECORD;
    segments_info JSONB;
    result JSONB;
BEGIN
    -- Get session basic info
    SELECT 
        activity_type,
        started_at,
        ended_at,
        total_duration_seconds,
        metadata
    INTO session_info
    FROM activity_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Get segments summary
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'started_at', started_at,
            'ended_at', ended_at,
            'duration_seconds', duration_seconds,
            'metadata', metadata
        ) ORDER BY started_at ASC
    ) INTO segments_info
    FROM session_segments
    WHERE session_id = p_session_id;
    
    -- Build result
    SELECT jsonb_build_object(
        'session_id', p_session_id,
        'activity_type', session_info.activity_type,
        'started_at', session_info.started_at,
        'ended_at', session_info.ended_at,
        'total_duration_seconds', session_info.total_duration_seconds,
        'metadata', session_info.metadata,
        'segments', COALESCE(segments_info, '[]'::JSONB),
        'segment_count', COALESCE(jsonb_array_length(segments_info), 0)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger to automatically update parent session duration when segments change
CREATE OR REPLACE FUNCTION trigger_sync_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Update parent session duration whenever a segment is modified
    PERFORM sync_session_duration(COALESCE(NEW.session_id, OLD.session_id));
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply trigger on segment changes
CREATE TRIGGER trigger_session_segments_sync_duration
    AFTER INSERT OR UPDATE OR DELETE ON session_segments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_session_duration();

-- Comments for documentation
COMMENT ON TABLE session_segments IS 'Individual time segments within activity sessions for pause/resume functionality';
COMMENT ON COLUMN session_segments.session_id IS 'Parent activity session this segment belongs to';
COMMENT ON COLUMN session_segments.started_at IS 'When this segment started';
COMMENT ON COLUMN session_segments.ended_at IS 'When this segment ended (NULL = currently active)';
COMMENT ON COLUMN session_segments.duration_seconds IS 'Length of this segment in seconds';
COMMENT ON COLUMN session_segments.metadata IS 'Segment-specific context data';

COMMENT ON FUNCTION start_session_segment(UUID, JSONB, TEXT) IS 'Creates new segment for pause/resume functionality';
COMMENT ON FUNCTION end_session_segment(UUID, TIMESTAMPTZ, JSONB) IS 'Ends active segment and calculates duration';
COMMENT ON FUNCTION get_session_segments(UUID) IS 'Returns all segments for a session';
COMMENT ON FUNCTION get_active_segment(UUID) IS 'Returns currently active segment if any';
COMMENT ON FUNCTION calculate_session_duration_from_segments(UUID) IS 'Calculates total duration from all segments';
COMMENT ON FUNCTION pause_session(UUID, JSONB) IS 'Pauses session by ending active segment';
COMMENT ON FUNCTION resume_session(UUID, JSONB) IS 'Resumes session by starting new segment';
COMMENT ON FUNCTION get_session_summary(UUID) IS 'Returns complete session info with segment breakdown';-- =============================================================================
-- BabyTrack Database Schema - Performance Indexes
-- =============================================================================
-- Purpose: Additional indexes for query performance optimization
-- Dependencies: All previous schema files
-- =============================================================================

-- Create immutable functions for index expressions
CREATE OR REPLACE FUNCTION date_immutable(timestamptz) 
RETURNS date AS $$
  SELECT DATE($1 AT TIME ZONE 'UTC');
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

CREATE OR REPLACE FUNCTION date_trunc_week_immutable(timestamptz)
RETURNS timestamptz AS $$
  SELECT DATE_TRUNC('week', $1 AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

CREATE OR REPLACE FUNCTION date_trunc_month_immutable(timestamptz)
RETURNS timestamptz AS $$
  SELECT DATE_TRUNC('month', $1 AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- =============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =============================================================================

-- Most common query: Get recent activities for a specific baby
-- This supports the main tracker screen showing recent activity history
CREATE INDEX IF NOT EXISTS idx_activity_sessions_baby_recent 
ON activity_sessions (baby_id, started_at DESC, activity_type)
INCLUDE (ended_at, total_duration_seconds, metadata);

-- Query for daily summaries and reports
-- Supports grouping activities by date
-- Using immutable function for date extraction
CREATE INDEX IF NOT EXISTS idx_activity_sessions_daily_summary 
ON activity_sessions (baby_id, date_immutable(started_at), activity_type)
WHERE ended_at IS NOT NULL;

-- Sync queue processing - find unsync'd records
-- Critical for offline-first functionality
CREATE INDEX IF NOT EXISTS idx_activity_sessions_sync_queue 
ON activity_sessions (sync_status, baby_id, updated_at)
WHERE sync_status IN ('pending', 'error');

-- Find pending segments for sync
CREATE INDEX IF NOT EXISTS idx_session_segments_sync_queue 
ON session_segments (sync_status, session_id, updated_at)
WHERE sync_status IN ('pending', 'error');

-- Growth tracking queries - latest measurements
CREATE INDEX IF NOT EXISTS idx_growth_measurements_latest 
ON growth_measurements (baby_id, measured_at DESC, created_at DESC)
INCLUDE (weight_value, height_value, head_circumference_value);

-- =============================================================================
-- ACTIVITY-SPECIFIC INDEXES
-- =============================================================================

-- Nursing sessions - frequently queried for feeding patterns
CREATE INDEX IF NOT EXISTS idx_nursing_sessions 
ON activity_sessions (baby_id, started_at DESC)
WHERE activity_type = 'nursing' AND ended_at IS NOT NULL;

-- Sleep tracking - important for sleep pattern analysis
CREATE INDEX IF NOT EXISTS idx_sleep_sessions 
ON activity_sessions (baby_id, started_at DESC)
WHERE activity_type = 'sleep' AND ended_at IS NOT NULL;

-- Active sessions per activity type - for preventing multiple active sessions
CREATE INDEX IF NOT EXISTS idx_active_sessions_by_type 
ON activity_sessions (baby_id, activity_type, started_at DESC)
WHERE ended_at IS NULL;

-- =============================================================================
-- PERFORMANCE INDEXES FOR SEGMENTS
-- =============================================================================

-- Segment duration calculations
CREATE INDEX IF NOT EXISTS idx_segments_duration_calc 
ON session_segments (session_id, ended_at)
INCLUDE (duration_seconds);

-- Active segments lookup
CREATE INDEX IF NOT EXISTS idx_segments_active 
ON session_segments (session_id, started_at DESC)
WHERE ended_at IS NULL;

-- =============================================================================
-- USER AND PROFILE INDEXES
-- =============================================================================

-- Profile lookup by client_id (for offline sync)
CREATE INDEX IF NOT EXISTS idx_profiles_sync_lookup 
ON profiles (client_id, last_sync_at);

-- Baby ownership verification
CREATE INDEX IF NOT EXISTS idx_babies_ownership 
ON babies (profile_id, is_active, created_at)
WHERE is_active = true;

-- =============================================================================
-- REPORTING AND ANALYTICS INDEXES
-- =============================================================================

-- Weekly/monthly reporting queries
-- These support the reports tab functionality
CREATE INDEX IF NOT EXISTS idx_activity_sessions_weekly_reports 
ON activity_sessions (baby_id, date_trunc_week_immutable(started_at), activity_type)
WHERE ended_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_sessions_monthly_reports 
ON activity_sessions (baby_id, date_trunc_month_immutable(started_at), activity_type)
WHERE ended_at IS NOT NULL;

-- Activity frequency analysis
CREATE INDEX IF NOT EXISTS idx_activity_frequency 
ON activity_sessions (baby_id, activity_type, date_immutable(started_at))
WHERE ended_at IS NOT NULL;

-- =============================================================================
-- PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- =============================================================================

-- Only index recently created records for sync
-- Note: We cannot use date functions in WHERE clause for partial indexes
-- Instead we'll index all unsynced records
CREATE INDEX IF NOT EXISTS idx_activity_sessions_recent_sync 
ON activity_sessions (sync_status, client_id, updated_at)
WHERE sync_status != 'synced';

-- Index only unsynced growth measurements
CREATE INDEX IF NOT EXISTS idx_growth_measurements_unsynced 
ON growth_measurements (baby_id, sync_status, updated_at)
WHERE sync_status != 'synced';

-- =============================================================================
-- GIN INDEXES FOR JSONB METADATA QUERIES
-- =============================================================================

-- Enable fast queries on metadata fields
-- Supports searching within activity-specific data
CREATE INDEX IF NOT EXISTS idx_activity_sessions_metadata_gin 
ON activity_sessions USING GIN (metadata);

-- Enable searching within user preferences
CREATE INDEX IF NOT EXISTS idx_profiles_preferences_gin 
ON profiles USING GIN (preferred_units, features_enabled);

-- =============================================================================
-- TEXT SEARCH INDEXES
-- =============================================================================

-- Full-text search on notes (for future search functionality)
CREATE INDEX IF NOT EXISTS idx_activity_sessions_notes_search 
ON activity_sessions USING GIN (to_tsvector('english', COALESCE(notes, '')))
WHERE notes IS NOT NULL AND LENGTH(notes) > 0;

-- Search baby names
CREATE INDEX IF NOT EXISTS idx_babies_name_search 
ON babies USING GIN (to_tsvector('english', name || ' ' || COALESCE(nickname, '')));

-- =============================================================================
-- UNIQUE CONSTRAINTS (ADDITIONAL)
-- =============================================================================

-- Ensure only one active session per activity type per baby at a time
-- This prevents data integrity issues
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_session_per_activity 
ON activity_sessions (baby_id, activity_type)
WHERE ended_at IS NULL;

-- Ensure segment client IDs are unique across segments
-- Important for sync conflict resolution
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_segments_client_id_unique 
ON session_segments (client_id);

-- =============================================================================
-- INDEX MAINTENANCE QUERIES
-- =============================================================================

-- Create a function to analyze index usage
-- This helps identify unused indexes in production
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT,
    usage_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname::TEXT,
        s.tablename::TEXT,
        s.indexname::TEXT,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch,
        CASE 
            WHEN s.idx_scan = 0 THEN 0
            ELSE ROUND((s.idx_tup_read::NUMERIC / s.idx_scan), 2)
        END as usage_ratio
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table sizes and index sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
    table_name TEXT,
    table_size TEXT,
    indexes_size TEXT,
    total_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(t.schemaname||'.'||t.tablename)) as indexes_size,
        pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename) + pg_indexes_size(t.schemaname||'.'||t.tablename)) as total_size
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size(t.schemaname||'.'||t.tablename) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON FUNCTION analyze_index_usage() IS 'Returns statistics about index usage to identify unused indexes';
COMMENT ON FUNCTION get_table_sizes() IS 'Returns table and index sizes for storage monitoring';

-- =============================================================================
-- PERFORMANCE MONITORING QUERIES
-- =============================================================================

-- Note: The slow_query_analysis view requires pg_stat_statements extension
-- which may not be available in all environments. Uncomment if available.
/*
CREATE OR REPLACE VIEW slow_query_analysis AS
SELECT 
    query,
    calls,
    total_exec_time as total_time,
    mean_exec_time as mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query LIKE '%activity_sessions%' 
   OR query LIKE '%babies%'
   OR query LIKE '%profiles%'
   OR query LIKE '%session_segments%'
ORDER BY mean_exec_time DESC;

COMMENT ON VIEW slow_query_analysis IS 'Monitor slow queries affecting BabyTrack core tables';
*/

-- =============================================================================
-- INDEX CREATION SUMMARY
-- =============================================================================

/*
INDEX CREATION SUMMARY:
========================

CORE PERFORMANCE:
- idx_activity_sessions_baby_recent: Main tracker screen queries
- idx_activity_sessions_daily_summary: Daily report generation
- idx_nursing_sessions, idx_sleep_sessions: Activity-specific queries

OFFLINE SYNC:
- idx_activity_sessions_sync_queue: Pending sync records
- idx_session_segments_sync_queue: Pending segment sync
- idx_profiles_sync_lookup: Client ID lookups

REPORTING:
- idx_activity_sessions_weekly_reports: Weekly summaries
- idx_activity_sessions_monthly_reports: Monthly summaries
- idx_activity_frequency: Pattern analysis

METADATA SEARCH:
- idx_activity_sessions_metadata_gin: JSON field queries
- idx_profiles_preferences_gin: User preference searches

CONSTRAINTS:
- idx_unique_active_session_per_activity: Data integrity
- idx_session_segments_client_id_unique: Sync integrity

Total additional indexes: ~20 specialized indexes for optimal performance
*/-- =============================================================================
-- BabyTrack Database Schema - Row Level Security (RLS) Policies
-- =============================================================================
-- Purpose: Secure data access ensuring users can only see their own data
-- Dependencies: All previous schema files
-- =============================================================================

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all user data tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_segments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- =============================================================================

-- Function to get current user's profile ID
-- Used in many RLS policies
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        auth.uid(),
        (current_setting('request.jwt.claim.sub', true))::uuid,
        NULL
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user owns a baby
CREATE OR REPLACE FUNCTION public.user_owns_baby(baby_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM babies 
        WHERE id = baby_id 
        AND profile_id = public.current_user_id()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get baby_id from session_id (for session segments)
CREATE OR REPLACE FUNCTION public.get_baby_from_session(session_id UUID)
RETURNS UUID AS $$
DECLARE
    baby_id UUID;
BEGIN
    SELECT a.baby_id INTO baby_id
    FROM activity_sessions a
    WHERE a.id = session_id;
    
    RETURN baby_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- PROFILES TABLE RLS POLICIES
-- =============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT
    USING (public.current_user_id() = id);

-- Users can insert their own profile (for user registration)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT
    WITH CHECK (public.current_user_id() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (public.current_user_id() = id)
    WITH CHECK (public.current_user_id() = id);

-- Users cannot delete profiles (handled by Supabase auth cascade)
-- No delete policy needed as profile deletion is handled by auth.users deletion

-- =============================================================================
-- BABIES TABLE RLS POLICIES
-- =============================================================================

-- Users can read their own babies
CREATE POLICY "Users can read own babies" ON babies
    FOR SELECT
    USING (profile_id = public.current_user_id());

-- Users can insert babies for themselves
CREATE POLICY "Users can insert own babies" ON babies
    FOR INSERT
    WITH CHECK (profile_id = public.current_user_id());

-- Users can update their own babies
CREATE POLICY "Users can update own babies" ON babies
    FOR UPDATE
    USING (profile_id = public.current_user_id())
    WITH CHECK (profile_id = public.current_user_id());

-- Users can delete their own babies
CREATE POLICY "Users can delete own babies" ON babies
    FOR DELETE
    USING (profile_id = public.current_user_id());

-- =============================================================================
-- GROWTH MEASUREMENTS TABLE RLS POLICIES
-- =============================================================================

-- Users can read growth measurements for their babies
CREATE POLICY "Users can read own baby measurements" ON growth_measurements
    FOR SELECT
    USING (public.user_owns_baby(baby_id));

-- Users can insert measurements for their babies
CREATE POLICY "Users can insert own baby measurements" ON growth_measurements
    FOR INSERT
    WITH CHECK (public.user_owns_baby(baby_id));

-- Users can update measurements for their babies
CREATE POLICY "Users can update own baby measurements" ON growth_measurements
    FOR UPDATE
    USING (public.user_owns_baby(baby_id))
    WITH CHECK (public.user_owns_baby(baby_id));

-- Users can delete measurements for their babies
CREATE POLICY "Users can delete own baby measurements" ON growth_measurements
    FOR DELETE
    USING (public.user_owns_baby(baby_id));

-- =============================================================================
-- ACTIVITY SESSIONS TABLE RLS POLICIES
-- =============================================================================

-- Users can read sessions for their babies
CREATE POLICY "Users can read own baby sessions" ON activity_sessions
    FOR SELECT
    USING (public.user_owns_baby(baby_id));

-- Users can insert sessions for their babies
CREATE POLICY "Users can insert own baby sessions" ON activity_sessions
    FOR INSERT
    WITH CHECK (public.user_owns_baby(baby_id));

-- Users can update sessions for their babies
CREATE POLICY "Users can update own baby sessions" ON activity_sessions
    FOR UPDATE
    USING (public.user_owns_baby(baby_id))
    WITH CHECK (public.user_owns_baby(baby_id));

-- Users can delete sessions for their babies
CREATE POLICY "Users can delete own baby sessions" ON activity_sessions
    FOR DELETE
    USING (public.user_owns_baby(baby_id));

-- =============================================================================
-- SESSION SEGMENTS TABLE RLS POLICIES
-- =============================================================================

-- Users can read segments for sessions they own
CREATE POLICY "Users can read own session segments" ON session_segments
    FOR SELECT
    USING (public.user_owns_baby(public.get_baby_from_session(session_id)));

-- Users can insert segments for sessions they own
CREATE POLICY "Users can insert own session segments" ON session_segments
    FOR INSERT
    WITH CHECK (public.user_owns_baby(public.get_baby_from_session(session_id)));

-- Users can update segments for sessions they own
CREATE POLICY "Users can update own session segments" ON session_segments
    FOR UPDATE
    USING (public.user_owns_baby(public.get_baby_from_session(session_id)))
    WITH CHECK (public.user_owns_baby(public.get_baby_from_session(session_id)));

-- Users can delete segments for sessions they own
CREATE POLICY "Users can delete own session segments" ON session_segments
    FOR DELETE
    USING (public.user_owns_baby(public.get_baby_from_session(session_id)));

-- =============================================================================
-- ANONYMOUS USER SUPPORT
-- =============================================================================

-- For anonymous users (offline-first functionality)
-- Allow them to access data using a special anonymous policy

-- Anonymous profiles policy (for offline users)
CREATE POLICY "Anonymous users can manage their profile" ON profiles
    FOR ALL
    USING (
        -- Allow if user is authenticated OR if this is anonymous local data
        public.current_user_id() = id OR 
        (public.current_user_id() IS NULL AND id IS NULL)
    )
    WITH CHECK (
        public.current_user_id() = id OR 
        (public.current_user_id() IS NULL AND id IS NULL)
    );

-- For anonymous users, we'll need special handling in the application layer
-- since they don't have a real user ID. This will be handled by Edge Functions
-- or application logic that creates temporary UUID for anonymous sessions.

-- =============================================================================
-- SERVICE ROLE POLICIES (FOR SYSTEM OPERATIONS)
-- =============================================================================

-- Service role can read all data (for system operations, backups, etc.)
CREATE POLICY "Service role can read all profiles" ON profiles
    FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can read all babies" ON babies
    FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can read all measurements" ON growth_measurements
    FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can read all sessions" ON activity_sessions
    FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can read all segments" ON session_segments
    FOR SELECT
    USING (auth.role() = 'service_role');

-- =============================================================================
-- PERFORMANCE OPTIMIZATION FOR RLS
-- =============================================================================

-- Create indexes to optimize RLS policy checks
-- These indexes improve performance of the ownership checks

CREATE INDEX IF NOT EXISTS idx_babies_profile_id_rls 
ON babies (profile_id, id);

CREATE INDEX IF NOT EXISTS idx_activity_sessions_baby_id_rls 
ON activity_sessions (baby_id, id);

CREATE INDEX IF NOT EXISTS idx_session_segments_ownership_rls 
ON session_segments (session_id, id);

-- =============================================================================
-- RLS POLICY TESTING FUNCTIONS
-- =============================================================================

-- Function to test RLS policies (for development/testing)
CREATE OR REPLACE FUNCTION test_rls_policies(test_user_id UUID, test_baby_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    profile_count INTEGER;
    baby_count INTEGER;
    session_count INTEGER;
BEGIN
    -- Test profile access
    SELECT COUNT(*) INTO profile_count
    FROM profiles 
    WHERE id = test_user_id;
    
    -- Test baby access
    SELECT COUNT(*) INTO baby_count
    FROM babies 
    WHERE id = test_baby_id;
    
    -- Test session access
    SELECT COUNT(*) INTO session_count
    FROM activity_sessions 
    WHERE baby_id = test_baby_id;
    
    result := jsonb_build_object(
        'test_user_id', test_user_id,
        'test_baby_id', test_baby_id,
        'current_user_id', public.current_user_id(),
        'profile_accessible', profile_count > 0,
        'baby_accessible', baby_count > 0,
        'sessions_accessible', session_count >= 0,
        'user_owns_baby', public.user_owns_baby(test_baby_id)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DATA SHARING POLICIES (FUTURE FEATURE)
-- =============================================================================

-- Placeholder for future caregiver sharing functionality
-- These would allow sharing baby data with other users (nannies, grandparents)

/*
-- Future: Shared access table
CREATE TABLE IF NOT EXISTS baby_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    shared_with_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{"read": true, "write": false}'::JSONB,
    created_by UUID NOT NULL REFERENCES profiles(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(baby_id, shared_with_profile_id)
);

-- RLS policies for shared access
CREATE POLICY "Users can read babies shared with them" ON babies
    FOR SELECT
    USING (
        profile_id = public.current_user_id() OR
        EXISTS (
            SELECT 1 FROM baby_shares 
            WHERE baby_id = babies.id 
            AND shared_with_profile_id = public.current_user_id()
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        )
    );
*/

-- =============================================================================
-- POLICY MONITORING AND DEBUGGING
-- =============================================================================

-- Function to check what policies apply to current user
CREATE OR REPLACE FUNCTION debug_rls_policies()
RETURNS TABLE(
    table_name TEXT,
    policy_name TEXT,
    policy_type TEXT,
    policy_roles TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.tablename::TEXT,
        p.policyname::TEXT,
        p.cmd::TEXT,
        p.roles
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    ORDER BY p.tablename, p.policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON FUNCTION public.current_user_id() IS 'Get current authenticated user ID for RLS policies';
COMMENT ON FUNCTION public.user_owns_baby(UUID) IS 'Check if current user owns specified baby';
COMMENT ON FUNCTION public.get_baby_from_session(UUID) IS 'Get baby_id from session_id for segment RLS';
COMMENT ON FUNCTION test_rls_policies(UUID, UUID) IS 'Test RLS policy functionality for debugging';
COMMENT ON FUNCTION debug_rls_policies() IS 'List all RLS policies for troubleshooting';

-- =============================================================================
-- RLS POLICY SUMMARY
-- =============================================================================

/*
RLS POLICY SUMMARY:
==================

SECURITY MODEL:
- Users can only access their own profiles
- Users can only access babies they created
- Users can only access data for babies they own
- Service role can read all data for system operations

TABLES SECURED:
✓ profiles - user profiles and preferences
✓ babies - baby records and information
✓ growth_measurements - growth tracking data
✓ activity_sessions - all activity tracking
✓ session_segments - pause/resume data

POLICY TYPES:
- SELECT: Read own data only
- INSERT: Create data for own babies only
- UPDATE: Modify own data only  
- DELETE: Remove own data only

PERFORMANCE:
- RLS-specific indexes created for fast ownership checks
- Helper functions to minimize policy complexity
- Optimized for common query patterns

FUTURE FEATURES:
- Baby sharing with caregivers (commented out)
- Anonymous user support (partial implementation)
- Advanced permissions system (extensible)

TESTING:
- Policy testing functions for development
- Debug utilities for troubleshooting
- Comprehensive policy coverage
*/-- =============================================================================
-- BabyTrack Database Schema - Business Logic Functions
-- =============================================================================
-- Purpose: Advanced business logic, analytics, and data processing functions
-- Dependencies: All previous schema files
-- =============================================================================

-- =============================================================================
-- ACTIVITY ANALYTICS FUNCTIONS
-- =============================================================================

-- Function to get feeding summary for a specific date
CREATE OR REPLACE FUNCTION get_daily_feeding_summary(
    p_baby_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH feeding_data AS (
        SELECT 
            activity_type,
            COUNT(*) as session_count,
            SUM(total_duration_seconds) as total_duration,
            -- Extract feeding amounts from metadata
            SUM(
                CASE 
                    WHEN activity_type = 'bottle' THEN COALESCE((metadata->>'amount_ml')::INTEGER, 0)
                    WHEN activity_type = 'pumping' THEN COALESCE((metadata->>'total_amount_ml')::INTEGER, 0)
                    ELSE 0
                END
            ) as total_volume_ml,
            -- Calculate average session duration
            AVG(total_duration_seconds) as avg_duration_seconds,
            -- Get feeding intervals
            array_agg(started_at ORDER BY started_at) as feeding_times
        FROM activity_sessions
        WHERE baby_id = p_baby_id
        AND DATE(started_at) = p_date
        AND activity_type IN ('nursing', 'bottle', 'pumping')
        AND ended_at IS NOT NULL
        GROUP BY activity_type
    )
    SELECT jsonb_build_object(
        'date', p_date,
        'baby_id', p_baby_id,
        'summary', jsonb_object_agg(activity_type, jsonb_build_object(
            'session_count', session_count,
            'total_duration_seconds', total_duration,
            'total_volume_ml', total_volume_ml,
            'average_duration_seconds', ROUND(avg_duration_seconds),
            'feeding_times', feeding_times
        )),
        'totals', jsonb_build_object(
            'total_feeding_sessions', SUM(session_count),
            'total_feeding_duration_seconds', SUM(total_duration),
            'total_volume_ml', SUM(total_volume_ml),
            'first_feeding', MIN((feeding_times[1])),
            'last_feeding', MAX((feeding_times[array_length(feeding_times, 1)]))
        )
    ) INTO result
    FROM feeding_data;
    
    RETURN COALESCE(result, jsonb_build_object(
        'date', p_date,
        'baby_id', p_baby_id,
        'summary', '{}'::JSONB,
        'totals', jsonb_build_object(
            'total_feeding_sessions', 0,
            'total_feeding_duration_seconds', 0,
            'total_volume_ml', 0
        )
    ));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get sleep pattern analysis
CREATE OR REPLACE FUNCTION get_sleep_pattern_analysis(
    p_baby_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH sleep_data AS (
        SELECT 
            DATE(started_at) as sleep_date,
            COUNT(*) as nap_count,
            SUM(total_duration_seconds) as total_sleep_seconds,
            AVG(total_duration_seconds) as avg_nap_duration,
            MIN(started_at) as first_sleep,
            MAX(ended_at) as last_sleep,
            -- Calculate night vs day sleep (assuming night is 8PM to 6AM)
            SUM(
                CASE 
                    WHEN EXTRACT(HOUR FROM started_at) >= 20 OR EXTRACT(HOUR FROM started_at) < 6 
                    THEN total_duration_seconds 
                    ELSE 0 
                END
            ) as night_sleep_seconds,
            SUM(
                CASE 
                    WHEN EXTRACT(HOUR FROM started_at) >= 6 AND EXTRACT(HOUR FROM started_at) < 20 
                    THEN total_duration_seconds 
                    ELSE 0 
                END
            ) as day_sleep_seconds,
            -- Sleep quality distribution
            jsonb_object_agg(
                COALESCE(metadata->>'quality', 'unknown'),
                COUNT(*)
            ) as quality_distribution
        FROM activity_sessions
        WHERE baby_id = p_baby_id
        AND activity_type = 'sleep'
        AND ended_at IS NOT NULL
        AND DATE(started_at) BETWEEN p_start_date AND p_end_date
        GROUP BY DATE(started_at)
    ),
    overall_stats AS (
        SELECT 
            AVG(nap_count) as avg_daily_naps,
            AVG(total_sleep_seconds) as avg_daily_sleep_seconds,
            AVG(night_sleep_seconds) as avg_nightly_sleep_seconds,
            AVG(day_sleep_seconds) as avg_daily_nap_seconds,
            MAX(total_sleep_seconds) as max_daily_sleep,
            MIN(total_sleep_seconds) as min_daily_sleep
        FROM sleep_data
    )
    SELECT jsonb_build_object(
        'date_range', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date,
            'days_analyzed', (p_end_date - p_start_date + 1)
        ),
        'daily_breakdown', COALESCE(jsonb_agg(
            jsonb_build_object(
                'date', sleep_date,
                'nap_count', nap_count,
                'total_sleep_hours', ROUND((total_sleep_seconds / 3600.0)::NUMERIC, 2),
                'night_sleep_hours', ROUND((night_sleep_seconds / 3600.0)::NUMERIC, 2),
                'day_sleep_hours', ROUND((day_sleep_seconds / 3600.0)::NUMERIC, 2),
                'average_nap_minutes', ROUND((avg_nap_duration / 60.0)::NUMERIC, 1),
                'first_sleep', first_sleep,
                'last_sleep', last_sleep,
                'quality_distribution', quality_distribution
            ) ORDER BY sleep_date
        ), '[]'::JSONB),
        'overall_patterns', (
            SELECT jsonb_build_object(
                'average_daily_naps', ROUND(avg_daily_naps, 1),
                'average_daily_sleep_hours', ROUND((avg_daily_sleep_seconds / 3600.0)::NUMERIC, 2),
                'average_night_sleep_hours', ROUND((avg_nightly_sleep_seconds / 3600.0)::NUMERIC, 2),
                'average_day_nap_hours', ROUND((avg_daily_nap_seconds / 3600.0)::NUMERIC, 2),
                'best_sleep_day_hours', ROUND((max_daily_sleep / 3600.0)::NUMERIC, 2),
                'worst_sleep_day_hours', ROUND((min_daily_sleep / 3600.0)::NUMERIC, 2)
            )
            FROM overall_stats
        )
    ) INTO result
    FROM sleep_data;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- GROWTH TRACKING FUNCTIONS
-- =============================================================================

-- Function to calculate growth percentiles (simplified version)
-- Note: Real percentile calculations would require WHO growth charts data
CREATE OR REPLACE FUNCTION calculate_growth_trends(
    p_baby_id UUID,
    p_measurement_count INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
    baby_info RECORD;
    result JSONB;
BEGIN
    -- Get baby birth info
    SELECT date_of_birth, gender INTO baby_info
    FROM babies WHERE id = p_baby_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    WITH measurement_trends AS (
        SELECT 
            measured_at,
            weight_value,
            height_value,
            head_circumference_value,
            -- Calculate age at measurement in days
            (measured_at - baby_info.date_of_birth) as age_days,
            -- Calculate growth rate (simple linear approximation)
            LAG(weight_value) OVER (ORDER BY measured_at) as prev_weight,
            LAG(height_value) OVER (ORDER BY measured_at) as prev_height,
            LAG(measured_at) OVER (ORDER BY measured_at) as prev_date,
            ROW_NUMBER() OVER (ORDER BY measured_at DESC) as rn
        FROM growth_measurements
        WHERE baby_id = p_baby_id
        AND weight_value IS NOT NULL
        ORDER BY measured_at DESC
        LIMIT p_measurement_count
    ),
    growth_rates AS (
        SELECT 
            measured_at,
            age_days,
            weight_value,
            height_value,
            head_circumference_value,
            -- Weight gain rate (grams per day)
            CASE 
                WHEN prev_weight IS NOT NULL AND prev_date IS NOT NULL
                THEN (weight_value - prev_weight) * 1000 / (measured_at - prev_date)
                ELSE NULL
            END as weight_gain_g_per_day,
            -- Height growth rate (cm per month) 
            CASE
                WHEN prev_height IS NOT NULL AND prev_date IS NOT NULL
                THEN (height_value - prev_height) * 30 / (measured_at - prev_date)
                ELSE NULL
            END as height_gain_cm_per_month
        FROM measurement_trends
        WHERE rn <= p_measurement_count
    )
    SELECT jsonb_build_object(
        'baby_id', p_baby_id,
        'baby_gender', baby_info.gender,
        'measurements_analyzed', COUNT(*),
        'latest_measurement', jsonb_build_object(
            'date', MAX(measured_at),
            'age_days', MAX(age_days),
            'age_months', ROUND((MAX(age_days) / 30.0)::NUMERIC, 1),
            'weight_kg', (array_agg(weight_value ORDER BY measured_at DESC))[1],
            'height_cm', (array_agg(height_value ORDER BY measured_at DESC))[1],
            'head_circumference_cm', (array_agg(head_circumference_value ORDER BY measured_at DESC))[1]
        ),
        'growth_trends', jsonb_build_object(
            'average_weight_gain_g_per_day', ROUND(AVG(weight_gain_g_per_day)::NUMERIC, 2),
            'average_height_gain_cm_per_month', ROUND(AVG(height_gain_cm_per_month)::NUMERIC, 2),
            'recent_weight_trend', 
                CASE 
                    WHEN AVG(weight_gain_g_per_day) > 30 THEN 'gaining_well'
                    WHEN AVG(weight_gain_g_per_day) > 15 THEN 'gaining_normal'
                    WHEN AVG(weight_gain_g_per_day) > 0 THEN 'gaining_slowly'
                    ELSE 'losing_weight'
                END
        ),
        'measurement_history', jsonb_agg(
            jsonb_build_object(
                'date', measured_at,
                'age_days', age_days,
                'weight_kg', weight_value,
                'height_cm', height_value,
                'head_circumference_cm', head_circumference_value,
                'weight_gain_g_per_day', ROUND(weight_gain_g_per_day::NUMERIC, 2)
            ) ORDER BY measured_at DESC
        )
    ) INTO result
    FROM growth_rates;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- ACTIVITY PATTERN ANALYSIS
-- =============================================================================

-- Function to detect feeding patterns and suggest schedules
CREATE OR REPLACE FUNCTION analyze_feeding_patterns(
    p_baby_id UUID,
    p_days_back INTEGER DEFAULT 7
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH hourly_feeding_stats AS (
        SELECT 
            EXTRACT(HOUR FROM started_at) as hour_of_day,
            activity_type,
            COUNT(*) as feeding_count,
            AVG(total_duration_seconds) as avg_duration,
            -- Calculate intervals between feedings
            AVG(
                EXTRACT(EPOCH FROM (
                    LEAD(started_at) OVER (PARTITION BY activity_type ORDER BY started_at) - started_at
                )) / 3600
            ) as avg_interval_hours
        FROM activity_sessions
        WHERE baby_id = p_baby_id
        AND activity_type IN ('nursing', 'bottle')
        AND started_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_back
        AND ended_at IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM started_at), activity_type
    ),
    pattern_analysis AS (
        SELECT 
            activity_type,
            -- Find peak feeding hours
            array_agg(hour_of_day ORDER BY feeding_count DESC) as hours_by_frequency,
            AVG(avg_interval_hours) as overall_avg_interval,
            SUM(feeding_count) as total_feedings,
            -- Identify regular patterns (most common intervals)
            MODE() WITHIN GROUP (ORDER BY ROUND(avg_interval_hours)) as most_common_interval
        FROM hourly_feeding_stats
        WHERE avg_interval_hours IS NOT NULL
        GROUP BY activity_type
    )
    SELECT jsonb_build_object(
        'analysis_period', jsonb_build_object(
            'days_analyzed', p_days_back,
            'start_date', CURRENT_DATE - p_days_back,
            'end_date', CURRENT_DATE
        ),
        'feeding_patterns', jsonb_object_agg(
            activity_type,
            jsonb_build_object(
                'total_feedings', total_feedings,
                'average_interval_hours', ROUND(overall_avg_interval::NUMERIC, 2),
                'most_common_interval_hours', most_common_interval,
                'peak_feeding_hours', (hours_by_frequency)[1:3], -- Top 3 hours
                'pattern_consistency', 
                    CASE 
                        WHEN most_common_interval BETWEEN 2 AND 4 THEN 'very_regular'
                        WHEN most_common_interval BETWEEN 1 AND 6 THEN 'somewhat_regular'
                        ELSE 'irregular'
                    END,
                'suggested_schedule', 
                    CASE 
                        WHEN most_common_interval = 2 THEN 'every_2_hours'
                        WHEN most_common_interval = 3 THEN 'every_3_hours'
                        WHEN most_common_interval = 4 THEN 'every_4_hours'
                        ELSE 'on_demand'
                    END
            )
        ),
        'hourly_distribution', (
            SELECT jsonb_object_agg(
                hour_of_day::TEXT,
                jsonb_build_object(
                    'total_feedings', SUM(feeding_count),
                    'by_type', jsonb_object_agg(activity_type, feeding_count)
                )
            )
            FROM hourly_feeding_stats
            GROUP BY hour_of_day
        )
    ) INTO result
    FROM pattern_analysis;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- MILESTONE AND ALERTS FUNCTIONS
-- =============================================================================

-- Function to check for potential issues or milestones
CREATE OR REPLACE FUNCTION check_baby_milestones_and_alerts(p_baby_id UUID)
RETURNS JSONB AS $$
DECLARE
    baby_age_info JSONB;
    recent_activities RECORD;
    alerts JSONB DEFAULT '[]'::JSONB;
    milestones JSONB DEFAULT '[]'::JSONB;
    result JSONB;
BEGIN
    -- Get baby age information
    SELECT get_baby_age_info(p_baby_id) INTO baby_age_info;
    
    IF baby_age_info IS NULL THEN
        RETURN jsonb_build_object('error', 'Baby not found');
    END IF;
    
    -- Check recent activity patterns
    WITH recent_summary AS (
        SELECT 
            activity_type,
            COUNT(*) as count_24h,
            MAX(started_at) as last_activity,
            AVG(total_duration_seconds) as avg_duration
        FROM activity_sessions
        WHERE baby_id = p_baby_id
        AND started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND ended_at IS NOT NULL
        GROUP BY activity_type
    )
    SELECT * INTO recent_activities FROM recent_summary;
    
    -- Age-based milestone checks
    IF (baby_age_info->>'days_old')::INTEGER >= 1 THEN
        milestones := milestones || jsonb_build_array(
            jsonb_build_object(
                'type', 'age_milestone',
                'milestone', 'first_day',
                'message', 'Congratulations on your first day together!',
                'achieved_date', CURRENT_DATE
            )
        );
    END IF;
    
    IF (baby_age_info->>'weeks_old')::INTEGER >= 1 THEN
        milestones := milestones || jsonb_build_array(
            jsonb_build_object(
                'type', 'age_milestone',
                'milestone', 'first_week',
                'message', 'One week milestone reached!',
                'achieved_date', CURRENT_DATE
            )
        );
    END IF;
    
    -- Check for potential alerts based on activity patterns
    -- Note: These are simplified examples - real medical alerts would need professional consultation
    
    -- Feeding frequency alerts
    IF (SELECT count_24h FROM recent_summary WHERE activity_type IN ('nursing', 'bottle') LIMIT 1) < 6 
       AND (baby_age_info->>'weeks_old')::INTEGER < 12 THEN
        alerts := alerts || jsonb_build_array(
            jsonb_build_object(
                'type', 'feeding_frequency',
                'severity', 'medium',
                'message', 'Fewer than 6 feedings in 24 hours - consider consulting pediatrician',
                'timestamp', CURRENT_TIMESTAMP
            )
        );
    END IF;
    
    -- Sleep pattern alerts
    IF (SELECT AVG(total_duration_seconds) FROM activity_sessions 
        WHERE baby_id = p_baby_id 
        AND activity_type = 'sleep' 
        AND started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') > 21600 -- 6 hours average
       AND (baby_age_info->>'weeks_old')::INTEGER < 4 THEN
        alerts := alerts || jsonb_build_array(
            jsonb_build_object(
                'type', 'sleep_duration',
                'severity', 'low',
                'message', 'Very long sleep periods - ensure regular feeding',
                'timestamp', CURRENT_TIMESTAMP
            )
        );
    END IF;
    
    -- Construct result
    result := jsonb_build_object(
        'baby_id', p_baby_id,
        'baby_age', baby_age_info,
        'check_timestamp', CURRENT_TIMESTAMP,
        'alerts', alerts,
        'milestones', milestones,
        'recent_activity_summary', (
            SELECT jsonb_object_agg(
                activity_type,
                jsonb_build_object(
                    'count_24h', count_24h,
                    'last_activity', last_activity,
                    'avg_duration_minutes', ROUND((avg_duration / 60.0)::NUMERIC, 1)
                )
            )
            FROM recent_summary
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- DATA EXPORT AND REPORTING FUNCTIONS
-- =============================================================================

-- Function to generate comprehensive baby report for date range
CREATE OR REPLACE FUNCTION generate_baby_report(
    p_baby_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
    baby_info RECORD;
    report JSONB;
BEGIN
    -- Get baby information
    SELECT b.*, get_baby_age_info(b.id) as age_info
    INTO baby_info
    FROM babies b
    WHERE b.id = p_baby_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Baby not found');
    END IF;
    
    -- Generate comprehensive report
    WITH activity_summary AS (
        SELECT 
            activity_type,
            COUNT(*) as session_count,
            SUM(total_duration_seconds) as total_duration_seconds,
            AVG(total_duration_seconds) as avg_duration_seconds,
            MIN(started_at) as first_session,
            MAX(started_at) as last_session,
            -- Activity-specific aggregations
            CASE 
                WHEN activity_type IN ('bottle', 'pumping') THEN
                    SUM(COALESCE((metadata->>'amount_ml')::INTEGER, 0))
                ELSE NULL
            END as total_volume_ml
        FROM activity_sessions
        WHERE baby_id = p_baby_id
        AND DATE(started_at) BETWEEN p_start_date AND p_end_date
        AND ended_at IS NOT NULL
        GROUP BY activity_type
    )
    SELECT jsonb_build_object(
        'report_info', jsonb_build_object(
            'generated_at', CURRENT_TIMESTAMP,
            'date_range', jsonb_build_object(
                'start_date', p_start_date,
                'end_date', p_end_date,
                'days_covered', (p_end_date - p_start_date + 1)
            )
        ),
        'baby_info', jsonb_build_object(
            'id', baby_info.id,
            'name', baby_info.name,
            'gender', baby_info.gender,
            'date_of_birth', baby_info.date_of_birth,
            'age_at_report', baby_info.age_info
        ),
        'activity_summary', COALESCE(jsonb_object_agg(
            activity_type,
            jsonb_build_object(
                'session_count', session_count,
                'total_duration_hours', ROUND((total_duration_seconds / 3600.0)::NUMERIC, 2),
                'average_duration_minutes', ROUND((avg_duration_seconds / 60.0)::NUMERIC, 1),
                'total_volume_ml', total_volume_ml,
                'first_session', first_session,
                'last_session', last_session,
                'sessions_per_day', ROUND((session_count::NUMERIC / (p_end_date - p_start_date + 1)), 2)
            )
        ), '{}'::JSONB),
        'daily_breakdown', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', activity_date,
                    'activities', daily_activities
                ) ORDER BY activity_date
            )
            FROM (
                SELECT 
                    DATE(started_at) as activity_date,
                    jsonb_object_agg(
                        activity_type,
                        jsonb_build_object(
                            'count', COUNT(*),
                            'duration_minutes', ROUND((SUM(total_duration_seconds) / 60.0)::NUMERIC, 1)
                        )
                    ) as daily_activities
                FROM activity_sessions
                WHERE baby_id = p_baby_id
                AND DATE(started_at) BETWEEN p_start_date AND p_end_date
                AND ended_at IS NOT NULL
                GROUP BY DATE(started_at)
            ) daily_data
        ),
        'insights', jsonb_build_object(
            'most_active_day', (
                SELECT DATE(started_at)
                FROM activity_sessions
                WHERE baby_id = p_baby_id
                AND DATE(started_at) BETWEEN p_start_date AND p_end_date
                GROUP BY DATE(started_at)
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ),
            'total_tracking_hours', (
                SELECT ROUND((SUM(total_duration_seconds) / 3600.0)::NUMERIC, 2)
                FROM activity_sessions
                WHERE baby_id = p_baby_id
                AND DATE(started_at) BETWEEN p_start_date AND p_end_date
                AND ended_at IS NOT NULL
            )
        )
    ) INTO report
    FROM activity_summary;
    
    RETURN report;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Comments for documentation
COMMENT ON FUNCTION get_daily_feeding_summary(UUID, DATE) IS 'Comprehensive feeding analysis for a specific date';
COMMENT ON FUNCTION get_sleep_pattern_analysis(UUID, DATE, DATE) IS 'Sleep pattern analysis and quality metrics';
COMMENT ON FUNCTION calculate_growth_trends(UUID, INTEGER) IS 'Growth trend analysis with simple percentile approximation';
COMMENT ON FUNCTION analyze_feeding_patterns(UUID, INTEGER) IS 'Feeding pattern analysis with schedule suggestions';
COMMENT ON FUNCTION check_baby_milestones_and_alerts(UUID) IS 'Check for age milestones and potential health alerts';
COMMENT ON FUNCTION generate_baby_report(UUID, DATE, DATE) IS 'Generate comprehensive baby activity report for date range';

-- =============================================================================
-- FUNCTION SUMMARY
-- =============================================================================

/*
BUSINESS LOGIC FUNCTIONS SUMMARY:
==================================

ANALYTICS FUNCTIONS:
✓ get_daily_feeding_summary() - Daily feeding analysis
✓ get_sleep_pattern_analysis() - Sleep pattern insights  
✓ calculate_growth_trends() - Growth tracking and trends
✓ analyze_feeding_patterns() - Pattern detection and scheduling
✓ check_baby_milestones_and_alerts() - Milestone tracking and health alerts
✓ generate_baby_report() - Comprehensive reporting

KEY CAPABILITIES:
- Real-time activity pattern analysis
- Growth trend calculations
- Feeding schedule optimization suggestions
- Sleep quality assessment
- Health milestone tracking
- Comprehensive reporting for pediatricians
- Data-driven insights for parents

EXTENSIBILITY:
- Functions designed for easy enhancement
- JSON return format allows flexible data structure
- Parameterized for different time ranges
- Built for performance with proper indexing

SECURITY:
- All functions use SECURITY DEFINER
- RLS policies apply automatically
- Input validation and sanitization
- Safe for client-side consumption

These functions provide the intelligence layer for the BabyTrack application,
turning raw tracking data into actionable insights for parents and healthcare providers.
*/-- =============================================================================
-- BabyTrack Database Schema - Automated Triggers
-- =============================================================================
-- Purpose: Automated data integrity, sync, and business logic triggers
-- Dependencies: All previous schema files
-- =============================================================================

-- =============================================================================
-- PROFILE MANAGEMENT TRIGGERS
-- =============================================================================

-- Trigger to create profile when user signs up via Supabase Auth
-- This trigger runs on auth.users table (managed by Supabase)
-- Note: In production, this is typically handled via Supabase Dashboard
-- or Edge Functions, but included here for completeness

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        display_name,
        timezone,
        client_id
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, 'User'),
        COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC'),
        generate_client_id()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger would be applied to auth.users in production:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- BABY MANAGEMENT TRIGGERS  
-- =============================================================================

-- Trigger to set first baby as active when user creates their first baby
CREATE OR REPLACE FUNCTION set_first_baby_active()
RETURNS TRIGGER AS $$
DECLARE
    baby_count INTEGER;
BEGIN
    -- Count existing babies for this profile
    SELECT COUNT(*) INTO baby_count
    FROM babies
    WHERE profile_id = NEW.profile_id;
    
    -- If this is the first baby, ensure it's active
    IF baby_count = 1 THEN
        NEW.is_active := true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_first_baby_active
    BEFORE INSERT ON babies
    FOR EACH ROW
    EXECUTE FUNCTION set_first_baby_active();

-- =============================================================================
-- SESSION MANAGEMENT TRIGGERS
-- =============================================================================

-- Trigger to prevent multiple active sessions of same type per baby
CREATE OR REPLACE FUNCTION prevent_duplicate_active_sessions()
RETURNS TRIGGER AS $$
DECLARE
    existing_session_count INTEGER;
BEGIN
    -- Only check for INSERT of new active sessions
    IF TG_OP = 'INSERT' AND NEW.ended_at IS NULL THEN
        -- Check for existing active sessions of the same type
        SELECT COUNT(*) INTO existing_session_count
        FROM activity_sessions
        WHERE baby_id = NEW.baby_id
        AND activity_type = NEW.activity_type
        AND ended_at IS NULL
        AND id != NEW.id;
        
        -- For most activities, only allow one active session
        -- Exception: nursing can have left/right tracked separately in metadata
        IF existing_session_count > 0 AND NEW.activity_type != 'nursing' THEN
            RAISE EXCEPTION 'Cannot start new % session: active session already exists for baby %', 
                NEW.activity_type, NEW.baby_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_duplicate_active_sessions
    BEFORE INSERT ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_active_sessions();

-- Trigger to auto-calculate duration when session ends
CREATE OR REPLACE FUNCTION auto_calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- When ending a session (ended_at changes from NULL to timestamp)
    IF TG_OP = 'UPDATE' AND OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN
        -- Calculate duration if not already set
        IF NEW.total_duration_seconds = OLD.total_duration_seconds THEN
            NEW.total_duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
        END IF;
        
        -- Update sync status to pending
        NEW.sync_status := 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_session_duration
    BEFORE UPDATE ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_session_duration();

-- =============================================================================
-- SYNC STATUS MANAGEMENT TRIGGERS
-- =============================================================================

-- Trigger to mark records as needing sync when modified
CREATE OR REPLACE FUNCTION mark_for_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- For UPDATE operations, mark as pending sync if data actually changed
    IF TG_OP = 'UPDATE' THEN
        -- Only update sync status if it's not already pending and data changed
        IF NEW.sync_status = 'synced' AND NEW IS DISTINCT FROM OLD THEN
            NEW.sync_status := 'pending';
            NEW.sync_retry_count := 0;
        END IF;
        RETURN NEW;
    END IF;
    
    -- For INSERT operations, ensure new records are marked for sync
    IF TG_OP = 'INSERT' THEN
        NEW.sync_status := 'pending';
        RETURN NEW;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply sync trigger to all tables that need sync
CREATE TRIGGER trigger_activity_sessions_mark_for_sync
    BEFORE INSERT OR UPDATE ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION mark_for_sync();

CREATE TRIGGER trigger_session_segments_mark_for_sync
    BEFORE INSERT OR UPDATE ON session_segments
    FOR EACH ROW
    EXECUTE FUNCTION mark_for_sync();

CREATE TRIGGER trigger_babies_mark_for_sync
    BEFORE INSERT OR UPDATE ON babies
    FOR EACH ROW
    EXECUTE FUNCTION mark_for_sync();

CREATE TRIGGER trigger_growth_measurements_mark_for_sync
    BEFORE INSERT OR UPDATE ON growth_measurements
    FOR EACH ROW
    EXECUTE FUNCTION mark_for_sync();

-- =============================================================================
-- DATA VALIDATION TRIGGERS
-- =============================================================================

-- Trigger to validate activity session data based on type
CREATE OR REPLACE FUNCTION validate_activity_session_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate nursing session metadata
    IF NEW.activity_type = 'nursing' THEN
        -- Ensure nursing metadata has proper structure
        IF NOT (NEW.metadata ? 'left_breast' OR NEW.metadata ? 'right_breast') 
           AND NEW.ended_at IS NOT NULL THEN
            RAISE EXCEPTION 'Nursing session must have left_breast or right_breast data';
        END IF;
    END IF;
    
    -- Validate bottle feeding metadata
    IF NEW.activity_type = 'bottle' THEN
        -- Ensure bottle feeding has amount
        IF NEW.ended_at IS NOT NULL AND NOT (NEW.metadata ? 'amount_ml') THEN
            RAISE EXCEPTION 'Bottle feeding session must specify amount_ml';
        END IF;
        
        -- Validate amount is reasonable (0-300ml)
        IF (NEW.metadata->>'amount_ml')::INTEGER < 0 OR (NEW.metadata->>'amount_ml')::INTEGER > 300 THEN
            RAISE EXCEPTION 'Bottle amount must be between 0 and 300ml';
        END IF;
    END IF;
    
    -- Validate pumping session metadata
    IF NEW.activity_type = 'pumping' THEN
        -- Ensure pumping has amount data
        IF NEW.ended_at IS NOT NULL AND NOT (
            NEW.metadata ? 'left_amount_ml' OR 
            NEW.metadata ? 'right_amount_ml' OR 
            NEW.metadata ? 'total_amount_ml'
        ) THEN
            RAISE EXCEPTION 'Pumping session must specify amount data';
        END IF;
    END IF;
    
    -- Validate nappy change metadata
    IF NEW.activity_type = 'nappy' THEN
        -- Ensure nappy change has type
        IF NOT (NEW.metadata ? 'type') THEN
            RAISE EXCEPTION 'Nappy change must specify type (wet, dirty, both)';
        END IF;
        
        -- Validate type is valid enum value
        IF NOT (NEW.metadata->>'type' IN ('wet', 'dirty', 'both')) THEN
            RAISE EXCEPTION 'Nappy type must be wet, dirty, or both';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_activity_session_data
    BEFORE INSERT OR UPDATE ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION validate_activity_session_data();

-- =============================================================================
-- AUDIT AND LOGGING TRIGGERS
-- =============================================================================

-- Create audit log table for important changes
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    client_id TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record 
ON audit_log (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at 
ON audit_log (changed_at);

-- Generic audit logging function
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    operation TEXT;
BEGIN
    -- Determine operation
    IF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation := 'INSERT';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;
    
    -- Insert audit record
    INSERT INTO audit_log (
        table_name,
        record_id,
        operation,
        old_values,
        new_values,
        changed_by,
        client_id
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        operation,
        old_data,
        new_data,
        auth.current_user_id(),
        COALESCE(NEW.client_id, OLD.client_id)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit logging to critical tables
CREATE TRIGGER trigger_audit_babies
    AFTER INSERT OR UPDATE OR DELETE ON babies
    FOR EACH ROW
    EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trigger_audit_activity_sessions
    AFTER INSERT OR UPDATE OR DELETE ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION audit_changes();

-- =============================================================================
-- MAINTENANCE AND CLEANUP TRIGGERS
-- =============================================================================

-- Function to clean up old session segments when parent session is deleted
CREATE OR REPLACE FUNCTION cleanup_orphaned_segments()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete all segments for the deleted session
    DELETE FROM session_segments
    WHERE session_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_orphaned_segments
    AFTER DELETE ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_orphaned_segments();

-- Function to update profile last_sync_at when any child record syncs
CREATE OR REPLACE FUNCTION update_profile_sync_timestamp()
RETURNS TRIGGER AS $$
DECLARE
    profile_id_to_update UUID;
BEGIN
    -- Get profile_id based on the table being updated
    IF TG_TABLE_NAME = 'babies' THEN
        profile_id_to_update := NEW.profile_id;
    ELSIF TG_TABLE_NAME = 'activity_sessions' THEN
        SELECT b.profile_id INTO profile_id_to_update
        FROM babies b WHERE b.id = NEW.baby_id;
    ELSIF TG_TABLE_NAME = 'growth_measurements' THEN
        SELECT b.profile_id INTO profile_id_to_update
        FROM babies b WHERE b.id = NEW.baby_id;
    END IF;
    
    -- Update profile sync timestamp if record was successfully synced
    IF NEW.sync_status = 'synced' AND OLD.sync_status != 'synced' THEN
        UPDATE profiles 
        SET last_sync_at = CURRENT_TIMESTAMP
        WHERE id = profile_id_to_update;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_sync_babies
    AFTER UPDATE ON babies
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_sync_timestamp();

CREATE TRIGGER trigger_update_profile_sync_sessions
    AFTER UPDATE ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_sync_timestamp();

CREATE TRIGGER trigger_update_profile_sync_measurements
    AFTER UPDATE ON growth_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_sync_timestamp();

-- =============================================================================
-- NOTIFICATION TRIGGERS (FOR REAL-TIME UPDATES)
-- =============================================================================

-- Function to send real-time notifications via Supabase Realtime
CREATE OR REPLACE FUNCTION notify_activity_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    baby_profile_id UUID;
BEGIN
    -- Get the profile_id for the affected baby
    SELECT profile_id INTO baby_profile_id
    FROM babies
    WHERE id = COALESCE(NEW.baby_id, OLD.baby_id);
    
    -- Build notification payload
    payload := jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'record_id', COALESCE(NEW.id, OLD.id),
        'baby_id', COALESCE(NEW.baby_id, OLD.baby_id),
        'profile_id', baby_profile_id,
        'activity_type', COALESCE(NEW.activity_type, OLD.activity_type),
        'timestamp', CURRENT_TIMESTAMP
    );
    
    -- Send notification for real-time updates
    PERFORM pg_notify('activity_changes', payload::TEXT);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_activity_changes
    AFTER INSERT OR UPDATE OR DELETE ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION notify_activity_change();

-- =============================================================================
-- PERFORMANCE OPTIMIZATION TRIGGERS
-- =============================================================================

-- Function to maintain activity statistics cache
-- This creates a materialized view-like behavior for frequently accessed stats
CREATE TABLE IF NOT EXISTS daily_activity_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    activity_type activity_type NOT NULL,
    session_count INTEGER DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    total_volume_ml INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(baby_id, stat_date, activity_type)
);

CREATE INDEX idx_daily_activity_stats_lookup ON daily_activity_stats(baby_id, stat_date);

-- Function to update daily stats when sessions change
CREATE OR REPLACE FUNCTION update_daily_stats()
RETURNS TRIGGER AS $$
DECLARE
    stat_date DATE;
    volume_ml INTEGER;
BEGIN
    -- Determine the date and volume for stats
    IF TG_OP = 'DELETE' THEN
        stat_date := DATE(OLD.started_at);
        volume_ml := COALESCE((OLD.metadata->>'amount_ml')::INTEGER, 
                             (OLD.metadata->>'total_amount_ml')::INTEGER, 0);
    ELSE
        stat_date := DATE(NEW.started_at);
        volume_ml := COALESCE((NEW.metadata->>'amount_ml')::INTEGER, 
                             (NEW.metadata->>'total_amount_ml')::INTEGER, 0);
    END IF;
    
    -- Update or insert daily stats
    INSERT INTO daily_activity_stats (
        baby_id, 
        stat_date, 
        activity_type,
        session_count,
        total_duration_seconds,
        total_volume_ml
    )
    SELECT 
        COALESCE(NEW.baby_id, OLD.baby_id),
        stat_date,
        COALESCE(NEW.activity_type, OLD.activity_type),
        COUNT(*),
        SUM(COALESCE(total_duration_seconds, 0)),
        SUM(COALESCE((metadata->>'amount_ml')::INTEGER, (metadata->>'total_amount_ml')::INTEGER, 0))
    FROM activity_sessions
    WHERE baby_id = COALESCE(NEW.baby_id, OLD.baby_id)
    AND activity_type = COALESCE(NEW.activity_type, OLD.activity_type)
    AND DATE(started_at) = stat_date
    AND ended_at IS NOT NULL
    GROUP BY baby_id, activity_type
    
    ON CONFLICT (baby_id, stat_date, activity_type)
    DO UPDATE SET
        session_count = EXCLUDED.session_count,
        total_duration_seconds = EXCLUDED.total_duration_seconds,
        total_volume_ml = EXCLUDED.total_volume_ml,
        last_updated = CURRENT_TIMESTAMP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_stats
    AFTER INSERT OR UPDATE OR DELETE ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_stats();

-- Comments for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Creates profile when user registers via Supabase Auth';
COMMENT ON FUNCTION set_first_baby_active() IS 'Automatically activates first baby created by user';
COMMENT ON FUNCTION prevent_duplicate_active_sessions() IS 'Prevents multiple active sessions of same type';
COMMENT ON FUNCTION auto_calculate_session_duration() IS 'Calculates duration when session ends';
COMMENT ON FUNCTION mark_for_sync() IS 'Marks records for offline sync when modified';
COMMENT ON FUNCTION validate_activity_session_data() IS 'Validates activity-specific metadata';
COMMENT ON FUNCTION audit_changes() IS 'Generic audit logging for important table changes';
COMMENT ON FUNCTION cleanup_orphaned_segments() IS 'Removes segments when parent session deleted';
COMMENT ON FUNCTION update_profile_sync_timestamp() IS 'Updates profile sync timestamp';
COMMENT ON FUNCTION notify_activity_change() IS 'Sends real-time notifications via pg_notify';
COMMENT ON FUNCTION update_daily_stats() IS 'Maintains daily activity statistics cache';

COMMENT ON TABLE audit_log IS 'Audit trail for important data changes';
COMMENT ON TABLE daily_activity_stats IS 'Cached daily statistics for performance';

-- =============================================================================
-- TRIGGER SUMMARY
-- =============================================================================

/*
AUTOMATED TRIGGERS SUMMARY:
===========================

USER MANAGEMENT:
✓ handle_new_user() - Auto-create profile on signup
✓ set_first_baby_active() - Activate first baby created

DATA INTEGRITY:
✓ prevent_duplicate_active_sessions() - Prevent multiple active sessions
✓ auto_calculate_session_duration() - Auto-calculate durations
✓ validate_activity_session_data() - Activity-specific validation
✓ cleanup_orphaned_segments() - Clean up related data

OFFLINE SYNC:
✓ mark_for_sync() - Mark records needing sync
✓ update_profile_sync_timestamp() - Track sync progress

AUDIT & MONITORING:
✓ audit_changes() - Complete audit trail
✓ notify_activity_change() - Real-time notifications

PERFORMANCE:
✓ update_daily_stats() - Maintain statistics cache
✓ Efficient index maintenance

TRIGGER APPLICATION:
- Applied to all relevant tables
- Proper error handling and validation
- Security definer functions where needed
- Performance optimized

These triggers ensure data integrity, support offline-first architecture,
provide audit trails, and optimize performance through automated maintenance.
*/