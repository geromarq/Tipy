"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, MessageSquare, User, DollarSign, QrCode, LogOut } from "lucide-react"
import { useSupabase } from "@/lib/supabase-provider"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/logo"
import { useToast } from "@/hooks/use-toast"

export function DashboardNav() {
  const pathname = usePathname()
  const { supabase } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()

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

  const navItems = [
    {
      title: "Dashboard",
      href: "/dj/dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      title: "Sugerencias",
      href: "/dj/dashboard/suggestions",
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
    },
    {
      title: "Perfil",
      href: "/dj/dashboard/profile",
      icon: <User className="mr-2 h-4 w-4" />,
    },
    {
      title: "Pagos",
      href: "/dj/dashboard/payments",
      icon: <DollarSign className="mr-2 h-4 w-4" />,
    },
    {
      title: "Códigos QR",
      href: "/dj/dashboard/qr",
      icon: <QrCode className="mr-2 h-4 w-4" />,
    },
  ]

  return (
    <div className="flex flex-col h-full space-y-4 py-4">
      <div className="px-3 py-2 flex items-center">
        <Logo size="sm" withText={true} />
      </div>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Panel de DJ</h2>
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname === item.href ? "bg-accent text-accent-foreground" : "transparent",
              )}
            >
              {item.icon}
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-auto px-3 py-2">
        <Button variant="outline" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

