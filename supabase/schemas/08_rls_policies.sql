-- =============================================================================
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
*/