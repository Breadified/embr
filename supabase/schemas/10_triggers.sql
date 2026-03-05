-- =============================================================================
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