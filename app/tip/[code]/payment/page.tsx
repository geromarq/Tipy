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
import { AlertCircle, ExternalLink, ArrowLeft } from "lucide-react"

export default function PaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [djDetails, setDjDetails] = useState<any>(null)
  const [recommendationDetails, setRecommendationDetails] = useState<any>(null)
  const [tipAmount, setTipAmount] = useState<number | "">("")
  const [appUrl, setAppUrl] = useState("")
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  const recommendationId = searchParams.get("recommendation")
  const MIN_TIP_AMOUNT = 10 // Mínimo de 10 pesos

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
      setError(null)

      // Get recommendation details
      const { data: recommendationData, error: recommendationError } = await supabase
        .from("recommendations")
        .select("*, djs(*), clients(*)")
        .eq("id", recommendationId)
        .single()

      if (recommendationError || !recommendationData) {
        setError("No se pudo cargar la recomendación")
        return
      }

      setRecommendationDetails(recommendationData)
      setDjDetails(recommendationData.djs)

      // Establecer el monto mínimo (el mayor entre 10 pesos y el mínimo del DJ)
      const minAmount = Math.max(MIN_TIP_AMOUNT, recommendationData.djs.min_tip_amount)
      setTipAmount(minAmount)
    } catch (error) {
      console.error("Error fetching details:", error)
      setError("Error al cargar los detalles")
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
    setError(null)
    setDebugInfo(null)
    setPaymentUrl(null)

    // Usar el mayor entre 10 pesos y el mínimo del DJ
    const minAmount = Math.max(MIN_TIP_AMOUNT, djDetails.min_tip_amount)

    if (typeof tipAmount !== "number" || tipAmount < minAmount) {
      toast({
        title: "Error",
        description: `La propina mínima es ${formatCurrency(minAmount)}`,
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

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error creating payment")
      }

      // Guardar información de depuración
      setDebugInfo(JSON.stringify(data, null, 2))

      if (!data.init_point) {
        throw new Error("No se recibió un punto de inicio de pago válido")
      }

      // Guardar la URL de pago para mostrar el botón
      setPaymentUrl(data.init_point)

      // Mostrar mensaje de éxito
      toast({
        title: "Pago creado",
        description: "Haz clic en el botón para continuar con el pago",
      })

      // No redirigir automáticamente, dejar que el usuario haga clic en el botón
    } catch (error: any) {
      console.error("Error processing payment:", error)
      setError(error.message || "No se pudo procesar el pago")
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el pago",
        variant: "destructive",
      })
      setProcessing(false)
    }
  }

  // Función para manejar el clic en el botón de pago
  const handlePaymentClick = () => {
    if (!paymentUrl) return

    // Intentar abrir en una nueva ventana
    const paymentWindow = window.open(paymentUrl, "_blank")

    // Verificar si la ventana se abrió correctamente
    if (!paymentWindow || paymentWindow.closed || typeof paymentWindow.closed === "undefined") {
      // Si la ventana no se abrió, intentar con redirección normal
      toast({
        title: "Información",
        description: "Redirigiendo a Mercado Pago...",
      })

      // Esperar un momento antes de redirigir
      setTimeout(() => {
        window.location.href = paymentUrl
      }, 1000)
    } else {
      // Si la ventana se abrió correctamente, mostrar mensaje
      toast({
        title: "Pago iniciado",
        description: "Se ha abierto una nueva ventana para completar el pago",
      })
    }
  }

  // Función para volver a la página anterior
  const handleGoBack = () => {
    router.push(`/tip/${params.code}`)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Logo size="lg" />
        <p className="mt-4 text-center text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center p-4">
        <Logo size="lg" />
        <div className="w-full max-w-md mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Error</CardTitle>
              </div>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            {debugInfo && (
              <CardContent>
                <div className="bg-muted p-4 rounded-md overflow-auto max-h-60">
                  <pre className="text-xs">{debugInfo}</pre>
                </div>
              </CardContent>
            )}
            <CardFooter>
              <Button className="w-full" onClick={handleGoBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </CardFooter>
          </Card>
        </div>
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
          {!paymentUrl ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tipAmount">Monto de la propina</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                    <Input
                      id="tipAmount"
                      type="number"
                      min={Math.max(MIN_TIP_AMOUNT, djDetails.min_tip_amount)}
                      className="pl-7"
                      value={tipAmount}
                      onChange={handleTipChange}
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Propina mínima: {formatCurrency(Math.max(MIN_TIP_AMOUNT, djDetails.min_tip_amount))}
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

                {debugInfo && (
                  <div className="mt-4 p-4 bg-muted rounded-md overflow-auto max-h-60">
                    <p className="text-xs font-mono mb-2">Debug Info:</p>
                    <pre className="text-xs font-mono">{debugInfo}</pre>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? "Procesando..." : "Continuar con el pago"}
                </Button>
                <Button variant="outline" className="w-full" onClick={handleGoBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
              </CardFooter>
            </form>
          ) : (
            <>
              <CardContent className="space-y-4">
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
                  <div className="flex justify-between font-medium mt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(typeof tipAmount === "number" ? tipAmount : 0)}</span>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    Tu pago ha sido creado. Haz clic en el botón de abajo para continuar con el pago en Mercado Pago.
                  </p>
                </div>

                {debugInfo && (
                  <div className="mt-4 p-4 bg-muted rounded-md overflow-auto max-h-60">
                    <p className="text-xs font-mono mb-2">Debug Info:</p>
                    <pre className="text-xs font-mono">{debugInfo}</pre>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
                  onClick={handlePaymentClick}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Pagar con Mercado Pago
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setPaymentUrl(null)
                    setProcessing(false)
                  }}
                >
                  Cancelar
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

