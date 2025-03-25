"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

export default function PaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [djDetails, setDjDetails] = useState<any>(null)
  const [recommendationDetails, setRecommendationDetails] = useState<any>(null)
  const [tipAmount, setTipAmount] = useState<number | "">("")
  const [appUrl, setAppUrl] = useState("")

  const recommendationId = searchParams.get("recommendation")

  useEffect(() => {
    // Usar la variable de entorno NEXT_PUBLIC_APP_URL o calcular la URL base
    const url =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : "https://v0-tipy-six.vercel.app")
    setAppUrl(url)

    if (!recommendationId) {
      router.push(`/tip/${params.code}`)
      return
    }

    fetchDetails()
  }, [recommendationId])

  const fetchDetails = async () => {
    try {
      setLoading(true)

      // Get recommendation details
      const { data: recommendationData, error: recommendationError } = await supabase
        .from("recommendations")
        .select("*, djs(*), clients(*)")
        .eq("id", recommendationId)
        .single()

      if (recommendationError || !recommendationData) {
        router.push(`/tip/${params.code}`)
        return
      }

      setRecommendationDetails(recommendationData)
      setDjDetails(recommendationData.djs)
      setTipAmount(recommendationData.djs.min_tip_amount)
    } catch (error) {
      console.error("Error fetching details:", error)
      router.push(`/tip/${params.code}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === "") {
      setTipAmount("")
      return
    }

    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue)) {
      setTipAmount(numValue)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (typeof tipAmount !== "number" || tipAmount < djDetails.min_tip_amount) {
      toast({
        title: "Error",
        description: `La propina mínima es ${formatCurrency(djDetails.min_tip_amount)}`,
        variant: "destructive",
      })
      return
    }

    setProcessing(true)

    try {
      // Create a payment preference in MercadoPago
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: tipAmount,
          djId: djDetails.id,
          recommendationId,
          clientName: recommendationDetails.clients.name,
        }),
      })

      if (!response.ok) {
        throw new Error("Error creating payment")
      }

      const data = await response.json()

      // Redirect to MercadoPago checkout
      window.location.href = data.init_point
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Error",
        description: "No se pudo procesar el pago",
        variant: "destructive",
      })
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Logo size="lg" />
        <p className="mt-4 text-center text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-4">
      <Logo size="lg" />
      <div className="w-full max-w-md mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Agregar propina</CardTitle>
            <CardDescription>Agrega una propina para {djDetails.display_name}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipAmount">Monto de la propina</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                  <Input
                    id="tipAmount"
                    type="number"
                    min={djDetails.min_tip_amount}
                    step="50"
                    className="pl-7"
                    value={tipAmount}
                    onChange={handleTipChange}
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Propina mínima: {formatCurrency(djDetails.min_tip_amount)}
                </p>
              </div>

              <div className="rounded-md bg-accent p-4">
                <h3 className="font-medium mb-2">Resumen</h3>
                <div className="flex justify-between text-sm">
                  <span>DJ:</span>
                  <span>{djDetails.display_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tipo:</span>
                  <span>
                    {recommendationDetails.is_priority
                      ? "Mensaje prioritario"
                      : recommendationDetails.spotify_link
                        ? "Link de Spotify"
                        : "Mensaje normal"}
                  </span>
                </div>
                {typeof tipAmount === "number" && (
                  <div className="flex justify-between font-medium mt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(tipAmount)}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? "Procesando..." : "Pagar con Mercado Pago"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

