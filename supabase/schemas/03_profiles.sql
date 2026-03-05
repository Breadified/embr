-- =============================================================================
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
COMMENT ON FUNCTION update_user_preferences(UUID, TEXT, JSONB, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) IS 'Updates user preferences in single transaction';