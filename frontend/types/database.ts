export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Helper type for metadata objects
export type JsonObject = Record<string, unknown>

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_sessions: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          baby_id: string
          client_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          last_sync_attempt: string | null
          metadata: Json
          notes: string | null
          started_at: string
          sync_error: string | null
          sync_retry_count: number | null
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          total_duration_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          baby_id: string
          client_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          last_sync_attempt?: string | null
          metadata?: Json
          notes?: string | null
          started_at?: string
          sync_error?: string | null
          sync_retry_count?: number | null
          sync_status?: Database["public"]["Enums"]["sync_status_type"] | null
          total_duration_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          baby_id?: string
          client_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          last_sync_attempt?: string | null
          metadata?: Json
          notes?: string | null
          started_at?: string
          sync_error?: string | null
          sync_retry_count?: number | null
          sync_status?: Database["public"]["Enums"]["sync_status_type"] | null
          total_duration_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_sessions_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          client_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          client_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          client_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      babies: {
        Row: {
          archive_reason: string | null
          avatar_url: string | null
          birth_location: string | null
          client_id: string | null
          color_theme: string | null
          created_at: string | null
          date_of_birth: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          gestational_age_weeks: number | null
          head_circumference_at_birth_unit:
            | Database["public"]["Enums"]["unit_type"]
            | null
          head_circumference_at_birth_value: number | null
          height_at_birth_unit: Database["public"]["Enums"]["unit_type"] | null
          height_at_birth_value: number | null
          id: string
          is_active: boolean | null
          medical_notes: string | null
          name: string
          nickname: string | null
          notes: string | null
          profile_id: string
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          time_of_birth: string | null
          updated_at: string | null
          weight_at_birth_unit: Database["public"]["Enums"]["unit_type"] | null
          weight_at_birth_value: number | null
        }
        Insert: {
          archive_reason?: string | null
          avatar_url?: string | null
          birth_location?: string | null
          client_id?: string | null
          color_theme?: string | null
          created_at?: string | null
          date_of_birth: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          gestational_age_weeks?: number | null
          head_circumference_at_birth_unit?:
            | Database["public"]["Enums"]["unit_type"]
            | null
          head_circumference_at_birth_value?: number | null
          height_at_birth_unit?: Database["public"]["Enums"]["unit_type"] | null
          height_at_birth_value?: number | null
          id?: string
          is_active?: boolean | null
          medical_notes?: string | null
          name: string
          nickname?: string | null
          notes?: string | null
          profile_id: string
          sync_status?: Database["public"]["Enums"]["sync_status_type"] | null
          time_of_birth?: string | null
          updated_at?: string | null
          weight_at_birth_unit?: Database["public"]["Enums"]["unit_type"] | null
          weight_at_birth_value?: number | null
        }
        Update: {
          archive_reason?: string | null
          avatar_url?: string | null
          birth_location?: string | null
          client_id?: string | null
          color_theme?: string | null
          created_at?: string | null
          date_of_birth?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          gestational_age_weeks?: number | null
          head_circumference_at_birth_unit?:
            | Database["public"]["Enums"]["unit_type"]
            | null
          head_circumference_at_birth_value?: number | null
          height_at_birth_unit?: Database["public"]["Enums"]["unit_type"] | null
          height_at_birth_value?: number | null
          id?: string
          is_active?: boolean | null
          medical_notes?: string | null
          name?: string
          nickname?: string | null
          notes?: string | null
          profile_id?: string
          sync_status?: Database["public"]["Enums"]["sync_status_type"] | null
          time_of_birth?: string | null
          updated_at?: string | null
          weight_at_birth_unit?: Database["public"]["Enums"]["unit_type"] | null
          weight_at_birth_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "babies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity_stats: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          baby_id: string
          id: string
          last_updated: string | null
          session_count: number | null
          stat_date: string
          total_duration_seconds: number | null
          total_volume_ml: number | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          baby_id: string
          id?: string
          last_updated?: string | null
          session_count?: number | null
          stat_date: string
          total_duration_seconds?: number | null
          total_volume_ml?: number | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          baby_id?: string
          id?: string
          last_updated?: string | null
          session_count?: number | null
          stat_date?: string
          total_duration_seconds?: number | null
          total_volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_stats_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_measurements: {
        Row: {
          baby_id: string
          client_id: string | null
          created_at: string | null
          head_circumference_unit:
            | Database["public"]["Enums"]["unit_type"]
            | null
          head_circumference_value: number | null
          height_unit: Database["public"]["Enums"]["unit_type"] | null
          height_value: number | null
          id: string
          measured_at: string
          measured_by: string | null
          measured_time: string | null
          notes: string | null
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          updated_at: string | null
          weight_unit: Database["public"]["Enums"]["unit_type"] | null
          weight_value: number | null
        }
        Insert: {
          baby_id: string
          client_id?: string | null
          created_at?: string | null
          head_circumference_unit?:
            | Database["public"]["Enums"]["unit_type"]
            | null
          head_circumference_value?: number | null
          height_unit?: Database["public"]["Enums"]["unit_type"] | null
          height_value?: number | null
          id?: string
          measured_at?: string
          measured_by?: string | null
          measured_time?: string | null
          notes?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status_type"] | null
          updated_at?: string | null
          weight_unit?: Database["public"]["Enums"]["unit_type"] | null
          weight_value?: number | null
        }
        Update: {
          baby_id?: string
          client_id?: string | null
          created_at?: string | null
          head_circumference_unit?:
            | Database["public"]["Enums"]["unit_type"]
            | null
          head_circumference_value?: number | null
          height_unit?: Database["public"]["Enums"]["unit_type"] | null
          height_value?: number | null
          id?: string
          measured_at?: string
          measured_by?: string | null
          measured_time?: string | null
          notes?: string | null
          sync_status?: Database["public"]["Enums"]["sync_status_type"] | null
          updated_at?: string | null
          weight_unit?: Database["public"]["Enums"]["unit_type"] | null
          weight_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_measurements_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          analytics_enabled: boolean | null
          avatar_url: string | null
          client_id: string | null
          created_at: string | null
          data_sharing_enabled: boolean | null
          display_name: string | null
          features_enabled: Json | null
          haptic_enabled: boolean | null
          id: string
          last_sync_at: string | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          preferred_units: Json | null
          sound_enabled: boolean | null
          theme: string | null
          timezone: string
          updated_at: string | null
        }
        Insert: {
          analytics_enabled?: boolean | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string | null
          data_sharing_enabled?: boolean | null
          display_name?: string | null
          features_enabled?: Json | null
          haptic_enabled?: boolean | null
          id: string
          last_sync_at?: string | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          preferred_units?: Json | null
          sound_enabled?: boolean | null
          theme?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          analytics_enabled?: boolean | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string | null
          data_sharing_enabled?: boolean | null
          display_name?: string | null
          features_enabled?: Json | null
          haptic_enabled?: boolean | null
          id?: string
          last_sync_at?: string | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          preferred_units?: Json | null
          sound_enabled?: boolean | null
          theme?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      session_segments: {
        Row: {
          client_id: string
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          metadata: Json | null
          session_id: string
          started_at: string
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          started_at?: string
          sync_status?: Database["public"]["Enums"]["sync_status_type"] | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          started_at?: string
          sync_status?: Database["public"]["Enums"]["sync_status_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_segments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analyze_feeding_patterns: {
        Args: { p_baby_id: string; p_days_back?: number }
        Returns: Json
      }
      analyze_index_usage: {
        Args: Record<PropertyKey, never>
        Returns: {
          idx_scan: number
          idx_tup_read: number
          usage_ratio: number
          idx_tup_fetch: number
          schemaname: string
          tablename: string
          indexname: string
        }[]
      }
      archive_baby: {
        Args: { baby_id: string; reason?: string }
        Returns: boolean
      }
      calculate_age_in_months: {
        Args: { birth_date: string }
        Returns: number
      }
      calculate_growth_trends: {
        Args: { p_baby_id: string; p_measurement_count?: number }
        Returns: Json
      }
      calculate_session_duration_from_segments: {
        Args: { p_session_id: string }
        Returns: number
      }
      calculate_total_duration: {
        Args: { segments: Json }
        Returns: number
      }
      check_baby_milestones_and_alerts: {
        Args: { p_baby_id: string }
        Returns: Json
      }
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      date_immutable: {
        Args: { "": string }
        Returns: string
      }
      date_trunc_month_immutable: {
        Args: { "": string }
        Returns: string
      }
      date_trunc_week_immutable: {
        Args: { "": string }
        Returns: string
      }
      debug_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_type: string
          table_name: string
          policy_name: string
          policy_roles: string[]
        }[]
      }
      end_activity_session: {
        Args: {
          p_end_time?: string
          p_final_metadata?: Json
          p_session_id: string
        }
        Returns: boolean
      }
      end_session_segment: {
        Args: {
          p_end_time?: string
          p_final_metadata?: Json
          p_segment_id: string
        }
        Returns: boolean
      }
      generate_baby_report: {
        Args: { p_baby_id: string; p_end_date: string; p_start_date: string }
        Returns: Json
      }
      generate_client_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_active_babies: {
        Args: { user_id: string }
        Returns: {
          archive_reason: string | null
          avatar_url: string | null
          birth_location: string | null
          client_id: string | null
          color_theme: string | null
          created_at: string | null
          date_of_birth: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          gestational_age_weeks: number | null
          head_circumference_at_birth_unit:
            | Database["public"]["Enums"]["unit_type"]
            | null
          head_circumference_at_birth_value: number | null
          height_at_birth_unit: Database["public"]["Enums"]["unit_type"] | null
          height_at_birth_value: number | null
          id: string
          is_active: boolean | null
          medical_notes: string | null
          name: string
          nickname: string | null
          notes: string | null
          profile_id: string
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          time_of_birth: string | null
          updated_at: string | null
          weight_at_birth_unit: Database["public"]["Enums"]["unit_type"] | null
          weight_at_birth_value: number | null
        }[]
      }
      get_active_segment: {
        Args: { p_session_id: string }
        Returns: {
          client_id: string
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          metadata: Json | null
          session_id: string
          started_at: string
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          updated_at: string | null
        }
      }
      get_active_sessions: {
        Args: { p_baby_id: string }
        Returns: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          baby_id: string
          client_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          last_sync_attempt: string | null
          metadata: Json
          notes: string | null
          started_at: string
          sync_error: string | null
          sync_retry_count: number | null
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          total_duration_seconds: number | null
          updated_at: string | null
        }[]
      }
      get_activity_stats: {
        Args: { p_baby_id: string; p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_baby_age_info: {
        Args: { baby_id: string }
        Returns: Json
      }
      get_baby_from_session: {
        Args: { session_id: string }
        Returns: string
      }
      get_daily_feeding_summary: {
        Args: { p_baby_id: string; p_date?: string }
        Returns: Json
      }
      get_latest_measurements: {
        Args: { baby_id: string }
        Returns: {
          baby_id: string
          client_id: string | null
          created_at: string | null
          head_circumference_unit:
            | Database["public"]["Enums"]["unit_type"]
            | null
          head_circumference_value: number | null
          height_unit: Database["public"]["Enums"]["unit_type"] | null
          height_value: number | null
          id: string
          measured_at: string
          measured_by: string | null
          measured_time: string | null
          notes: string | null
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          updated_at: string | null
          weight_unit: Database["public"]["Enums"]["unit_type"] | null
          weight_value: number | null
        }
      }
      get_recent_sessions: {
        Args: { p_baby_id: string; p_hours_back?: number; p_limit?: number }
        Returns: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          baby_id: string
          client_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          last_sync_attempt: string | null
          metadata: Json
          notes: string | null
          started_at: string
          sync_error: string | null
          sync_retry_count: number | null
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          total_duration_seconds: number | null
          updated_at: string | null
        }[]
      }
      get_session_segments: {
        Args: { p_session_id: string }
        Returns: {
          client_id: string
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          metadata: Json | null
          session_id: string
          started_at: string
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          updated_at: string | null
        }[]
      }
      get_session_summary: {
        Args: { p_session_id: string }
        Returns: Json
      }
      get_sleep_pattern_analysis: {
        Args: { p_baby_id: string; p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_table_sizes: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          total_size: string
          indexes_size: string
          table_size: string
        }[]
      }
      get_user_timezone: {
        Args: { user_id: string }
        Returns: string
      }
      pause_session: {
        Args: { p_pause_metadata?: Json; p_session_id: string }
        Returns: boolean
      }
      resume_session: {
        Args: { p_resume_metadata?: Json; p_session_id: string }
        Returns: string
      }
      start_activity_session: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_baby_id: string
          p_client_id?: string
          p_metadata?: Json
        }
        Returns: string
      }
      start_session_segment: {
        Args: { p_client_id?: string; p_metadata?: Json; p_session_id: string }
        Returns: string
      }
      sync_session_duration: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      test_rls_policies: {
        Args: { test_baby_id: string; test_user_id: string }
        Returns: Json
      }
      update_session_metadata: {
        Args: { p_metadata: Json; p_session_id: string }
        Returns: boolean
      }
      update_user_preferences: {
        Args: {
          new_haptic_enabled?: boolean
          new_notifications_enabled?: boolean
          new_preferred_units?: Json
          new_sound_enabled?: boolean
          new_theme?: string
          new_timezone?: string
          user_id: string
        }
        Returns: boolean
      }
      user_owns_baby: {
        Args: { baby_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "nursing"
        | "bottle"
        | "pumping"
        | "sleep"
        | "nappy"
        | "tummy_time"
        | "play"
        | "bath"
        | "walk"
        | "massage"
      breast_side_type: "left" | "right" | "both"
      formula_type: "breast_milk" | "formula" | "mixed"
      gender_type: "male" | "female"
      nappy_type: "wet" | "dirty" | "both"
      sleep_location_type:
        | "crib"
        | "arms"
        | "carrier"
        | "stroller"
        | "bed"
        | "bassinet"
      sleep_quality_type: "good" | "fair" | "poor"
      sync_status_type: "pending" | "synced" | "conflict" | "error"
      unit_type: "ml" | "oz" | "kg" | "lb" | "cm" | "in"
    }
    CompositeTypes: {
      measurement: {
        value: number | null
        unit: Database["public"]["Enums"]["unit_type"] | null
      }
      session_segment: {
        started_at: string | null
        ended_at: string | null
        duration_seconds: number | null
        metadata: Json | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_type: [
        "nursing",
        "bottle",
        "pumping",
        "sleep",
        "nappy",
        "tummy_time",
        "play",
        "bath",
        "walk",
        "massage",
      ],
      breast_side_type: ["left", "right", "both"],
      formula_type: ["breast_milk", "formula", "mixed"],
      gender_type: ["male", "female"],
      nappy_type: ["wet", "dirty", "both"],
      sleep_location_type: [
        "crib",
        "arms",
        "carrier",
        "stroller",
        "bed",
        "bassinet",
      ],
      sleep_quality_type: ["good", "fair", "poor"],
      sync_status_type: ["pending", "synced", "conflict", "error"],
      unit_type: ["ml", "oz", "kg", "lb", "cm", "in"],
    },
  },
} as const

