-- =============================================================================
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
COMMENT ON FUNCTION get_session_summary(UUID) IS 'Returns complete session info with segment breakdown';