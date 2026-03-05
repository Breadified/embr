-- =============================================================================
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
*/