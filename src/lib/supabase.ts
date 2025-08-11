import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role key (for API routes)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept-Charset': 'utf-8'
    }
  },
  auth: {
    persistSession: false
  }
})

// Client-side instance with anon key (for frontend components)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept-Charset': 'utf-8'
      }
    },
    auth: {
      persistSession: true
    }
  }
)

// Database type definitions for better TypeScript support
export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string
          created_at: string
          ended_at: string | null
          created_by: string
          settings: any
          stats: any
          session_code: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string
          created_at?: string
          ended_at?: string | null
          created_by: string
          settings: any
          stats: any
          session_code?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string
          created_at?: string
          ended_at?: string | null
          created_by?: string
          settings?: any
          stats?: any
          session_code?: string | null
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          session_id: string
          max_members: number
          is_complete: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          session_id: string
          max_members?: number
          is_complete?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          session_id?: string
          max_members?: number
          is_complete?: boolean
          created_at?: string
        }
      }
      applicants: {
        Row: {
          id: string
          team_id: string | null
          name: string
          occupation: string
          years_of_experience: number
          experience_unit: string
          skills: string[]
          personality_traits: string[]
          submitted_at: string
        }
        Insert: {
          id?: string
          team_id?: string | null
          name: string
          occupation: string
          years_of_experience: number
          experience_unit?: string
          skills: string[]
          personality_traits: string[]
          submitted_at?: string
        }
        Update: {
          id?: string
          team_id?: string | null
          name?: string
          occupation?: string
          years_of_experience?: number
          experience_unit?: string
          skills?: string[]
          personality_traits?: string[]
          submitted_at?: string
        }
      }
      assignment_sessions: {
        Row: {
          id: string
          team_id: string
          session_id: string
          roles: any
          score_matrix: any | null
          assignment: any | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          session_id: string
          roles: any
          score_matrix?: any | null
          assignment?: any | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          session_id?: string
          roles?: any
          score_matrix?: any | null
          assignment?: any | null
          status?: string
          created_at?: string
        }
      }
    }
  }
}