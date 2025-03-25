"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, ArrowDown, ArrowUp, Calendar, AlertCircle } from "lucide-react"

export default function PaymentsPage() {
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisWeek: 0,
    pendingWithdrawal: 0,
  })
  const [withdrawing, setWithdrawing] = useState(false)

  useEffect(() => {
    if (!session) return

    fetchPayments()
  }, [session])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!session) {
        throw new Error("No hay sesión activa")
      }

      // Get all approved payments
      const { data, error: paymentsError } = await supabase
        .from("payments")
        .select("*, recommendations(*, clients(*))")
        .eq("dj_id", session.user.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })

      if (paymentsError) throw paymentsError

      setPayments(data || [])

      // Calculate stats
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const thisWeek = new Date(now)
      thisWeek.setDate(now.getDate() - now.getDay())

      const total = data?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      const thisMonthPayments = data?.filter(
        (payment) => new Date(payment.created_at) >= thisMonth && new Date(payment.created_at) < nextMonth,
      )
      const lastMonthPayments = data?.filter(
        (payment) => new Date(payment.created_at) >= lastMonth && new Date(payment.created_at) < thisMonth,
      )
      const thisWeekPayments = data?.filter((payment) => new Date(payment.created_at) >= thisWeek)

      const thisMonthTotal = thisMonthPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      const lastMonthTotal = lastMonthPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      const thisWeekTotal = thisWeekPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0

      // Get pending withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("dj_id", session.user.id)
        .eq("status", "pending")

      if (withdrawalsError) throw withdrawalsError

      const pendingWithdrawal = withdrawalsData?.reduce((sum, withdrawal) => sum + withdrawal.amount, 0) || 0

      setStats({
        total,
        thisMonth: thisMonthTotal,
        lastMonth: lastMonthTotal,
        thisWeek: thisWeekTotal,
        pendingWithdrawal,
      })
    } catch (err: any) {
      console.error("Error al cargar los pagos:", err)
      setError(err.message || "No se pudieron cargar los pagos")
      toast({
        title: "Error",
        description: err.message || "No se pudieron cargar los pagos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    try {
      if (!session) {
        throw new Error("No hay sesión activa")
      }

      setWithdrawing(true)

      // Check if there's enough balance
      const availableBalance = stats.total - stats.pendingWithdrawal

      if (availableBalance < 1500) {
        throw new Error("El monto mínimo para retirar es de $1,500")
      }

      // Calculate amount after fee (25%)
      const fee = availableBalance * 0.25
      const withdrawalAmount = availableBalance - fee

      // Create withdrawal request
      const { error } = await supabase.from("withdrawals").insert({
        dj_id: session.user.id,
        amount: withdrawalAmount,
        status: "pending",
      })

      if (error) throw error

      toast({
        title: "Solicitud enviada",
        description: `Tu solicitud de retiro por ${formatCurrency(withdrawalAmount)} ha sido enviada`,
      })

      fetchPayments()
    } catch (err: any) {
      console.error("Error al crear la solicitud de retiro:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo crear la solicitud de retiro",
        variant: "destructive",
      })
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-8 pt-6 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando pagos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-8 pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error al cargar los pagos
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => fetchPayments()}>Intentar nuevamente</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Pagos</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancias totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total)}</div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este mes vs. anterior</CardTitle>
            {stats.thisMonth > stats.lastMonth ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.thisMonth > stats.lastMonth
                ? `+${formatCurrency(stats.thisMonth - stats.lastMonth)}`
                : `-${formatCurrency(stats.lastMonth - stats.thisMonth)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta semana</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisWeek)}</div>
            <p className="text-xs text-muted-foreground">Últimos 7 días</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponible para retirar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total - stats.pendingWithdrawal)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingWithdrawal > 0 && `${formatCurrency(stats.pendingWithdrawal)} en proceso`}
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              disabled={withdrawing || stats.total - stats.pendingWithdrawal < 1500}
              onClick={handleWithdraw}
            >
              {withdrawing ? "Procesando..." : "Solicitar retiro"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de pagos</CardTitle>
          <CardDescription>Todos los pagos recibidos</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No hay pagos para mostrar</p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{payment.recommendations?.clients?.name || "Cliente"}</p>
                    <p className="text-sm text-muted-foreground">{new Date(payment.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <Badge variant="outline">Aprobado</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

