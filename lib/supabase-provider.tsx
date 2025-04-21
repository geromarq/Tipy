"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient, Session } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"

type SupabaseContext = {
  supabase: SupabaseClient<Database>
  session: Session | null
}

// Crear el contexto
const Context = createContext<SupabaseContext | undefined>(undefined)

// Crear una única instancia del cliente de Supabase fuera del componente
// para evitar múltiples instancias
let supabaseInstance: SupabaseClient<Database> | null = null

const getSupabaseClient = () => {
  if (!supabaseInstance) {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error("Faltan variables de entorno de Supabase")
      }
      supabaseInstance = createClientComponentClient<Database>()
    } catch (e) {
      console.error("Error al crear el cliente de Supabase:", e)
      // Devolver un cliente vacío para evitar errores de tipo
      supabaseInstance = createClientComponentClient<Database>({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.com",
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "example-key",
      })
    }
  }
  return supabaseInstance
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Verificar si las variables de entorno están disponibles
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [supabase] = useState(() => getSupabaseClient())

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError("Faltan variables de entorno de Supabase")
      setIsLoading(false)
      return
    }

    const getSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      if (error) {
        console.error("Error al obtener la sesión:", error)
      }
      setSession(session)
      setIsLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Mostrar un mensaje de error si faltan las variables de entorno
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error de configuración</h1>
        <p className="mb-4">{error}</p>
        <p className="text-sm text-muted-foreground">
          Por favor, asegúrate de que las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
          estén configuradas correctamente en tu proyecto.
        </p>
      </div>
    )
  }

  // Mostrar un indicador de carga mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-center text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return <Context.Provider value={{ supabase, session }}>{children}</Context.Provider>
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider")
  }
  return context
}
