"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { CheckCircle } from "lucide-react"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)

  const reference = searchParams.get("reference")

  useEffect(() => {
    if (!reference) {
      router.push("/")
      return
    }

    updatePaymentStatus()
  }, [reference])

  const updatePaymentStatus = async () => {
    try {
      setLoading(true)

      // Update payment status
      const { data, error } = await supabase
        .from("payments")
        .update({ status: "approved" })
        .eq("mercadopago_id", reference)
        .select("*, recommendations(*, djs(*))")
        .single()

      if (error) {
        throw error
      }

      setPaymentDetails(data)
    } catch (error) {
      console.error("Error updating payment status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del pago",
        variant: "destructive",
      })
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Logo size="lg" />
        <p className="mt-4 text-center text-muted-foreground">Procesando pago...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-4">
      <Logo size="lg" />
      <div className="w-full max-w-md mt-8">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">¡Pago exitoso!</CardTitle>
            <CardDescription className="text-center">Tu pago ha sido procesado correctamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-accent p-4">
              <h3 className="font-medium mb-2">Resumen</h3>
              <div className="flex justify-between text-sm">
                <span>DJ:</span>
                <span>{paymentDetails.recommendations?.djs?.display_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Fecha:</span>
                <span>{new Date(paymentDetails.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium mt-2">
                <span>Total:</span>
                <span>{formatCurrency(paymentDetails.amount)}</span>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Tu recomendación ha sido enviada al DJ. ¡Gracias por tu propina!
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => window.close()}>
              Cerrar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

