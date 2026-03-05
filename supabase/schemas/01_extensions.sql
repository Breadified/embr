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
COMMENT ON SCHEMA public IS 'BabyTrack application schema - Core baby tracking functionality';