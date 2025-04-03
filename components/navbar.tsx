"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useSupabase } from "@/lib/supabase-provider"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function Navbar() {
  const pathname = usePathname()
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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

  const navItems = [
    {
      label: "Características",
      href: "/#features",
      show: !pathname.startsWith("/dj/"),
    },
    {
      label: "Precios",
      href: "/#pricing",
      show: !pathname.startsWith("/dj/"),
    },
    {
      label: "Dashboard",
      href: "/dj/dashboard",
      show: !!session,
    },
  ]

  const authItems = session
    ? [
        {
          label: "Cerrar sesión",
          action: handleSignOut,
          variant: "outline" as const,
        },
      ]
    : [
        {
          label: "Iniciar sesión",
          href: "/dj/login",
          variant: "outline" as const,
        },
        {
          label: "Registrarse",
          href: "/dj/register",
          variant: "default" as const,
        },
      ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {navItems
            .filter((item) => item.show)
            .map((item, index) => (
              <Link key={index} href={item.href}>
                <Button variant="ghost">{item.label}</Button>
              </Link>
            ))}

          {authItems.map((item, index) =>
            item.href ? (
              <Link key={index} href={item.href}>
                <Button variant={item.variant}>{item.label}</Button>
              </Link>
            ) : (
              <Button key={index} variant={item.variant} onClick={item.action}>
                {item.label}
              </Button>
            ),
          )}
        </nav>

        {/* Mobile Navigation */}
        <div className="flex items-center md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px]">
              <div className="flex flex-col h-full py-6">
                <div className="flex flex-col gap-4">
                  {navItems
                    .filter((item) => item.show)
                    .map((item, index) => (
                      <Link key={index} href={item.href} onClick={() => setIsMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          {item.label}
                        </Button>
                      </Link>
                    ))}
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  {authItems.map((item, index) =>
                    item.href ? (
                      <Link key={index} href={item.href} onClick={() => setIsMenuOpen(false)}>
                        <Button variant={item.variant} className="w-full">
                          {item.label}
                        </Button>
                      </Link>
                    ) : (
                      <Button key={index} variant={item.variant} onClick={item.action} className="w-full">
                        {item.label}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

