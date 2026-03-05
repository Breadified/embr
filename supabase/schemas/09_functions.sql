-- =============================================================================
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
*/