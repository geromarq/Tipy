import { NextResponse } from "next/server"
import { getPaymentStatus } from "@/lib/mercadopago"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get("reference")
    const paymentId = searchParams.get("paymentId")

    if (!reference && !paymentId) {
      return NextResponse.json({ error: "Se requiere reference o paymentId" }, { status: 400 })
    }

    // Si tenemos reference pero no paymentId, necesitamos buscar el paymentId en la base de datos
    if (reference && !paymentId) {
      const supabase = createServerSupabaseClient()

      // Buscar el pago en la base de datos
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .eq("mercadopago_id", reference)
        .single()

      if (paymentError || !paymentData) {
        return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
      }

      // Si el pago tiene un ID de Mercado Pago, usarlo
      if (paymentData.mercadopago_payment_id) {
        const paymentDetails = await getPaymentStatus(paymentData.mercadopago_payment_id)
        return NextResponse.json(paymentDetails)
      }

      // Si no tiene ID de Mercado Pago, devolver los datos de la base de datos
      return NextResponse.json(paymentData)
    }

    // Si tenemos paymentId, obtener el estado directamente de Mercado Pago
    if (paymentId) {
      const paymentDetails = await getPaymentStatus(paymentId)
      return NextResponse.json(paymentDetails)
    }

    return NextResponse.json({ error: "No se pudo obtener el estado del pago" }, { status: 500 })
  } catch (error: any) {
    console.error("Error al obtener el estado del pago:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
