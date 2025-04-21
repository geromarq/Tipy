"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { XCircle } from "lucide-react"

export default function FailurePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

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
      await supabase.from("payments").update({ status: "rejected" }).eq("mercadopago_id", reference)
    } catch (error) {
      console.error("Error updating payment status:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Logo size="lg" />
        <p className="mt-4 text-center text-muted-foreground">Procesando...</p>
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
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-center">Pago fallido</CardTitle>
            <CardDescription className="text-center">Tu pago no pudo ser procesado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Hubo un problema al procesar tu pago. Tu recomendación ha sido enviada al DJ, pero no se ha registrado
              ninguna propina.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => router.back()}>
              Intentar nuevamente
            </Button>
            <Button variant="outline" className="w-full" onClick={() => window.close()}>
              Cerrar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
