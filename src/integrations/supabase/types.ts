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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          attempt_id: string
          created_at: string
          feedback: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          score: number | null
          selected: string[]
          text_answer: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          score?: number | null
          selected?: string[]
          text_answer?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          score?: number | null
          selected?: string[]
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          actor_role: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_name?: string
          actor_role?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          actor_role?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      class_students: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          id: string
          student_id: string
          subject_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          id?: string
          student_id: string
          subject_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          id?: string
          student_id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          major: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          major?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          major?: string | null
          name?: string
        }
        Relationships: []
      }
      curricula: {
        Row: {
          academic_year: string
          class_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          school_name: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          school_name?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          school_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curricula_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_versions: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string
          curriculum_id: string
          id: string
          note: string | null
          snapshot: Json
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          curriculum_id: string
          id?: string
          note?: string | null
          snapshot?: Json
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          curriculum_id?: string
          id?: string
          note?: string | null
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_versions_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          attempt_number: number
          auto_score: number
          exam_id: string
          id: string
          leave_attempts: number
          manual_score: number
          max_score: number
          session_token: string | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          tab_switches: number
        }
        Insert: {
          attempt_number?: number
          auto_score?: number
          exam_id: string
          id?: string
          leave_attempts?: number
          manual_score?: number
          max_score?: number
          session_token?: string | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          tab_switches?: number
        }
        Update: {
          attempt_number?: number
          auto_score?: number
          exam_id?: string
          id?: string
          leave_attempts?: number
          manual_score?: number
          max_score?: number
          session_token?: string | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          tab_switches?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          end_at: string | null
          id: string
          is_published: boolean
          max_attempts: number
          meeting_id: string
          score_policy: string
          start_at: string | null
          subject_id: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          end_at?: string | null
          id?: string
          is_published?: boolean
          max_attempts?: number
          meeting_id: string
          score_policy?: string
          start_at?: string | null
          subject_id: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          end_at?: string | null
          id?: string
          is_published?: boolean
          max_attempts?: number
          meeting_id?: string
          score_policy?: string
          start_at?: string | null
          subject_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          order_index: number
          subject_id: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          order_index?: number
          subject_id: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          order_index?: number
          subject_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          class_name: string | null
          created_at: string
          full_name: string
          id: string
          identifier: string | null
          major: string | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string
          full_name?: string
          id: string
          identifier?: string | null
          major?: string | null
        }
        Update: {
          class_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          identifier?: string | null
          major?: string | null
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          class_id: string | null
          content: string
          correct_answers: string[]
          created_at: string
          id: string
          options: Json
          owner_id: string
          points: number
          subject_id: string | null
          type: string
        }
        Insert: {
          class_id?: string | null
          content: string
          correct_answers?: string[]
          created_at?: string
          id?: string
          options?: Json
          owner_id: string
          points?: number
          subject_id?: string | null
          type?: string
        }
        Update: {
          class_id?: string | null
          content?: string
          correct_answers?: string[]
          created_at?: string
          id?: string
          options?: Json
          owner_id?: string
          points?: number
          subject_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          content: string
          correct_answers: string[]
          created_at: string
          exam_id: string
          id: string
          image_url: string | null
          options: Json
          order_index: number
          points: number
          type: string
        }
        Insert: {
          content: string
          correct_answers?: string[]
          created_at?: string
          exam_id: string
          id?: string
          image_url?: string | null
          options?: Json
          order_index?: number
          points?: number
          type?: string
        }
        Update: {
          content?: string
          correct_answers?: string[]
          created_at?: string
          exam_id?: string
          id?: string
          image_url?: string | null
          options?: Json
          order_index?: number
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          category: string
          code: string
          created_at: string
          curriculum_id: string | null
          hours: number
          id: string
          name: string
          order_index: number
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          curriculum_id?: string | null
          hours?: number
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          curriculum_id?: string | null
          hours?: number
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "subjects_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      ensure_profile: {
        Args: {
          _class_name?: string
          _full_name?: string
          _identifier?: string
        }
        Returns: undefined
      }
      get_exam_questions: {
        Args: { _exam_id: string }
        Returns: {
          content: string
          id: string
          image_url: string
          options: Json
          order_index: number
          points: number
          type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_attempt_violation: {
        Args: { _attempt_id: string; _kind: string }
        Returns: {
          attempt_number: number
          auto_score: number
          exam_id: string
          id: string
          leave_attempts: number
          manual_score: number
          max_score: number
          session_token: string | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          tab_switches: number
        }[]
        SetofOptions: {
          from: "*"
          to: "exam_attempts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recalc_manual_score: { Args: { _attempt_id: string }; Returns: undefined }
      start_attempt: {
        Args: { _exam_id: string; _session_token: string }
        Returns: {
          attempt_number: number
          auto_score: number
          exam_id: string
          id: string
          leave_attempts: number
          manual_score: number
          max_score: number
          session_token: string | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          tab_switches: number
        }[]
        SetofOptions: {
          from: "*"
          to: "exam_attempts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      submit_attempt: { Args: { _attempt_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "guru" | "siswa"
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
      app_role: ["admin", "guru", "siswa"],
    },
  },
} as const
