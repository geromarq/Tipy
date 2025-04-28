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
          password_hash: string
          ganancias_totales: number // Nuevo campo
          balance: number // Nuevo campo
        }
        Insert: {
          id: string
          email: string
          username: string
          display_name: string
          min_tip_amount?: number
          created_at?: string
          updated_at?: string | null
          password_hash: string
          ganancias_totales?: number // Nuevo campo opcional
          balance?: number // Nuevo campo opcional
        }
        Update: {
          id?: string
          email?: string
          username?: string
          display_name?: string
          min_tip_amount?: number
          created_at?: string
          updated_at?: string | null
          password_hash?: string
          ganancias_totales?: number // Nuevo campo opcional
          balance?: number // Nuevo campo opcional
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
          expires_at: string | null // Nuevo campo
          is_expired: boolean // Nuevo campo
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
          expires_at?: string | null // Nuevo campo opcional
          is_expired?: boolean // Nuevo campo opcional
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
          expires_at?: string | null // Nuevo campo opcional
          is_expired?: boolean // Nuevo campo opcional
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
          mercadopago_payment_id: string | null // Campo para almacenar el ID real de Mercado Pago
        }
        Insert: {
          id?: string
          recommendation_id?: string | null
          dj_id: string
          amount: number
          mercadopago_id: string
          status: string
          created_at?: string
          mercadopago_payment_id?: string | null
        }
        Update: {
          id?: string
          recommendation_id?: string | null
          dj_id?: string
          amount?: number
          mercadopago_id?: string
          status?: string
          created_at?: string
          mercadopago_payment_id?: string | null
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
      suggestion_config: {
        Row: {
          id: string
          dj_id: string
          expiration_time: number
          auto_reject_expired: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dj_id: string
          expiration_time?: number
          auto_reject_expired?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dj_id?: string
          expiration_time?: number
          auto_reject_expired?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      mercadopago_webhooks: {
        Row: {
          id: number
          payment_id: string
          external_reference: string
          status: string
          webhook_data: Json
          created_at: string
        }
        Insert: {
          id?: number
          payment_id: string
          external_reference: string
          status: string
          webhook_data: Json
          created_at?: string
        }
        Update: {
          id?: number
          payment_id?: string
          external_reference?: string
          status?: string
          webhook_data?: Json
          created_at?: string
        }
      }
    }
  }
}
