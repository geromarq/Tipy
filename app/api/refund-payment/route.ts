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
    let realPaymentId = null

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

      // Verificar si ya tenemos el ID real de Mercado Pago almacenado
      if (paymentData.mercadopago_payment_id) {
        mpPaymentId = paymentData.mercadopago_payment_id
        realPaymentId = mpPaymentId
      } else {
        // Si no tenemos el ID real, necesitamos buscarlo en Mercado Pago
        try {
          // Primero, intentamos obtener el ID de pago desde nuestra API de webhook
          const { data: webhookData, error: webhookError } = await supabase
            .from("mercadopago_webhooks")
            .select("payment_id")
            .eq("external_reference", mercadopagoId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          if (!webhookError && webhookData && webhookData.payment_id) {
            mpPaymentId = webhookData.payment_id
            realPaymentId = mpPaymentId
          } else {
            // Si no encontramos el ID en nuestra base de datos, hacemos una consulta directa a Mercado Pago
            // Esto requiere que tengamos acceso a la API de búsqueda de pagos
            const searchResponse = await fetch(
              `https://api.mercadopago.com/v1/payments/search?external_reference=${mercadopagoId}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
                  "Content-Type": "application/json",
                },
              },
            )

            if (searchResponse.ok) {
              const searchData = await searchResponse.json()
              if (searchData.results && searchData.results.length > 0) {
                mpPaymentId = searchData.results[0].id
                realPaymentId = mpPaymentId

                // Guardar el ID real para futuras referencias
                await supabase
                  .from("payments")
                  .update({ mercadopago_payment_id: mpPaymentId })
                  .eq("mercadopago_id", mercadopagoId)
              } else {
                throw new Error("No se encontraron pagos con esta referencia externa")
              }
            } else {
              const errorText = await searchResponse.text()
              throw new Error(`Error al buscar el pago: ${errorText}`)
            }
          }
        } catch (error) {
          console.error("Error al obtener el ID de pago real:", error)
          return NextResponse.json({ error: "No se pudo obtener el ID de pago real de Mercado Pago" }, { status: 500 })
        }
      }
    }

    if (!mpPaymentId) {
      return NextResponse.json({ error: "No se pudo determinar el ID de pago" }, { status: 400 })
    }

    console.log(`Procesando reembolso para pago con ID: ${mpPaymentId}`)

    // Procesar el reembolso
    try {
      const refundResult = await refundPayment(mpPaymentId)

      // Actualizar el estado del pago en la base de datos
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          status: "refunded",
          mercadopago_payment_id: realPaymentId || mpPaymentId, // Guardar el ID real si lo obtuvimos
        })
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
