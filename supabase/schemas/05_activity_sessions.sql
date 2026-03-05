-- =============================================================================
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
COMMENT ON FUNCTION get_activity_stats(UUID, DATE, DATE) IS 'Returns activity statistics for date range';