export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'admin'
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role?: 'admin'
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: 'admin'
          avatar_url?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          id: string
          full_name: string
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
        }
        Relationships: []
      }
      weeks: {
        Row: {
          id: string
          label: string
          start_date: string
          end_date: string
          is_locked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          label: string
          start_date: string
          end_date: string
          is_locked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          label?: string
          start_date?: string
          end_date?: string
          is_locked?: boolean
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          week_id: string
          name: string
          points: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          week_id: string
          name: string
          points: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          points?: number
          sort_order?: number
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          id: string
          week_id: string
          member_id: string
          task_id: string
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          week_id: string
          member_id: string
          task_id: string
          recorded_by?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: {
      weekly_scores: {
        Row: {
          week_id: string
          week_label: string
          start_date: string
          member_id: string
          full_name: string
          total_points: number
          rank: number
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type Week = Database['public']['Tables']['weeks']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskCompletion = Database['public']['Tables']['task_completions']['Row']
export type WeeklyScore = Database['public']['Views']['weekly_scores']['Row']
