import { NextResponse } from "next/server"
import { refundPayment } from "@/lib/mercadopago"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    // Extraer datos de la solicitud
    const { paymentId, mercadopagoId, recommendationId } = await request.json()

    if (!paymentId && !mercadopagoId) {
      return NextResponse.json({ error: "Se requiere paymentId o mercadopagoId" }, { status: 400 })
    }

    // Obtener cliente de Supabase
    const supabase = createServerSupabaseClient()

    // Si tenemos mercadopagoId, necesitamos obtener el ID de pago real de Mercado Pago
    let mpPaymentId = paymentId

    if (!mpPaymentId && mercadopagoId) {
      // Buscar el pago por mercadopago_id
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .eq("mercadopago_id", mercadopagoId)
        .single()

      if (paymentError || !paymentData) {
        console.error("Error al buscar el pago:", paymentError)
        return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
      }

      // Obtener el estado del pago desde Mercado Pago para obtener el ID real
      try {
        const paymentDetails = await fetch(`/api/get-payment-status?reference=${mercadopagoId}`).then((res) =>
          res.json(),
        )
        if (paymentDetails && paymentDetails.id) {
          mpPaymentId = paymentDetails.id
        } else {
          throw new Error("No se pudo obtener el ID de pago de Mercado Pago")
        }
      } catch (error) {
        console.error("Error al obtener detalles del pago:", error)
        return NextResponse.json({ error: "No se pudo obtener el ID de pago de Mercado Pago" }, { status: 500 })
      }
    }

    // Procesar el reembolso
    try {
      const refundResult = await refundPayment(mpPaymentId)

      // Actualizar el estado del pago en la base de datos
      const { error: updateError } = await supabase
        .from("payments")
        .update({ status: "refunded" })
        .eq("mercadopago_id", mercadopagoId || refundResult.payment_id)

      if (updateError) {
        console.error("Error al actualizar el estado del pago:", updateError)
      }

      // Si se proporcionó un ID de recomendación, eliminar la recomendación
      if (recommendationId) {
        const { error: deleteError } = await supabase.from("recommendations").delete().eq("id", recommendationId)

        if (deleteError) {
          console.error("Error al eliminar la recomendación:", deleteError)
        }
      }

      return NextResponse.json({
        success: true,
        message: "Reembolso procesado correctamente",
        data: refundResult,
      })
    } catch (refundError: any) {
      console.error("Error al procesar el reembolso:", refundError)
      return NextResponse.json(
        {
          error: refundError.message || "Error al procesar el reembolso",
          details: refundError,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Error en la API de reembolso:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
