"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { ArrowLeft, CheckCircle } from "lucide-react"

export default function WithdrawPage() {
  const router = useRouter()
  const { supabase, session } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pendingWithdrawal: 0,
  })
  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
  })

  const MIN_WITHDRAWAL_AMOUNT = 1000 // Monto mínimo para retirar: $1000

  useEffect(() => {
    if (!session) {
      router.push("/dj/login")
      return
    }

    fetchStats()
  }, [session, router])

  // Modificar la función fetchStats para obtener el balance del DJ
  const fetchStats = async () => {
    try {
      setLoading(true)

      // Get DJ profile to get balance
      const { data: djProfile, error: djError } = await supabase
        .from("djs")
        .select("balance")
        .eq("id", session.user.id)
        .single()

      if (djError) {
        console.error("Error al obtener perfil de DJ:", djError)
        throw new Error("No se pudo obtener el balance")
      }

      // Get pending withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("dj_id", session.user.id)
        .eq("status", "pending")

      if (withdrawalsError) throw withdrawalsError

      const pendingWithdrawal = withdrawalsData?.reduce((sum, withdrawal) => sum + withdrawal.amount, 0) || 0

      setStats({
        total: djProfile?.balance || 0,
        pendingWithdrawal,
      })
    } catch (err: any) {
      console.error("Error al cargar los datos:", err)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos financieros",
        variant: "destructive",
      })
      router.push("/dj/dashboard/payments")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBankChange = (value: string) => {
    setFormData((prev) => ({ ...prev, bankName: value }))
  }

  // Modificar la función handleSubmit para verificar el balance antes de procesar el retiro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!session) {
        throw new Error("No hay sesión activa")
      }

      // Validar datos
      if (!formData.bankName.trim()) {
        throw new Error("Debes seleccionar un banco")
      }

      if (!formData.accountNumber.trim()) {
        throw new Error("Debes ingresar un número de cuenta")
      }

      // Check if there's enough balance
      const availableBalance = stats.total - stats.pendingWithdrawal

      if (availableBalance < MIN_WITHDRAWAL_AMOUNT) {
        throw new Error(`El monto mínimo para retirar es de ${formatCurrency(MIN_WITHDRAWAL_AMOUNT)}`)
      }

      // Verificar nuevamente el balance actual
      const { data: djProfile, error: djError } = await supabase
        .from("djs")
        .select("balance")
        .eq("id", session.user.id)
        .single()

      if (djError) {
        throw new Error("No se pudo verificar el balance actual")
      }

      if (djProfile.balance < MIN_WITHDRAWAL_AMOUNT) {
        throw new Error(
          `No tienes suficiente balance para retirar. Balance actual: ${formatCurrency(djProfile.balance)}`,
        )
      }

      // Calculate amount after fee (30%)
      const fee = availableBalance * 0.3
      const withdrawalAmount = availableBalance - fee

      // Create withdrawal request
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from("withdrawals")
        .insert({
          dj_id: session.user.id,
          amount: withdrawalAmount,
          status: "pending",
        })
        .select()
        .single()

      if (withdrawalError) throw withdrawalError

      // Save bank details
      const { error: bankDetailsError } = await supabase.from("bank_details").insert({
        withdrawal_id: withdrawal.id,
        dj_id: session.user.id,
        bank_name: formData.bankName,
        account_number: formData.accountNumber,
        created_at: new Date().toISOString(),
      })

      if (bankDetailsError) throw bankDetailsError

      // Update DJ balance
      const { error: updateBalanceError } = await supabase
        .from("djs")
        .update({
          balance: djProfile.balance - withdrawalAmount,
        })
        .eq("id", session.user.id)

      if (updateBalanceError) {
        console.error("Error al actualizar el balance:", updateBalanceError)
        // No lanzar error aquí para no interrumpir el flujo, pero registrar el problema
      }

      setSuccess(true)
      toast({
        title: "Solicitud enviada",
        description: `Tu solicitud de retiro por ${formatCurrency(withdrawalAmount)} ha sido enviada`,
      })
    } catch (err: any) {
      console.error("Error al crear la solicitud de retiro:", err)
      toast({
        title: "Error",
        description: err.message || "No se pudo crear la solicitud de retiro",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-8 pt-6 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando datos financieros...</p>
      </div>
    )
  }

  const availableBalance = stats.total - stats.pendingWithdrawal
  const canWithdraw = availableBalance >= MIN_WITHDRAWAL_AMOUNT

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Solicitar retiro</h2>
      </div>

      {success ? (
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">Solicitud enviada</CardTitle>
            <CardDescription className="text-center">
              Tu solicitud de retiro ha sido enviada correctamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-accent p-4">
              <h3 className="font-medium mb-2">Resumen</h3>
              <div className="flex justify-between text-sm">
                <span>Monto disponible:</span>
                <span>{formatCurrency(availableBalance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Comisión (30%):</span>
                <span>{formatCurrency(availableBalance * 0.3)}</span>
              </div>
              <div className="flex justify-between font-medium mt-2">
                <span>Total a recibir:</span>
                <span>{formatCurrency(availableBalance * 0.7)}</span>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Procesaremos tu solicitud en los próximos 21 días debido a restricciones de MercadoPago. Te notificaremos
              cuando la transferencia haya sido realizada.
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push("/dj/dashboard/payments")}>
              Volver a Pagos
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Datos bancarios</CardTitle>
              <CardDescription>Ingresa los datos de tu cuenta bancaria para recibir el dinero</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-accent p-4">
                <h3 className="font-medium mb-2">Resumen</h3>
                <div className="flex justify-between text-sm">
                  <span>Monto disponible:</span>
                  <span>{formatCurrency(availableBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Comisión (30%):</span>
                  <span>{formatCurrency(availableBalance * 0.3)}</span>
                </div>
                <div className="flex justify-between font-medium mt-2">
                  <span>Total a recibir:</span>
                  <span>{formatCurrency(availableBalance * 0.7)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Banco</Label>
                <Select value={formData.bankName} onValueChange={handleBankChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BROU">BROU</SelectItem>
                    <SelectItem value="Santander">Santander</SelectItem>
                    <SelectItem value="Itaú">Itaú</SelectItem>
                    <SelectItem value="BBVA">BBVA</SelectItem>
                    <SelectItem value="Scotiabank">Scotiabank</SelectItem>
                    <SelectItem value="HSBC">HSBC</SelectItem>
                    <SelectItem value="Prex">Prex</SelectItem>
                    <SelectItem value="MiDinero">MiDinero</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Número de cuenta</Label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  placeholder="Ingresa el número de cuenta"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa el número de cuenta completo, incluyendo sucursal si corresponde
                </p>
              </div>

              {!canWithdraw && (
                <div className="rounded-md bg-destructive/10 p-4 text-destructive">
                  <p className="text-sm">
                    El monto mínimo para retirar es de {formatCurrency(MIN_WITHDRAWAL_AMOUNT)}. Actualmente tienes{" "}
                    {formatCurrency(availableBalance)} disponible.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={submitting || !canWithdraw}>
                {submitting ? "Procesando..." : "Confirmar solicitud"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.back()}>
                Cancelar
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}
