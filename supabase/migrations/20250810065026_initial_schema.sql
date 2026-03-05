create type "public"."activity_type" as enum ('nursing', 'bottle', 'pumping', 'sleep', 'nappy', 'tummy_time', 'play', 'bath', 'walk', 'massage');

create type "public"."breast_side_type" as enum ('left', 'right', 'both');

create type "public"."formula_type" as enum ('breast_milk', 'formula', 'mixed');

create type "public"."gender_type" as enum ('male', 'female');

create type "public"."nappy_type" as enum ('wet', 'dirty', 'both');

create type "public"."sleep_location_type" as enum ('crib', 'arms', 'carrier', 'stroller', 'bed', 'bassinet');

create type "public"."sleep_quality_type" as enum ('good', 'fair', 'poor');

create type "public"."sync_status_type" as enum ('pending', 'synced', 'conflict', 'error');

create type "public"."unit_type" as enum ('ml', 'oz', 'kg', 'lb', 'cm', 'in');

-- Create required functions first
CREATE OR REPLACE FUNCTION public.generate_client_id()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_age_in_months(birth_date date)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) * 12 +
           EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.date_immutable(timestamp with time zone)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT DATE($1 AT TIME ZONE 'UTC');
$function$
;

CREATE OR REPLACE FUNCTION public.date_trunc_month_immutable(timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT DATE_TRUNC('month', $1 AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
$function$
;

CREATE OR REPLACE FUNCTION public.date_trunc_week_immutable(timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT DATE_TRUNC('week', $1 AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
$function$
;

create table "public"."activity_sessions" (
    "id" uuid not null default uuid_generate_v4(),
    "baby_id" uuid not null,
    "activity_type" activity_type not null,
    "started_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "ended_at" timestamp with time zone,
    "total_duration_seconds" integer default 0,
    "metadata" jsonb not null default '{}'::jsonb,
    "notes" text,
    "client_id" text not null default generate_client_id(),
    "sync_status" sync_status_type default 'pending'::sync_status_type,
    "sync_error" text,
    "sync_retry_count" integer default 0,
    "last_sync_attempt" timestamp with time zone,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
);


alter table "public"."activity_sessions" enable row level security;

create table "public"."audit_log" (
    "id" uuid not null default uuid_generate_v4(),
    "table_name" text not null,
    "record_id" uuid not null,
    "operation" text not null,
    "old_values" jsonb,
    "new_values" jsonb,
    "changed_by" uuid,
    "changed_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "client_id" text
);


create table "public"."babies" (
    "id" uuid not null default uuid_generate_v4(),
    "profile_id" uuid not null,
    "name" text not null,
    "nickname" text,
    "gender" gender_type,
    "date_of_birth" date not null,
    "time_of_birth" time without time zone,
    "weight_at_birth_value" numeric(5,2),
    "weight_at_birth_unit" unit_type default 'kg'::unit_type,
    "height_at_birth_value" numeric(5,2),
    "height_at_birth_unit" unit_type default 'cm'::unit_type,
    "head_circumference_at_birth_value" numeric(5,2),
    "head_circumference_at_birth_unit" unit_type default 'cm'::unit_type,
    "gestational_age_weeks" integer,
    "birth_location" text,
    "is_active" boolean default true,
    "archive_reason" text,
    "avatar_url" text,
    "color_theme" text default '#FF6B6B'::text,
    "notes" text,
    "medical_notes" text,
    "client_id" text default generate_client_id(),
    "sync_status" sync_status_type default 'pending'::sync_status_type,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
);


alter table "public"."babies" enable row level security;

create table "public"."daily_activity_stats" (
    "id" uuid not null default uuid_generate_v4(),
    "baby_id" uuid not null,
    "stat_date" date not null,
    "activity_type" activity_type not null,
    "session_count" integer default 0,
    "total_duration_seconds" integer default 0,
    "total_volume_ml" integer default 0,
    "last_updated" timestamp with time zone default CURRENT_TIMESTAMP
);


create table "public"."growth_measurements" (
    "id" uuid not null default uuid_generate_v4(),
    "baby_id" uuid not null,
    "measured_at" date not null default CURRENT_DATE,
    "measured_time" time without time zone,
    "weight_value" numeric(5,2),
    "weight_unit" unit_type default 'kg'::unit_type,
    "height_value" numeric(5,2),
    "height_unit" unit_type default 'cm'::unit_type,
    "head_circumference_value" numeric(5,2),
    "head_circumference_unit" unit_type default 'cm'::unit_type,
    "notes" text,
    "measured_by" text,
    "client_id" text default generate_client_id(),
    "sync_status" sync_status_type default 'pending'::sync_status_type,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
);


alter table "public"."growth_measurements" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "display_name" text,
    "avatar_url" text,
    "timezone" text not null default 'UTC'::text,
    "preferred_units" jsonb default '{"height": "cm", "volume": "ml", "weight": "kg"}'::jsonb,
    "theme" text default 'system'::text,
    "notifications_enabled" boolean default true,
    "sound_enabled" boolean default true,
    "haptic_enabled" boolean default true,
    "data_sharing_enabled" boolean default false,
    "analytics_enabled" boolean default true,
    "onboarding_completed" boolean default false,
    "features_enabled" jsonb default '{}'::jsonb,
    "client_id" text default generate_client_id(),
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
);


alter table "public"."profiles" enable row level security;

create table "public"."session_segments" (
    "id" uuid not null default uuid_generate_v4(),
    "session_id" uuid not null,
    "started_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer default 0,
    "metadata" jsonb default '{}'::jsonb,
    "client_id" text not null default generate_client_id(),
    "sync_status" sync_status_type default 'pending'::sync_status_type,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
);


alter table "public"."session_segments" enable row level security;

CREATE UNIQUE INDEX activity_sessions_pkey ON public.activity_sessions USING btree (id);

CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id);

CREATE UNIQUE INDEX babies_pkey ON public.babies USING btree (id);

CREATE UNIQUE INDEX daily_activity_stats_baby_id_stat_date_activity_type_key ON public.daily_activity_stats USING btree (baby_id, stat_date, activity_type);

CREATE UNIQUE INDEX daily_activity_stats_pkey ON public.daily_activity_stats USING btree (id);

CREATE UNIQUE INDEX growth_measurements_pkey ON public.growth_measurements USING btree (id);

CREATE INDEX idx_active_sessions_by_type ON public.activity_sessions USING btree (baby_id, activity_type, started_at DESC) WHERE (ended_at IS NULL);

CREATE INDEX idx_activity_frequency ON public.activity_sessions USING btree (baby_id, activity_type, date_immutable(started_at)) WHERE (ended_at IS NOT NULL);

CREATE INDEX idx_activity_sessions_active ON public.activity_sessions USING btree (baby_id, activity_type) WHERE (ended_at IS NULL);

CREATE INDEX idx_activity_sessions_activity_type ON public.activity_sessions USING btree (baby_id, activity_type);

CREATE INDEX idx_activity_sessions_baby_id ON public.activity_sessions USING btree (baby_id);

CREATE INDEX idx_activity_sessions_baby_id_rls ON public.activity_sessions USING btree (baby_id, id);

CREATE INDEX idx_activity_sessions_baby_recent ON public.activity_sessions USING btree (baby_id, started_at DESC, activity_type) INCLUDE (ended_at, total_duration_seconds, metadata);

CREATE INDEX idx_activity_sessions_client_id ON public.activity_sessions USING btree (client_id);

CREATE INDEX idx_activity_sessions_daily_summary ON public.activity_sessions USING btree (baby_id, date_immutable(started_at), activity_type) WHERE (ended_at IS NOT NULL);

CREATE INDEX idx_activity_sessions_metadata_gin ON public.activity_sessions USING gin (metadata);

CREATE INDEX idx_activity_sessions_monthly_reports ON public.activity_sessions USING btree (baby_id, date_trunc_month_immutable(started_at), activity_type) WHERE (ended_at IS NOT NULL);

CREATE INDEX idx_activity_sessions_notes_search ON public.activity_sessions USING gin (to_tsvector('english'::regconfig, COALESCE(notes, ''::text))) WHERE ((notes IS NOT NULL) AND (length(notes) > 0));

CREATE INDEX idx_activity_sessions_recent ON public.activity_sessions USING btree (baby_id, started_at DESC, activity_type);

CREATE INDEX idx_activity_sessions_recent_sync ON public.activity_sessions USING btree (sync_status, client_id, updated_at) WHERE (sync_status <> 'synced'::sync_status_type);

CREATE INDEX idx_activity_sessions_started_at ON public.activity_sessions USING btree (baby_id, started_at DESC);

CREATE INDEX idx_activity_sessions_sync_queue ON public.activity_sessions USING btree (sync_status, baby_id, updated_at) WHERE (sync_status = ANY (ARRAY['pending'::sync_status_type, 'error'::sync_status_type]));

CREATE INDEX idx_activity_sessions_sync_status ON public.activity_sessions USING btree (sync_status) WHERE (sync_status <> 'synced'::sync_status_type);

CREATE INDEX idx_activity_sessions_weekly_reports ON public.activity_sessions USING btree (baby_id, date_trunc_week_immutable(started_at), activity_type) WHERE (ended_at IS NOT NULL);

CREATE INDEX idx_audit_log_changed_at ON public.audit_log USING btree (changed_at);

CREATE INDEX idx_audit_log_table_record ON public.audit_log USING btree (table_name, record_id);

CREATE INDEX idx_babies_created_at ON public.babies USING btree (created_at);

CREATE INDEX idx_babies_date_of_birth ON public.babies USING btree (date_of_birth);

CREATE INDEX idx_babies_is_active ON public.babies USING btree (profile_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_babies_name_search ON public.babies USING gin (to_tsvector('english'::regconfig, ((name || ' '::text) || COALESCE(nickname, ''::text))));

CREATE INDEX idx_babies_ownership ON public.babies USING btree (profile_id, is_active, created_at) WHERE (is_active = true);

CREATE INDEX idx_babies_profile_id ON public.babies USING btree (profile_id);

CREATE INDEX idx_babies_profile_id_rls ON public.babies USING btree (profile_id, id);

CREATE INDEX idx_babies_sync_status ON public.babies USING btree (sync_status) WHERE (sync_status <> 'synced'::sync_status_type);

CREATE INDEX idx_daily_activity_stats_lookup ON public.daily_activity_stats USING btree (baby_id, stat_date);

CREATE INDEX idx_growth_measurements_baby_id ON public.growth_measurements USING btree (baby_id);

CREATE INDEX idx_growth_measurements_latest ON public.growth_measurements USING btree (baby_id, measured_at DESC, created_at DESC) INCLUDE (weight_value, height_value, head_circumference_value);

CREATE INDEX idx_growth_measurements_measured_at ON public.growth_measurements USING btree (baby_id, measured_at DESC);

CREATE INDEX idx_growth_measurements_sync_status ON public.growth_measurements USING btree (sync_status) WHERE (sync_status <> 'synced'::sync_status_type);

CREATE INDEX idx_growth_measurements_unsynced ON public.growth_measurements USING btree (baby_id, sync_status, updated_at) WHERE (sync_status <> 'synced'::sync_status_type);

CREATE INDEX idx_nursing_sessions ON public.activity_sessions USING btree (baby_id, started_at DESC) WHERE ((activity_type = 'nursing'::activity_type) AND (ended_at IS NOT NULL));

CREATE INDEX idx_profiles_client_id ON public.profiles USING btree (client_id);

CREATE INDEX idx_profiles_created_at ON public.profiles USING btree (created_at);

CREATE INDEX idx_profiles_last_sync_at ON public.profiles USING btree (last_sync_at);

CREATE INDEX idx_profiles_preferences_gin ON public.profiles USING gin (preferred_units, features_enabled);

CREATE INDEX idx_profiles_sync_lookup ON public.profiles USING btree (client_id, last_sync_at);

CREATE INDEX idx_segments_active ON public.session_segments USING btree (session_id, started_at DESC) WHERE (ended_at IS NULL);

CREATE INDEX idx_segments_duration_calc ON public.session_segments USING btree (session_id, ended_at) INCLUDE (duration_seconds);

CREATE INDEX idx_session_segments_active ON public.session_segments USING btree (session_id) WHERE (ended_at IS NULL);

CREATE UNIQUE INDEX idx_session_segments_client_id_unique ON public.session_segments USING btree (client_id);

CREATE INDEX idx_session_segments_ownership_rls ON public.session_segments USING btree (session_id, id);

CREATE INDEX idx_session_segments_session_id ON public.session_segments USING btree (session_id);

CREATE INDEX idx_session_segments_sync_queue ON public.session_segments USING btree (sync_status, session_id, updated_at) WHERE (sync_status = ANY (ARRAY['pending'::sync_status_type, 'error'::sync_status_type]));

CREATE INDEX idx_session_segments_sync_status ON public.session_segments USING btree (sync_status) WHERE (sync_status <> 'synced'::sync_status_type);

CREATE INDEX idx_session_segments_timing ON public.session_segments USING btree (session_id, started_at);

CREATE INDEX idx_sleep_sessions ON public.activity_sessions USING btree (baby_id, started_at DESC) WHERE ((activity_type = 'sleep'::activity_type) AND (ended_at IS NOT NULL));

CREATE UNIQUE INDEX idx_unique_active_session_per_activity ON public.activity_sessions USING btree (baby_id, activity_type) WHERE (ended_at IS NULL);

CREATE UNIQUE INDEX profiles_client_id_unique ON public.profiles USING btree (client_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX session_segments_pkey ON public.session_segments USING btree (id);

alter table "public"."activity_sessions" add constraint "activity_sessions_pkey" PRIMARY KEY using index "activity_sessions_pkey";

alter table "public"."audit_log" add constraint "audit_log_pkey" PRIMARY KEY using index "audit_log_pkey";

alter table "public"."babies" add constraint "babies_pkey" PRIMARY KEY using index "babies_pkey";

alter table "public"."daily_activity_stats" add constraint "daily_activity_stats_pkey" PRIMARY KEY using index "daily_activity_stats_pkey";

alter table "public"."growth_measurements" add constraint "growth_measurements_pkey" PRIMARY KEY using index "growth_measurements_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."session_segments" add constraint "session_segments_pkey" PRIMARY KEY using index "session_segments_pkey";

alter table "public"."activity_sessions" add constraint "activity_sessions_baby_id_fkey" FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE not valid;

alter table "public"."activity_sessions" validate constraint "activity_sessions_baby_id_fkey";

alter table "public"."activity_sessions" add constraint "activity_sessions_client_id_not_empty" CHECK ((length(TRIM(BOTH FROM client_id)) > 0)) not valid;

alter table "public"."activity_sessions" validate constraint "activity_sessions_client_id_not_empty";

alter table "public"."activity_sessions" add constraint "activity_sessions_duration_positive" CHECK ((total_duration_seconds >= 0)) not valid;

alter table "public"."activity_sessions" validate constraint "activity_sessions_duration_positive";

alter table "public"."activity_sessions" add constraint "activity_sessions_sync_retry_positive" CHECK ((sync_retry_count >= 0)) not valid;

alter table "public"."activity_sessions" validate constraint "activity_sessions_sync_retry_positive";

alter table "public"."activity_sessions" add constraint "activity_sessions_timing_valid" CHECK (((ended_at IS NULL) OR (ended_at >= started_at))) not valid;

alter table "public"."activity_sessions" validate constraint "activity_sessions_timing_valid";

alter table "public"."audit_log" add constraint "audit_log_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES profiles(id) not valid;

alter table "public"."audit_log" validate constraint "audit_log_changed_by_fkey";

alter table "public"."babies" add constraint "babies_birth_date_reasonable" CHECK (((date_of_birth >= '1900-01-01'::date) AND (date_of_birth <= (CURRENT_DATE + '1 day'::interval)))) not valid;

alter table "public"."babies" validate constraint "babies_birth_date_reasonable";

alter table "public"."babies" add constraint "babies_gestational_age_reasonable" CHECK (((gestational_age_weeks IS NULL) OR ((gestational_age_weeks >= 20) AND (gestational_age_weeks <= 45)))) not valid;

alter table "public"."babies" validate constraint "babies_gestational_age_reasonable";

alter table "public"."babies" add constraint "babies_head_circumference_positive" CHECK (((head_circumference_at_birth_value IS NULL) OR (head_circumference_at_birth_value > (0)::numeric))) not valid;

alter table "public"."babies" validate constraint "babies_head_circumference_positive";

alter table "public"."babies" add constraint "babies_height_at_birth_positive" CHECK (((height_at_birth_value IS NULL) OR (height_at_birth_value > (0)::numeric))) not valid;

alter table "public"."babies" validate constraint "babies_height_at_birth_positive";

alter table "public"."babies" add constraint "babies_name_check" CHECK ((length(TRIM(BOTH FROM name)) > 0)) not valid;

alter table "public"."babies" validate constraint "babies_name_check";

alter table "public"."babies" add constraint "babies_name_not_empty" CHECK ((length(TRIM(BOTH FROM name)) > 0)) not valid;

alter table "public"."babies" validate constraint "babies_name_not_empty";

alter table "public"."babies" add constraint "babies_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."babies" validate constraint "babies_profile_id_fkey";

alter table "public"."babies" add constraint "babies_weight_at_birth_positive" CHECK (((weight_at_birth_value IS NULL) OR (weight_at_birth_value > (0)::numeric))) not valid;

alter table "public"."babies" validate constraint "babies_weight_at_birth_positive";

alter table "public"."daily_activity_stats" add constraint "daily_activity_stats_baby_id_fkey" FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE not valid;

alter table "public"."daily_activity_stats" validate constraint "daily_activity_stats_baby_id_fkey";

alter table "public"."daily_activity_stats" add constraint "daily_activity_stats_baby_id_stat_date_activity_type_key" UNIQUE using index "daily_activity_stats_baby_id_stat_date_activity_type_key";

alter table "public"."growth_measurements" add constraint "growth_measurements_baby_id_fkey" FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE not valid;

alter table "public"."growth_measurements" validate constraint "growth_measurements_baby_id_fkey";

alter table "public"."growth_measurements" add constraint "growth_measurements_head_circumference_positive" CHECK (((head_circumference_value IS NULL) OR (head_circumference_value > (0)::numeric))) not valid;

alter table "public"."growth_measurements" validate constraint "growth_measurements_head_circumference_positive";

alter table "public"."growth_measurements" add constraint "growth_measurements_height_positive" CHECK (((height_value IS NULL) OR (height_value > (0)::numeric))) not valid;

alter table "public"."growth_measurements" validate constraint "growth_measurements_height_positive";

alter table "public"."growth_measurements" add constraint "growth_measurements_measured_at_reasonable" CHECK (((measured_at >= '1900-01-01'::date) AND (measured_at <= (CURRENT_DATE + '1 day'::interval)))) not valid;

alter table "public"."growth_measurements" validate constraint "growth_measurements_measured_at_reasonable";

alter table "public"."growth_measurements" add constraint "growth_measurements_weight_positive" CHECK (((weight_value IS NULL) OR (weight_value > (0)::numeric))) not valid;

alter table "public"."growth_measurements" validate constraint "growth_measurements_weight_positive";

alter table "public"."profiles" add constraint "profiles_client_id_unique" UNIQUE using index "profiles_client_id_unique";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_theme_check" CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_theme_check";

alter table "public"."profiles" add constraint "profiles_timezone_check" CHECK (((timezone IS NOT NULL) AND (length(timezone) > 0))) not valid;

alter table "public"."profiles" validate constraint "profiles_timezone_check";

alter table "public"."session_segments" add constraint "session_segments_client_id_not_empty" CHECK ((length(TRIM(BOTH FROM client_id)) > 0)) not valid;

alter table "public"."session_segments" validate constraint "session_segments_client_id_not_empty";

alter table "public"."session_segments" add constraint "session_segments_duration_positive" CHECK ((duration_seconds >= 0)) not valid;

alter table "public"."session_segments" validate constraint "session_segments_duration_positive";

alter table "public"."session_segments" add constraint "session_segments_session_id_fkey" FOREIGN KEY (session_id) REFERENCES activity_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."session_segments" validate constraint "session_segments_session_id_fkey";

alter table "public"."session_segments" add constraint "session_segments_timing_valid" CHECK (((ended_at IS NULL) OR (ended_at >= started_at))) not valid;

alter table "public"."session_segments" validate constraint "session_segments_timing_valid";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.analyze_feeding_patterns(p_baby_id uuid, p_days_back integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.analyze_index_usage()
 RETURNS TABLE(schemaname text, tablename text, indexname text, idx_scan bigint, idx_tup_read bigint, idx_tup_fetch bigint, usage_ratio numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.archive_baby(baby_id uuid, reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE babies SET
        is_active = false,
        archive_reason = reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = baby_id;
    
    RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.auto_calculate_session_duration()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_age_in_months(birth_date date)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) * 12 +
           EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_growth_trends(p_baby_id uuid, p_measurement_count integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_session_duration_from_segments(p_session_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    total_duration INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(duration_seconds), 0) INTO total_duration
    FROM session_segments
    WHERE session_id = p_session_id AND ended_at IS NOT NULL;
    
    RETURN total_duration;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_total_duration(segments jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.check_baby_milestones_and_alerts(p_baby_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_segments()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Delete all segments for the deleted session
    DELETE FROM session_segments
    WHERE session_id = OLD.id;
    
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO profiles (id, display_name, client_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        generate_client_id()
    );
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN COALESCE(
        auth.uid(),
        (current_setting('request.jwt.claim.sub', true))::uuid,
        NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.date_immutable(timestamp with time zone)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT DATE($1 AT TIME ZONE 'UTC');
$function$
;

CREATE OR REPLACE FUNCTION public.date_trunc_month_immutable(timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT DATE_TRUNC('month', $1 AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
$function$
;

CREATE OR REPLACE FUNCTION public.date_trunc_week_immutable(timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT DATE_TRUNC('week', $1 AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
$function$
;

CREATE OR REPLACE FUNCTION public.debug_rls_policies()
 RETURNS TABLE(table_name text, policy_name text, policy_type text, policy_roles text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.end_activity_session(p_session_id uuid, p_end_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP, p_final_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.end_session_segment(p_segment_id uuid, p_end_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP, p_final_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.generate_baby_report(p_baby_id uuid, p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.generate_client_id()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_babies(user_id uuid)
 RETURNS SETOF babies
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT * FROM babies 
    WHERE profile_id = user_id AND is_active = true
    ORDER BY created_at ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_segment(p_session_id uuid)
 RETURNS session_segments
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_sessions(p_baby_id uuid)
 RETURNS SETOF activity_sessions
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT * FROM activity_sessions
    WHERE baby_id = p_baby_id AND ended_at IS NULL
    ORDER BY started_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_activity_stats(p_baby_id uuid, p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_baby_age_info(baby_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_baby_from_session(session_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    baby_id UUID;
BEGIN
    SELECT a.baby_id INTO baby_id
    FROM activity_sessions a
    WHERE a.id = session_id;
    
    RETURN baby_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_daily_feeding_summary(p_baby_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_measurements(baby_id uuid)
 RETURNS growth_measurements
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_recent_sessions(p_baby_id uuid, p_hours_back integer DEFAULT 24, p_limit integer DEFAULT 50)
 RETURNS SETOF activity_sessions
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT * FROM activity_sessions
    WHERE baby_id = p_baby_id 
    AND started_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' * p_hours_back
    ORDER BY started_at DESC
    LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_session_segments(p_session_id uuid)
 RETURNS SETOF session_segments
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT * FROM session_segments
    WHERE session_id = p_session_id
    ORDER BY started_at ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_session_summary(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_sleep_pattern_analysis(p_baby_id uuid, p_start_date date DEFAULT (CURRENT_DATE - '7 days'::interval), p_end_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_table_sizes()
 RETURNS TABLE(table_name text, table_size text, indexes_size text, total_size text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_timezone(user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    user_tz TEXT;
BEGIN
    SELECT timezone INTO user_tz 
    FROM profiles 
    WHERE id = user_id;
    
    RETURN COALESCE(user_tz, 'UTC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.mark_for_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

create type "public"."measurement" as ("value" numeric(10,2), "unit" unit_type);

CREATE OR REPLACE FUNCTION public.notify_activity_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.pause_session(p_session_id uuid, p_pause_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_active_sessions()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.resume_session(p_session_id uuid, p_resume_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    new_segment_id UUID;
BEGIN
    -- Start new segment
    SELECT start_session_segment(p_session_id, p_resume_metadata) INTO new_segment_id;
    
    RETURN new_segment_id;
END;
$function$
;

create type "public"."session_segment" as ("started_at" timestamp with time zone, "ended_at" timestamp with time zone, "duration_seconds" integer, "metadata" jsonb);

CREATE OR REPLACE FUNCTION public.set_first_baby_active()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.start_activity_session(p_baby_id uuid, p_activity_type activity_type, p_metadata jsonb DEFAULT '{}'::jsonb, p_client_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.start_session_segment(p_session_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb, p_client_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.sync_session_duration(p_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.test_rls_policies(test_user_id uuid, test_baby_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_sync_session_duration()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update parent session duration whenever a segment is modified
    PERFORM sync_session_duration(COALESCE(NEW.session_id, OLD.session_id));
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_daily_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_profile_sync_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_session_metadata(p_session_id uuid, p_metadata jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE activity_sessions SET
        metadata = p_metadata,
        sync_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_session_id;
    
    RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_preferences(user_id uuid, new_timezone text DEFAULT NULL::text, new_preferred_units jsonb DEFAULT NULL::jsonb, new_theme text DEFAULT NULL::text, new_notifications_enabled boolean DEFAULT NULL::boolean, new_sound_enabled boolean DEFAULT NULL::boolean, new_haptic_enabled boolean DEFAULT NULL::boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.user_owns_baby(baby_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM babies 
        WHERE id = baby_id 
        AND profile_id = public.current_user_id()
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_activity_session_data()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

grant delete on table "public"."activity_sessions" to "anon";

grant insert on table "public"."activity_sessions" to "anon";

grant references on table "public"."activity_sessions" to "anon";

grant select on table "public"."activity_sessions" to "anon";

grant trigger on table "public"."activity_sessions" to "anon";

grant truncate on table "public"."activity_sessions" to "anon";

grant update on table "public"."activity_sessions" to "anon";

grant delete on table "public"."activity_sessions" to "authenticated";

grant insert on table "public"."activity_sessions" to "authenticated";

grant references on table "public"."activity_sessions" to "authenticated";

grant select on table "public"."activity_sessions" to "authenticated";

grant trigger on table "public"."activity_sessions" to "authenticated";

grant truncate on table "public"."activity_sessions" to "authenticated";

grant update on table "public"."activity_sessions" to "authenticated";

grant delete on table "public"."activity_sessions" to "service_role";

grant insert on table "public"."activity_sessions" to "service_role";

grant references on table "public"."activity_sessions" to "service_role";

grant select on table "public"."activity_sessions" to "service_role";

grant trigger on table "public"."activity_sessions" to "service_role";

grant truncate on table "public"."activity_sessions" to "service_role";

grant update on table "public"."activity_sessions" to "service_role";

grant delete on table "public"."audit_log" to "anon";

grant insert on table "public"."audit_log" to "anon";

grant references on table "public"."audit_log" to "anon";

grant select on table "public"."audit_log" to "anon";

grant trigger on table "public"."audit_log" to "anon";

grant truncate on table "public"."audit_log" to "anon";

grant update on table "public"."audit_log" to "anon";

grant delete on table "public"."audit_log" to "authenticated";

grant insert on table "public"."audit_log" to "authenticated";

grant references on table "public"."audit_log" to "authenticated";

grant select on table "public"."audit_log" to "authenticated";

grant trigger on table "public"."audit_log" to "authenticated";

grant truncate on table "public"."audit_log" to "authenticated";

grant update on table "public"."audit_log" to "authenticated";

grant delete on table "public"."audit_log" to "service_role";

grant insert on table "public"."audit_log" to "service_role";

grant references on table "public"."audit_log" to "service_role";

grant select on table "public"."audit_log" to "service_role";

grant trigger on table "public"."audit_log" to "service_role";

grant truncate on table "public"."audit_log" to "service_role";

grant update on table "public"."audit_log" to "service_role";

grant delete on table "public"."babies" to "anon";

grant insert on table "public"."babies" to "anon";

grant references on table "public"."babies" to "anon";

grant select on table "public"."babies" to "anon";

grant trigger on table "public"."babies" to "anon";

grant truncate on table "public"."babies" to "anon";

grant update on table "public"."babies" to "anon";

grant delete on table "public"."babies" to "authenticated";

grant insert on table "public"."babies" to "authenticated";

grant references on table "public"."babies" to "authenticated";

grant select on table "public"."babies" to "authenticated";

grant trigger on table "public"."babies" to "authenticated";

grant truncate on table "public"."babies" to "authenticated";

grant update on table "public"."babies" to "authenticated";

grant delete on table "public"."babies" to "service_role";

grant insert on table "public"."babies" to "service_role";

grant references on table "public"."babies" to "service_role";

grant select on table "public"."babies" to "service_role";

grant trigger on table "public"."babies" to "service_role";

grant truncate on table "public"."babies" to "service_role";

grant update on table "public"."babies" to "service_role";

grant delete on table "public"."daily_activity_stats" to "anon";

grant insert on table "public"."daily_activity_stats" to "anon";

grant references on table "public"."daily_activity_stats" to "anon";

grant select on table "public"."daily_activity_stats" to "anon";

grant trigger on table "public"."daily_activity_stats" to "anon";

grant truncate on table "public"."daily_activity_stats" to "anon";

grant update on table "public"."daily_activity_stats" to "anon";

grant delete on table "public"."daily_activity_stats" to "authenticated";

grant insert on table "public"."daily_activity_stats" to "authenticated";

grant references on table "public"."daily_activity_stats" to "authenticated";

grant select on table "public"."daily_activity_stats" to "authenticated";

grant trigger on table "public"."daily_activity_stats" to "authenticated";

grant truncate on table "public"."daily_activity_stats" to "authenticated";

grant update on table "public"."daily_activity_stats" to "authenticated";

grant delete on table "public"."daily_activity_stats" to "service_role";

grant insert on table "public"."daily_activity_stats" to "service_role";

grant references on table "public"."daily_activity_stats" to "service_role";

grant select on table "public"."daily_activity_stats" to "service_role";

grant trigger on table "public"."daily_activity_stats" to "service_role";

grant truncate on table "public"."daily_activity_stats" to "service_role";

grant update on table "public"."daily_activity_stats" to "service_role";

grant delete on table "public"."growth_measurements" to "anon";

grant insert on table "public"."growth_measurements" to "anon";

grant references on table "public"."growth_measurements" to "anon";

grant select on table "public"."growth_measurements" to "anon";

grant trigger on table "public"."growth_measurements" to "anon";

grant truncate on table "public"."growth_measurements" to "anon";

grant update on table "public"."growth_measurements" to "anon";

grant delete on table "public"."growth_measurements" to "authenticated";

grant insert on table "public"."growth_measurements" to "authenticated";

grant references on table "public"."growth_measurements" to "authenticated";

grant select on table "public"."growth_measurements" to "authenticated";

grant trigger on table "public"."growth_measurements" to "authenticated";

grant truncate on table "public"."growth_measurements" to "authenticated";

grant update on table "public"."growth_measurements" to "authenticated";

grant delete on table "public"."growth_measurements" to "service_role";

grant insert on table "public"."growth_measurements" to "service_role";

grant references on table "public"."growth_measurements" to "service_role";

grant select on table "public"."growth_measurements" to "service_role";

grant trigger on table "public"."growth_measurements" to "service_role";

grant truncate on table "public"."growth_measurements" to "service_role";

grant update on table "public"."growth_measurements" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."session_segments" to "anon";

grant insert on table "public"."session_segments" to "anon";

grant references on table "public"."session_segments" to "anon";

grant select on table "public"."session_segments" to "anon";

grant trigger on table "public"."session_segments" to "anon";

grant truncate on table "public"."session_segments" to "anon";

grant update on table "public"."session_segments" to "anon";

grant delete on table "public"."session_segments" to "authenticated";

grant insert on table "public"."session_segments" to "authenticated";

grant references on table "public"."session_segments" to "authenticated";

grant select on table "public"."session_segments" to "authenticated";

grant trigger on table "public"."session_segments" to "authenticated";

grant truncate on table "public"."session_segments" to "authenticated";

grant update on table "public"."session_segments" to "authenticated";

grant delete on table "public"."session_segments" to "service_role";

grant insert on table "public"."session_segments" to "service_role";

grant references on table "public"."session_segments" to "service_role";

grant select on table "public"."session_segments" to "service_role";

grant trigger on table "public"."session_segments" to "service_role";

grant truncate on table "public"."session_segments" to "service_role";

grant update on table "public"."session_segments" to "service_role";

create policy "Service role can read all sessions"
on "public"."activity_sessions"
as permissive
for select
to public
using ((auth.role() = 'service_role'::text));


create policy "Users can delete own baby sessions"
on "public"."activity_sessions"
as permissive
for delete
to public
using (user_owns_baby(baby_id));


create policy "Users can insert own baby sessions"
on "public"."activity_sessions"
as permissive
for insert
to public
with check (user_owns_baby(baby_id));


create policy "Users can read own baby sessions"
on "public"."activity_sessions"
as permissive
for select
to public
using (user_owns_baby(baby_id));


create policy "Users can update own baby sessions"
on "public"."activity_sessions"
as permissive
for update
to public
using (user_owns_baby(baby_id))
with check (user_owns_baby(baby_id));


create policy "Service role can read all babies"
on "public"."babies"
as permissive
for select
to public
using ((auth.role() = 'service_role'::text));


create policy "Users can delete own babies"
on "public"."babies"
as permissive
for delete
to public
using ((profile_id = current_user_id()));


create policy "Users can insert own babies"
on "public"."babies"
as permissive
for insert
to public
with check ((profile_id = current_user_id()));


create policy "Users can read own babies"
on "public"."babies"
as permissive
for select
to public
using ((profile_id = current_user_id()));


create policy "Users can update own babies"
on "public"."babies"
as permissive
for update
to public
using ((profile_id = current_user_id()))
with check ((profile_id = current_user_id()));


create policy "Service role can read all measurements"
on "public"."growth_measurements"
as permissive
for select
to public
using ((auth.role() = 'service_role'::text));


create policy "Users can delete own baby measurements"
on "public"."growth_measurements"
as permissive
for delete
to public
using (user_owns_baby(baby_id));


create policy "Users can insert own baby measurements"
on "public"."growth_measurements"
as permissive
for insert
to public
with check (user_owns_baby(baby_id));


create policy "Users can read own baby measurements"
on "public"."growth_measurements"
as permissive
for select
to public
using (user_owns_baby(baby_id));


create policy "Users can update own baby measurements"
on "public"."growth_measurements"
as permissive
for update
to public
using (user_owns_baby(baby_id))
with check (user_owns_baby(baby_id));


create policy "Anonymous users can manage their profile"
on "public"."profiles"
as permissive
for all
to public
using (((current_user_id() = id) OR ((current_user_id() IS NULL) AND (id IS NULL))))
with check (((current_user_id() = id) OR ((current_user_id() IS NULL) AND (id IS NULL))));


create policy "Service role can read all profiles"
on "public"."profiles"
as permissive
for select
to public
using ((auth.role() = 'service_role'::text));


create policy "Users can insert own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((current_user_id() = id));


create policy "Users can read own profile"
on "public"."profiles"
as permissive
for select
to public
using ((current_user_id() = id));


create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to public
using ((current_user_id() = id))
with check ((current_user_id() = id));


create policy "Service role can read all segments"
on "public"."session_segments"
as permissive
for select
to public
using ((auth.role() = 'service_role'::text));


create policy "Users can delete own session segments"
on "public"."session_segments"
as permissive
for delete
to public
using (user_owns_baby(get_baby_from_session(session_id)));


create policy "Users can insert own session segments"
on "public"."session_segments"
as permissive
for insert
to public
with check (user_owns_baby(get_baby_from_session(session_id)));


create policy "Users can read own session segments"
on "public"."session_segments"
as permissive
for select
to public
using (user_owns_baby(get_baby_from_session(session_id)));


create policy "Users can update own session segments"
on "public"."session_segments"
as permissive
for update
to public
using (user_owns_baby(get_baby_from_session(session_id)))
with check (user_owns_baby(get_baby_from_session(session_id)));


CREATE TRIGGER trigger_activity_sessions_mark_for_sync BEFORE INSERT OR UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION mark_for_sync();

CREATE TRIGGER trigger_activity_sessions_updated_at BEFORE UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_audit_activity_sessions AFTER INSERT OR DELETE OR UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trigger_auto_calculate_session_duration BEFORE UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION auto_calculate_session_duration();

CREATE TRIGGER trigger_cleanup_orphaned_segments AFTER DELETE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION cleanup_orphaned_segments();

CREATE TRIGGER trigger_notify_activity_changes AFTER INSERT OR DELETE OR UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION notify_activity_change();

CREATE TRIGGER trigger_prevent_duplicate_active_sessions BEFORE INSERT ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_active_sessions();

CREATE TRIGGER trigger_update_daily_stats AFTER INSERT OR DELETE OR UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION update_daily_stats();

CREATE TRIGGER trigger_update_profile_sync_sessions AFTER UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION update_profile_sync_timestamp();

CREATE TRIGGER trigger_validate_activity_session_data BEFORE INSERT OR UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION validate_activity_session_data();

CREATE TRIGGER trigger_audit_babies AFTER INSERT OR DELETE OR UPDATE ON public.babies FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trigger_babies_mark_for_sync BEFORE INSERT OR UPDATE ON public.babies FOR EACH ROW EXECUTE FUNCTION mark_for_sync();

CREATE TRIGGER trigger_babies_updated_at BEFORE UPDATE ON public.babies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_set_first_baby_active BEFORE INSERT ON public.babies FOR EACH ROW EXECUTE FUNCTION set_first_baby_active();

CREATE TRIGGER trigger_update_profile_sync_babies AFTER UPDATE ON public.babies FOR EACH ROW EXECUTE FUNCTION update_profile_sync_timestamp();

CREATE TRIGGER trigger_growth_measurements_mark_for_sync BEFORE INSERT OR UPDATE ON public.growth_measurements FOR EACH ROW EXECUTE FUNCTION mark_for_sync();

CREATE TRIGGER trigger_growth_measurements_updated_at BEFORE UPDATE ON public.growth_measurements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_profile_sync_measurements AFTER UPDATE ON public.growth_measurements FOR EACH ROW EXECUTE FUNCTION update_profile_sync_timestamp();

CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_session_segments_mark_for_sync BEFORE INSERT OR UPDATE ON public.session_segments FOR EACH ROW EXECUTE FUNCTION mark_for_sync();

CREATE TRIGGER trigger_session_segments_sync_duration AFTER INSERT OR DELETE OR UPDATE ON public.session_segments FOR EACH ROW EXECUTE FUNCTION trigger_sync_session_duration();

CREATE TRIGGER trigger_session_segments_updated_at BEFORE UPDATE ON public.session_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


