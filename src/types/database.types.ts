export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'admin' | 'member'
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role?: 'admin' | 'member'
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: 'admin' | 'member'
          avatar_url?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          name: string
          description: string | null
          points: number
          is_active: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          points: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          points?: number
          is_active?: boolean
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
      submissions: {
        Row: {
          id: string
          week_id: string
          member_id: string
          task_id: string
          points: number
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          week_id: string
          member_id: string
          task_id: string
          points: number
          recorded_by?: string | null
          created_at?: string
        }
        Update: {
          points?: number
        }
        Relationships: []
      }
      announcements: {
        Row: {
          id: string
          title: string
          body: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          body?: string
        }
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
export type Task = Database['public']['Tables']['tasks']['Row']
export type Week = Database['public']['Tables']['weeks']['Row']
export type Submission = Database['public']['Tables']['submissions']['Row']
export type Announcement = Database['public']['Tables']['announcements']['Row']
export type WeeklyScore = Database['public']['Views']['weekly_scores']['Row']
