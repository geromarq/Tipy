"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"
import { useSupabase } from "@/lib/supabase-provider"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export function Navbar() {
  const pathname = usePathname()
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
  }, [session])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      })
      // Forzar un refresh completo para limpiar el estado
      window.location.href = "/"
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-4">
          {!pathname.startsWith("/dj/") && (
            <Link href="/#features">
              <Button variant="ghost">Características</Button>
            </Link>
          )}
          {!pathname.startsWith("/dj/") && (
            <Link href="/#pricing">
              <Button variant="ghost">Precios</Button>
            </Link>
          )}
          {session ? (
            <>
              <Link href="/dj/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut}>
                Cerrar sesión
              </Button>
            </>
          ) : (
            <>
              <Link href="/dj/login">
                <Button variant="outline">Iniciar sesión</Button>
              </Link>
              <Link href="/dj/register">
                <Button>Registrarse</Button>
              </Link>
            </>
          )}
          <ModeToggle />
        </nav>
      </div>
    </header>
  )
}

