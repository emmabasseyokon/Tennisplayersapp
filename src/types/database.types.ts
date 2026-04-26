export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Gender = 'male' | 'female'

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
      players: {
        Row: {
          id: string
          full_name: string
          date_of_birth: string
          gender: Gender
          dob_document_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          date_of_birth: string
          gender: Gender
          dob_document_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          date_of_birth?: string
          gender?: Gender
          dob_document_url?: string | null
          notes?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      age_years: {
        Args: { dob: string; ref?: string }
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Player  = Database['public']['Tables']['players']['Row']
