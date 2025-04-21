"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { DashboardNav } from "@/app/dj/dashboard/components/dashboard-nav"
import { Navbar } from "@/components/navbar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { supabase, session } = useSupabase()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [djProfile, setDjProfile] = useState<any>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    // Simplificamos la verificación: solo comprobamos si hay sesión
    if (!session) {
      router.push("/dj/login")
      return
    }

    // Cargar el perfil del DJ
    const fetchDjProfile = async () => {
      try {
        const { data, error } = await supabase.from("djs").select("*").eq("id", session.user.id).single()

        if (!error && data) {
          setDjProfile(data)
        }
      } catch (error) {
        console.error("Error al cargar el perfil del DJ:", error)
      }
    }

    fetchDjProfile()
    setIsLoading(false)
  }, [session, router, supabase])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        {/* Sidebar para desktop */}
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <DashboardNav />
        </aside>

        {/* Menú móvil - Solo mostrar una vez */}
        <div className="sticky top-16 z-30 flex items-center justify-between py-4 md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
              <DashboardNav onNavItemClick={() => setIsSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          {djProfile && <p className="text-muted-foreground">Bienvenido, {djProfile.display_name}</p>}
        </div>

        <main className="flex w-full flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
