-- =============================================================================
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
COMMENT ON FUNCTION archive_baby(UUID, TEXT) IS 'Soft delete a baby with optional reason';