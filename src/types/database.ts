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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          model_used: string | null
          organization_id: string
          questions_generated: number
          quiz_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          model_used?: string | null
          organization_id: string
          questions_generated: number
          quiz_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          model_used?: string | null
          organization_id?: string
          questions_generated?: number
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_log_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_answers: {
        Row: {
          attempt_id: string
          created_at: string | null
          difficulty_at_time: string
          display_order: number
          id: string
          is_correct: boolean | null
          options_order: string
          organization_id: string
          question_id: string
          selected_option: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          attempt_id: string
          created_at?: string | null
          difficulty_at_time: string
          display_order: number
          id?: string
          is_correct?: boolean | null
          options_order: string
          organization_id: string
          question_id: string
          selected_option?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          attempt_id?: string
          created_at?: string | null
          difficulty_at_time?: string
          display_order?: number
          id?: string
          is_correct?: boolean | null
          options_order?: string
          organization_id?: string
          question_id?: string
          selected_option?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pool_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          attempt_id: string
          certificate_number: string
          course_id: string
          created_at: string | null
          id: string
          issued_at: string | null
          organization_id: string
          quiz_id: string
          score: number
          student_id: string
        }
        Insert: {
          attempt_id: string
          certificate_number: string
          course_id: string
          created_at?: string | null
          id?: string
          issued_at?: string | null
          organization_id: string
          quiz_id: string
          score: number
          student_id: string
        }
        Update: {
          attempt_id?: string
          certificate_number?: string
          course_id?: string
          created_at?: string | null
          id?: string
          issued_at?: string | null
          organization_id?: string
          quiz_id?: string
          score?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_uploads: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          organization_id: string
          original_filename: string | null
          raw_text: string
          source_type: string
          uploaded_by: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          original_filename?: string | null
          raw_text: string
          source_type: string
          uploaded_by: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          original_filename?: string | null
          raw_text?: string
          source_type?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_uploads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_uploads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          invite_code: string
          invite_code_expires_at: string | null
          max_students: number
          name: string
          organization_id: string
          status: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          invite_code: string
          invite_code_expires_at?: string | null
          max_students?: number
          name: string
          organization_id: string
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          invite_code_expires_at?: string | null
          max_students?: number
          name?: string
          organization_id?: string
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          organization_id: string
          resend_id: string | null
          status: string
          subject: string
          template: string
          to_email: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          organization_id: string
          resend_id?: string | null
          status?: string
          subject: string
          template: string
          to_email: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string
          resend_id?: string | null
          status?: string
          subject?: string
          template?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          course_id: string
          created_at: string | null
          id: string
          organization_id: string
          rejected_reason: string | null
          status: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          rejected_reason?: string | null
          status?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          rejected_reason?: string | null
          status?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          course_id: string
          created_at: string | null
          created_by: string
          expires_at: string
          id: string
          is_active: boolean | null
          max_uses: number
          organization_id: string
          used_count: number | null
        }
        Insert: {
          code: string
          course_id: string
          created_at?: string | null
          created_by: string
          expires_at: string
          id?: string
          is_active?: boolean | null
          max_uses?: number
          organization_id: string
          used_count?: number | null
        }
        Update: {
          code?: string
          course_id?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number
          organization_id?: string
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          organization_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          organization_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          organization_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          branding: Json | null
          created_at: string | null
          gemini_api_key: string | null
          id: string
          notification_prefs: Json | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          branding?: Json | null
          created_at?: string | null
          gemini_api_key?: string | null
          id?: string
          notification_prefs?: Json | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          branding?: Json | null
          created_at?: string | null
          gemini_api_key?: string | null
          id?: string
          notification_prefs?: Json | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          is_suspended: boolean
          logo_url: string | null
          name: string
          owner_id: string
          plan: string
          plan_expires_at: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_suspended?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          plan?: string
          plan_expires_at?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_suspended?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          plan?: string
          plan_expires_at?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plan_limits"
            referencedColumns: ["plan"]
          },
        ]
      }
      plan_limits: {
        Row: {
          has_anti_cheat_full: boolean | null
          has_csv_export: boolean | null
          has_custom_branding: boolean | null
          has_white_label: boolean | null
          max_ai_questions_per_day: number
          max_courses: number
          max_quiz_attempts: number
          max_students_per_course: number
          max_sub_admins: number
          plan: string
          pool_multiplier: number
          price_monthly: number
        }
        Insert: {
          has_anti_cheat_full?: boolean | null
          has_csv_export?: boolean | null
          has_custom_branding?: boolean | null
          has_white_label?: boolean | null
          max_ai_questions_per_day: number
          max_courses: number
          max_quiz_attempts: number
          max_students_per_course: number
          max_sub_admins: number
          plan: string
          pool_multiplier: number
          price_monthly?: number
        }
        Update: {
          has_anti_cheat_full?: boolean | null
          has_csv_export?: boolean | null
          has_custom_branding?: boolean | null
          has_white_label?: boolean | null
          max_ai_questions_per_day?: number
          max_courses?: number
          max_quiz_attempts?: number
          max_students_per_course?: number
          max_sub_admins?: number
          plan?: string
          pool_multiplier?: number
          price_monthly?: number
        }
        Relationships: []
      }
      pool_questions: {
        Row: {
          correct_option: string
          created_at: string | null
          difficulty: string
          explanation: string | null
          generated_by_ai: boolean
          id: string
          is_approved: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          organization_id: string
          pool_id: string
          question_text: string
          sort_order: number | null
        }
        Insert: {
          correct_option: string
          created_at?: string | null
          difficulty: string
          explanation?: string | null
          generated_by_ai?: boolean
          id?: string
          is_approved?: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          organization_id: string
          pool_id: string
          question_text: string
          sort_order?: number | null
        }
        Update: {
          correct_option?: string
          created_at?: string | null
          difficulty?: string
          explanation?: string | null
          generated_by_ai?: boolean
          id?: string
          is_approved?: boolean
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          organization_id?: string
          pool_id?: string
          question_text?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pool_questions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_questions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "quiz_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          organization_id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          organization_id: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          attempt_number: number
          created_at: string | null
          current_difficulty: string
          id: string
          is_best_attempt: boolean | null
          organization_id: string
          questions_answered: number
          quiz_id: string
          score: number | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          time_remaining_seconds: number | null
          time_taken_seconds: number | null
          total_correct: number | null
          total_questions: number
        }
        Insert: {
          attempt_number: number
          created_at?: string | null
          current_difficulty?: string
          id?: string
          is_best_attempt?: boolean | null
          organization_id: string
          questions_answered?: number
          quiz_id: string
          score?: number | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          time_remaining_seconds?: number | null
          time_taken_seconds?: number | null
          total_correct?: number | null
          total_questions: number
        }
        Update: {
          attempt_number?: number
          created_at?: string | null
          current_difficulty?: string
          id?: string
          is_best_attempt?: boolean | null
          organization_id?: string
          questions_answered?: number
          quiz_id?: string
          score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          time_remaining_seconds?: number | null
          time_taken_seconds?: number | null
          total_correct?: number | null
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_event_stream: {
        Row: {
          attempt_id: string
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          organization_id: string
          student_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
          student_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_event_stream_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_event_stream_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_event_stream_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_pools: {
        Row: {
          created_at: string | null
          easy_count: number
          generated_by: string | null
          hard_count: number
          id: string
          medium_count: number
          organization_id: string
          quiz_id: string
          total_questions: number
        }
        Insert: {
          created_at?: string | null
          easy_count: number
          generated_by?: string | null
          hard_count: number
          id?: string
          medium_count: number
          organization_id: string
          quiz_id: string
          total_questions: number
        }
        Update: {
          created_at?: string | null
          easy_count?: number
          generated_by?: string | null
          hard_count?: number
          id?: string
          medium_count?: number
          organization_id?: string
          quiz_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_pools_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_pools_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: true
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string
          description: string | null
          difficulty_mode: string
          id: string
          max_attempts: number
          organization_id: string
          passing_score: number
          pool_multiplier: number
          published_at: string | null
          questions_to_show: number
          review_comment: string | null
          reviewed_by: string | null
          status: string
          time_limit_minutes: number | null
          title: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          difficulty_mode?: string
          id?: string
          max_attempts?: number
          organization_id: string
          passing_score?: number
          pool_multiplier?: number
          published_at?: string | null
          questions_to_show?: number
          review_comment?: string | null
          reviewed_by?: string | null
          status?: string
          time_limit_minutes?: number | null
          title: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          difficulty_mode?: string
          id?: string
          max_attempts?: number
          organization_id?: string
          passing_score?: number
          pool_multiplier?: number
          published_at?: string | null
          questions_to_show?: number
          review_comment?: string | null
          reviewed_by?: string | null
          status?: string
          time_limit_minutes?: number | null
          title?: string
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_admin_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_admin_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_admin_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_admin_permissions: {
        Row: {
          approve_quiz: boolean | null
          create_course: boolean | null
          create_quiz: boolean | null
          created_at: string | null
          delete_course: boolean | null
          edit_course: boolean | null
          id: string
          manage_enrollments: boolean | null
          manage_settings: boolean | null
          organization_id: string
          updated_at: string | null
          user_id: string
          view_analytics: boolean | null
          view_students: boolean | null
        }
        Insert: {
          approve_quiz?: boolean | null
          create_course?: boolean | null
          create_quiz?: boolean | null
          created_at?: string | null
          delete_course?: boolean | null
          edit_course?: boolean | null
          id?: string
          manage_enrollments?: boolean | null
          manage_settings?: boolean | null
          organization_id: string
          updated_at?: string | null
          user_id: string
          view_analytics?: boolean | null
          view_students?: boolean | null
        }
        Update: {
          approve_quiz?: boolean | null
          create_course?: boolean | null
          create_quiz?: boolean | null
          created_at?: string | null
          delete_course?: boolean | null
          edit_course?: boolean | null
          id?: string
          manage_enrollments?: boolean | null
          manage_settings?: boolean | null
          organization_id?: string
          updated_at?: string | null
          user_id?: string
          view_analytics?: boolean | null
          view_students?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_admin_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_admin_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // Test-only: tears down a throwaway academy created by the
      // automated RLS tests. Refuses any organization whose name does not
      // start with the test prefix, and is callable only by service_role.
      delete_test_organization: {
        Args: {
          p_org_id: string
        }
        Returns: undefined
      }
      current_org: { Args: never; Returns: string }
      dashboard_attempts_per_day: {
        Args: {
          p_course_id?: string
          p_from: string
          p_quiz_id?: string
          p_to: string
        }
        Returns: {
          attempt_count: number
          day: string
        }[]
      }
      dashboard_avg_score_per_quiz: {
        Args: {
          p_course_id?: string
          p_from: string
          p_quiz_id?: string
          p_to: string
        }
        Returns: {
          attempt_count: number
          avg_percentage: number
          passing_percent: number
          quiz_id: string
          quiz_title: string
        }[]
      }
      dashboard_difficulty_breakdown: {
        Args: {
          p_course_id?: string
          p_from: string
          p_quiz_id?: string
          p_to: string
        }
        Returns: {
          correct_count: number
          difficulty: string
          wrong_count: number
        }[]
      }
      dashboard_pass_fail: {
        Args: {
          p_course_id?: string
          p_from: string
          p_quiz_id?: string
          p_to: string
        }
        Returns: {
          failed_count: number
          passed_count: number
        }[]
      }
      dashboard_student_performance: {
        Args: {
          p_course_id?: string
          p_from: string
          p_quiz_id?: string
          p_to: string
        }
        Returns: {
          attempt_count: number
          avg_percentage: number
          email: string
          full_name: string
          latest_passed: boolean
          student_id: string
        }[]
      }
      dashboard_weak_questions: {
        Args: {
          p_course_id?: string
          p_from: string
          p_quiz_id?: string
          p_to: string
        }
        Returns: {
          difficulty: string
          question_id: string
          question_text: string
          quiz_id: string
          quiz_title: string
          times_shown: number
          times_wrong: number
          wrong_percent: number
        }[]
      }
      is_org_admin: { Args: { check_user_id: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
