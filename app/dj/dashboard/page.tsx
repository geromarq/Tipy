"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Music, DollarSign, Clock, QrCode } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [djProfile, setDjProfile] = useState<any>(null)
  const [stats, setStats] = useState({
    suggestionsCount: 0,
    todaySuggestionsCount: 0,
    totalEarnings: 0,
    activeQrCodesCount: 0,
  })

  useEffect(() => {
    if (!session) return

    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        // 1. Intentar obtener el perfil del DJ
        const { data: djData, error: djError } = await supabase
          .from("djs")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle()

        if (djError) {
          console.error("Error al obtener perfil de DJ:", djError)
          toast({
            title: "Error",
            description: "No se pudo cargar tu perfil",
            variant: "destructive",
          })
          return
        }

        // Si no hay perfil, verificamos si ya existe un DJ con el mismo email
        if (!djData) {
          const { data: existingDjWithEmail, error: emailCheckError } = await supabase
            .from("djs")
            .select("*")
            .eq("email", session.user.email)
            .maybeSingle()

          if (emailCheckError) {
            console.error("Error al verificar email existente:", emailCheckError)
          }

          // Si ya existe un DJ con ese email, actualizamos su ID para que coincida con el usuario actual
          if (existingDjWithEmail) {
            const { error: updateError } = await supabase
              .from("djs")
              .update({ id: session.user.id })
              .eq("email", session.user.email)

            if (updateError) {
              console.error("Error al actualizar ID de DJ existente:", updateError)
              toast({
                title: "Error",
                description: "No se pudo vincular tu perfil existente",
                variant: "destructive",
              })
              return
            }

            // Obtenemos el perfil actualizado
            const { data: updatedProfile, error: fetchError } = await supabase
              .from("djs")
              .select("*")
              .eq("id", session.user.id)
              .single()

            if (fetchError) {
              console.error("Error al obtener perfil actualizado:", fetchError)
              return
            }

            setDjProfile(updatedProfile)
          } else {
            // Crear un perfil básico con un nombre de usuario único
            const timestamp = Date.now()
            const uniqueUsername = `user_${timestamp}`

            const { data: newProfile, error: createError } = await supabase
              .from("djs")
              .insert({
                id: session.user.id,
                email: session.user.email || "",
                username: uniqueUsername,
                display_name: session.user.email?.split("@")[0] || "Usuario",
                min_tip_amount: 100,
                password_hash: "auto_generated_" + timestamp,
              })
              .select()
              .single()

            if (createError) {
              console.error("Error al crear perfil de DJ:", createError)
              toast({
                title: "Error",
                description: "No se pudo crear tu perfil",
                variant: "destructive",
              })
              return
            }

            setDjProfile(newProfile)
          }
        } else {
          setDjProfile(djData)
        }

        // 2. Obtener estadísticas básicas
        // Estas consultas son independientes, así que no importa si alguna falla

        // 2.1 Total de sugerencias
        const { count: suggestionsCount } = await supabase
          .from("recommendations")
          .select("*", { count: "exact", head: true })
          .eq("dj_id", session.user.id)

        // 2.2 Sugerencias de hoy
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { count: todaySuggestionsCount } = await supabase
          .from("recommendations")
          .select("*", { count: "exact", head: true })
          .eq("dj_id", session.user.id)
          .gte("created_at", today.toISOString())

        // 2.3 Ganancias totales
        const { data: payments } = await supabase
          .from("payments")
          .select("amount")
          .eq("dj_id", session.user.id)
          .eq("status", "approved")

        const totalEarnings = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0

        // 2.4 QR activos
        const { count: activeQrCodesCount } = await supabase
          .from("qr_codes")
          .select("*", { count: "exact", head: true })
          .eq("dj_id", session.user.id)
          .eq("active", true)

        // 3. Actualizar el estado con todas las estadísticas
        setStats({
          suggestionsCount: suggestionsCount || 0,
          todaySuggestionsCount: todaySuggestionsCount || 0,
          totalEarnings,
          activeQrCodesCount: activeQrCodesCount || 0,
        })
      } catch (err) {
        console.error("Error al cargar los datos del dashboard:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [session, supabase, toast])

  if (loading) {
    return (
      <div className="flex-1 p-8 pt-6 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando datos del dashboard...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        {djProfile && <p className="text-muted-foreground">Bienvenido, {djProfile.display_name}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de sugerencias</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suggestionsCount}</div>
            <p className="text-xs text-muted-foreground">{stats.todaySuggestionsCount} hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancias totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">Después de comisiones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR activos</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeQrCodesCount}</div>
            <p className="text-xs text-muted-foreground">Códigos disponibles para el público</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propina mínima</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {djProfile ? formatCurrency(djProfile.min_tip_amount) : formatCurrency(100)}
            </div>
            <p className="text-xs text-muted-foreground">Configurable en tu perfil</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No hay actividad reciente para mostrar.</p>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Sugerencias populares</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No hay sugerencias populares para mostrar.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

