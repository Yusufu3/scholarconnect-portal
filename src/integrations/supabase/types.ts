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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_config: {
        Row: {
          id: number
          password_hash: string
        }
        Insert: {
          id?: number
          password_hash: string
        }
        Update: {
          id?: number
          password_hash?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          expires_at: string
          token_hash: string
        }
        Insert: {
          expires_at: string
          token_hash: string
        }
        Update: {
          expires_at?: string
          token_hash?: string
        }
        Relationships: []
      }
      eligible_students: {
        Row: {
          created_at: string
          full_name: string
          id: string
          institution: string
          programme: string | null
          reg_number: string | null
          sn: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          institution?: string
          programme?: string | null
          reg_number?: string | null
          sn?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          institution?: string
          programme?: string | null
          reg_number?: string | null
          sn?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          eligibility_status: string
          eligible_student_id: string | null
          first_name: string
          id: string
          middle_name: string | null
          personal_account_number: string
          programme: string
          reg_number: string
          surname: string
          year_of_study: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          eligibility_status?: string
          eligible_student_id?: string | null
          first_name: string
          id?: string
          middle_name?: string | null
          personal_account_number: string
          programme: string
          reg_number: string
          surname: string
          year_of_study: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          eligibility_status?: string
          eligible_student_id?: string | null
          first_name?: string
          id?: string
          middle_name?: string | null
          personal_account_number?: string
          programme?: string
          reg_number?: string
          surname?: string
          year_of_study?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_eligible_student_id_fkey"
            columns: ["eligible_student_id"]
            isOneToOne: true
            referencedRelation: "eligible_students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      izf_admin_create_student: {
        Args: {
          _full_name: string
          _institution: string
          _programme: string
          _reg_number: string
          _sn: number
          _token: string
        }
        Returns: undefined
      }
      izf_admin_delete_registration: {
        Args: { _id: string; _token: string }
        Returns: undefined
      }
      izf_admin_delete_student: {
        Args: { _id: string; _token: string }
        Returns: undefined
      }
      izf_admin_list: { Args: { _token: string }; Returns: Json }
      izf_admin_login: { Args: { _password: string }; Returns: string }
      izf_admin_status: { Args: { _token: string }; Returns: boolean }
      izf_admin_update_student: {
        Args: {
          _full_name: string
          _id: string
          _institution: string
          _programme: string
          _reg_number: string
          _sn: number
          _token: string
        }
        Returns: undefined
      }
      izf_candidates: {
        Args: never
        Returns: {
          full_name: string
          id: string
          programme: string
          registered: boolean
        }[]
      }
      izf_check_admin: { Args: { _token: string }; Returns: undefined }
      izf_submit_registration: {
        Args: {
          _bank_account_name: string
          _bank_account_number: string
          _bank_name: string
          _eligible_student_id: string
          _first_name: string
          _middle_name: string
          _pan: string
          _programme: string
          _reg_number: string
          _surname: string
          _year: string
        }
        Returns: Json
      }
      izf_update_bank_details: {
        Args: {
          _bank_account_name: string
          _bank_account_number: string
          _bank_name: string
          _eligible_student_id: string
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
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
