export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      djs: {
        Row: {
          id: string
          email: string
          username: string
          display_name: string
          min_tip_amount: number
          created_at: string
          updated_at: string | null
          password_hash: string // Añadido el campo password_hash
        }
        Insert: {
          id: string
          email: string
          username: string
          display_name: string
          min_tip_amount?: number
          created_at?: string
          updated_at?: string | null
          password_hash: string // Añadido el campo password_hash
        }
        Update: {
          id?: string
          email?: string
          username?: string
          display_name?: string
          min_tip_amount?: number
          created_at?: string
          updated_at?: string | null
          password_hash?: string // Añadido el campo password_hash
        }
      }
      qr_codes: {
        Row: {
          id: string
          dj_id: string
          code: string
          active: boolean
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          dj_id: string
          code: string
          active?: boolean
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          dj_id?: string
          code?: string
          active?: boolean
          created_at?: string
          expires_at?: string | null
        }
      }
      recommendations: {
        Row: {
          id: string
          dj_id: string
          client_id: string
          message: string | null
          spotify_link: string | null
          is_priority: boolean
          accepted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          dj_id: string
          client_id: string
          message?: string | null
          spotify_link?: string | null
          is_priority?: boolean
          accepted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          dj_id?: string
          client_id?: string
          message?: string | null
          spotify_link?: string | null
          is_priority?: boolean
          accepted?: boolean
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          recommendation_id: string | null
          dj_id: string
          amount: number
          mercadopago_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          recommendation_id?: string | null
          dj_id: string
          amount: number
          mercadopago_id: string
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          recommendation_id?: string | null
          dj_id?: string
          amount?: number
          mercadopago_id?: string
          status?: string
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          phone: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          created_at?: string
        }
      }
      withdrawals: {
        Row: {
          id: string
          dj_id: string
          amount: number
          status: string
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          dj_id: string
          amount: number
          status: string
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          dj_id?: string
          amount?: number
          status?: string
          created_at?: string
          processed_at?: string | null
        }
      }
      bank_details: {
        Row: {
          id: string
          withdrawal_id: string
          dj_id: string
          bank_name: string
          account_number: string
          created_at: string
        }
        Insert: {
          id?: string
          withdrawal_id: string
          dj_id: string
          bank_name: string
          account_number: string
          created_at?: string
        }
        Update: {
          id?: string
          withdrawal_id?: string
          dj_id?: string
          bank_name?: string
          account_number?: string
          created_at?: string
        }
      }
    }
  }
}
