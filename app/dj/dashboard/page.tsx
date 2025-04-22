"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Music, DollarSign, Clock, QrCode } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"

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
  const [qrEarnings, setQrEarnings] = useState<any[]>([])
  const [activityData, setActivityData] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState<"12h" | "24h">("12h")

  useEffect(() => {
    if (!session) return

    fetchDashboardData()
  }, [session, supabase, toast])

  useEffect(() => {
    if (!session) return

    fetchActivityData()
  }, [session, timeRange])

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

      // 2.1 Total de sugerencias pagadas
      const { count: suggestionsCount } = await supabase
        .from("recommendations")
        .select("*, payments!inner(*)", { count: "exact", head: true })
        .eq("dj_id", session.user.id)
        .eq("payments.status", "approved")

      // 2.2 Sugerencias pagadas de hoy
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count: todaySuggestionsCount } = await supabase
        .from("recommendations")
        .select("*, payments!inner(*)", { count: "exact", head: true })
        .eq("dj_id", session.user.id)
        .eq("payments.status", "approved")
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

      // 2.5 Ganancias por QR activo en la última semana
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      // Obtener todos los QR activos
      const { data: activeQrCodes } = await supabase
        .from("qr_codes")
        .select("id, code")
        .eq("dj_id", session.user.id)
        .eq("active", true)

      if (activeQrCodes && activeQrCodes.length > 0) {
        // Para cada QR activo, obtener las recomendaciones y pagos asociados
        const qrEarningsPromises = activeQrCodes.map(async (qr) => {
          // Obtener recomendaciones que vinieron de este QR
          const { data: recommendations } = await supabase
            .from("recommendations")
            .select("id, created_at")
            .eq("dj_id", session.user.id)
            .gte("created_at", oneWeekAgo.toISOString())
            .ilike("metadata->qr_code", qr.code)

          let totalAmount = 0
          let count = 0

          if (recommendations && recommendations.length > 0) {
            // Obtener los IDs de las recomendaciones
            const recommendationIds = recommendations.map((rec) => rec.id)

            // Obtener los pagos asociados a estas recomendaciones
            const { data: paymentsData } = await supabase
              .from("payments")
              .select("amount")
              .eq("status", "approved")
              .in("recommendation_id", recommendationIds)

            if (paymentsData && paymentsData.length > 0) {
              totalAmount = paymentsData.reduce((sum, payment) => sum + payment.amount, 0)
              count = paymentsData.length
            }
          }

          return {
            code: qr.code,
            earnings: totalAmount,
            count: count,
          }
        })

        const qrEarningsResults = await Promise.all(qrEarningsPromises)
        setQrEarnings(qrEarningsResults.filter((qr) => qr.count > 0))
      }

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

  const fetchActivityData = async () => {
    try {
      if (!session) return

      // Determinar el rango de tiempo
      const endDate = new Date()
      const startDate = new Date(endDate)

      if (timeRange === "12h") {
        startDate.setHours(endDate.getHours() - 12)
      } else {
        startDate.setHours(endDate.getHours() - 24)
      }

      // Obtener todas las sugerencias en el rango de tiempo
      const { data: suggestions, error } = await supabase
        .from("recommendations")
        .select("created_at")
        .eq("dj_id", session.user.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error al obtener datos de actividad:", error)
        return
      }

      // Agrupar por hora para crear los datos del gráfico
      const hourlyData: Record<string, number> = {}

      // Inicializar todas las horas con 0
      const hourCount = timeRange === "12h" ? 12 : 24
      for (let i = 0; i < hourCount; i++) {
        const hourDate = new Date(endDate)
        hourDate.setHours(endDate.getHours() - (hourCount - 1) + i)
        const hourKey = hourDate.toISOString().substring(0, 13) // YYYY-MM-DDTHH
        hourlyData[hourKey] = 0
      }

      // Contar sugerencias por hora
      suggestions?.forEach((suggestion) => {
        const date = new Date(suggestion.created_at)
        const hourKey = date.toISOString().substring(0, 13) // YYYY-MM-DDTHH

        if (hourlyData[hourKey] !== undefined) {
          hourlyData[hourKey]++
        }
      })

      // Convertir a formato para el gráfico
      const chartData = Object.entries(hourlyData)
        .map(([hour, count]) => {
          const date = new Date(hour + ":00:00Z")
          return {
            hour: date.getHours() + ":00",
            count,
            date, // Para ordenar
          }
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      setActivityData(chartData)
    } catch (err) {
      console.error("Error al cargar datos de actividad:", err)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de actividad",
        variant: "destructive",
      })
    }
  }

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
        <h2 className="text-3xl font-bold tracking-tight">Bienvenido, {djProfile?.display_name}</h2>
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Actividad reciente</CardTitle>
            <Tabs defaultValue="12h" value={timeRange} onValueChange={(value) => setTimeRange(value as "12h" | "24h")}>
              <TabsList className="grid w-[180px] grid-cols-2">
                <TabsTrigger value="12h">12 horas</TabsTrigger>
                <TabsTrigger value="24h">24 horas</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`${value} sugerencias`, "Cantidad"]}
                      labelFormatter={(label) => `Hora: ${label}`}
                    />
                    <Line type="monotone" dataKey="count" stroke="#7A2D80" activeDot={{ r: 8 }} name="Sugerencias" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">
                No hay datos de actividad para mostrar en este período.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Ganancias por QR (última semana)</CardTitle>
          </CardHeader>
          <CardContent>
            {qrEarnings.length > 0 ? (
              <div className="space-y-4">
                {qrEarnings.map((qr) => (
                  <div key={qr.code} className="flex flex-col space-y-2 p-3 border rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-primary" />
                        <span className="font-medium">{qr.code}</span>
                        <Badge variant="outline" className="ml-2">
                          {qr.count} {qr.count === 1 ? "propina" : "propinas"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ganancias:</span>
                      <span className="font-bold">{formatCurrency(qr.earnings)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Después de comisión (30%):</span>
                      <span className="font-semibold">{formatCurrency(qr.earnings * 0.7)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">
                No hay ganancias por QR para mostrar en la última semana.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
