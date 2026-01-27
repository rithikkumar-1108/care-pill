export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      caregiver_links: {
        Row: {
          accepted_at: string | null
          caregiver_id: string
          created_at: string
          id: string
          invitation_token: string | null
          patient_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          caregiver_id: string
          created_at?: string
          id?: string
          invitation_token?: string | null
          patient_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          caregiver_id?: string
          created_at?: string
          id?: string
          invitation_token?: string | null
          patient_id?: string
          status?: string
        }
        Relationships: []
      }
      dose_logs: {
        Row: {
          created_at: string
          id: string
          medicine_id: string
          notes: string | null
          scheduled_date: string
          session_type: Database["public"]["Enums"]["session_type"]
          status: Database["public"]["Enums"]["dose_status"]
          taken_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id: string
          notes?: string | null
          scheduled_date: string
          session_type: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["dose_status"]
          taken_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string
          notes?: string | null
          scheduled_date?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["dose_status"]
          taken_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dose_logs_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_sessions: {
        Row: {
          created_at: string
          id: string
          medicine_id: string
          session_type: Database["public"]["Enums"]["session_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id: string
          session_type: Database["public"]["Enums"]["session_type"]
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string
          session_type?: Database["public"]["Enums"]["session_type"]
        }
        Relationships: [
          {
            foreignKeyName: "medicine_sessions_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          created_at: string
          dosage: string
          dosage_unit: string
          end_date: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_active: boolean | null
          low_stock_threshold: number
          name: string
          start_date: string
          stock_quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dosage: string
          dosage_unit?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number
          name: string
          start_date: string
          stock_quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dosage?: string
          dosage_unit?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number
          name?: string
          start_date?: string
          stock_quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          notification_type: string
          recipient_email: string | null
          recipient_phone: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          notification_type: string
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          notification_type?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          caregiver_email: string | null
          caregiver_name: string | null
          caregiver_phone: string | null
          created_at: string
          full_name: string
          gender: string | null
          health_condition: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          caregiver_email?: string | null
          caregiver_name?: string | null
          caregiver_phone?: string | null
          created_at?: string
          full_name: string
          gender?: string | null
          health_condition?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          caregiver_email?: string | null
          caregiver_name?: string | null
          caregiver_phone?: string | null
          created_at?: string
          full_name?: string
          gender?: string | null
          health_condition?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_schedules: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          scheduled_time: string
          session_type: Database["public"]["Enums"]["session_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          scheduled_time: string
          session_type: Database["public"]["Enums"]["session_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          scheduled_time?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean | null
          medicine_id: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          medicine_id: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          medicine_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_caregiver_of: {
        Args: { _caregiver_id: string; _patient_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "caregiver"
      dose_status: "pending" | "taken" | "missed" | "skipped"
      session_type: "morning" | "afternoon" | "night"
      stock_status: "good" | "low" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never
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
  public: {
    Enums: {
      app_role: ["admin", "user", "caregiver"],
      dose_status: ["pending", "taken", "missed", "skipped"],
      session_type: ["morning", "afternoon", "night"],
      stock_status: ["good", "low", "critical"],
    },
  },
} as const
